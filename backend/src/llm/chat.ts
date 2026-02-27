import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { llmConfigs } from '../db/schema.js';
import { tools } from './tools.js';
import { dispatchTool } from './dispatch.js';
import { listMemories } from '../functions/memory.js';

interface ActiveLLMConfig {
  provider: string;
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
}

async function getActiveLLMConfig(): Promise<ActiveLLMConfig> {
  const [active] = await db.select().from(llmConfigs).where(eq(llmConfigs.isActive, true)).limit(1);
  if (active) {
    return { provider: active.provider, apiKey: active.apiKey, model: active.model, baseUrl: active.baseUrl };
  }
  // Fall back to env vars for backwards compatibility.
  return {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY ?? null,
    model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
    baseUrl: null,
  };
}

// ---------------------------------------------------------------------------
// In-memory conversation stores, one per provider format.
// The system message is always rebuilt fresh each turn (memories may change),
// so only user/assistant/tool messages are persisted.
// ---------------------------------------------------------------------------
const MAX_HISTORY = 40;

const anthropicStore = new Map<string, Anthropic.MessageParam[]>();
const openaiStore    = new Map<string, OpenAI.Chat.ChatCompletionMessageParam[]>();

function getAnthropicHistory(id: string): Anthropic.MessageParam[] {
  return anthropicStore.get(id) ?? [];
}

function saveAnthropicHistory(id: string, messages: Anthropic.MessageParam[]): void {
  anthropicStore.set(id, messages.slice(-MAX_HISTORY));
}

function getOpenAIHistory(id: string): OpenAI.Chat.ChatCompletionMessageParam[] {
  return openaiStore.get(id) ?? [];
}

function saveOpenAIHistory(id: string, messages: OpenAI.Chat.ChatCompletionMessageParam[]): void {
  // messages[0] is always the system prompt — skip it when saving
  const history = messages[0]?.role === 'system' ? messages.slice(1) : messages;
  openaiStore.set(id, history.slice(-MAX_HISTORY));
}

export function clearHistory(id: string): void {
  anthropicStore.delete(id);
  openaiStore.delete(id);
}

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'done'; toolsUsed: string[] }
  | { type: 'error'; message: string };

const BASE_SYSTEM_PROMPT = `You are a personal finance assistant for a Firefly III budgeting system.

You have access to a fixed set of financial reporting tools that query the user's local database.
When answering financial questions, use these tools to fetch data — never invent figures or make assumptions about amounts not already known.
Exception: if the user's message already contains the financial data you need (e.g. a pre-built report), analyze it directly without calling any tools.

If a question cannot be answered with the available tools or provided data, say so clearly and list what you can help with instead.

Keep responses concise, friendly, and actionable. When presenting numbers, format them as currency where appropriate.

When the user shares a preference or fact about how they manage their finances, call remember_fact to store it so you can apply it in future conversations.`;

const MAX_TOOL_ROUNDS = 5;

export interface ChatResult {
  answer: string;
  toolsUsed: string[];
}

async function buildSystemPrompt(): Promise<string> {
  const stored = await listMemories();
  if (stored.length === 0) return BASE_SYSTEM_PROMPT;
  const memoryBlock = stored.map(m => `- ${m}`).join('\n');
  return `${BASE_SYSTEM_PROMPT}\n\n## What you know about this user\n${memoryBlock}`;
}

// ---------------------------------------------------------------------------
// Convert Anthropic tool definitions → OpenAI function-calling format
// ---------------------------------------------------------------------------
function toOpenAITools(anthropicTools: Anthropic.Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return anthropicTools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

// ---------------------------------------------------------------------------
// Anthropic path
// ---------------------------------------------------------------------------
export async function chat(question: string): Promise<ChatResult> {
  const config = await getActiveLLMConfig();

  // For OpenAI-compatible providers, collect the streaming response into a result.
  if (config.provider === 'openai_compatible') {
    const result: ChatResult = { answer: '', toolsUsed: [] };
    await chatStreamOpenAI(null, question, (event) => {
      if (event.type === 'text') result.answer += event.text;
      if (event.type === 'done') result.toolsUsed = event.toolsUsed;
    }, undefined, config);
    return result;
  }

  const client = new Anthropic({ apiKey: config.apiKey ?? undefined });
  const model = config.model;
  const [systemPrompt, messages] = await Promise.all([
    buildSystemPrompt(),
    Promise.resolve<Anthropic.MessageParam[]>([{ role: 'user', content: question }]),
  ]);

  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({ model, max_tokens: 2048, system: systemPrompt, tools, messages });
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('\n').trim();
      return { answer: text, toolsUsed };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        toolsUsed.push(block.name);
        try {
          const result = await dispatchTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${message}`, is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  return { answer: 'Sorry, I was unable to answer that question.', toolsUsed };
}

// ---------------------------------------------------------------------------
// Anthropic streaming path (with conversation history)
// ---------------------------------------------------------------------------
async function chatStreamAnthropic(
  conversationId: string | null,
  question: string,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal | undefined,
  config: ActiveLLMConfig,
): Promise<void> {
  const client = new Anthropic({ apiKey: config.apiKey ?? undefined });
  const systemPrompt = await buildSystemPrompt();

  const messages: Anthropic.MessageParam[] = [
    ...(conversationId ? getAnthropicHistory(conversationId) : []),
    { role: 'user', content: question },
  ];
  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = client.messages.stream(
      { model: config.model, max_tokens: 2048, system: systemPrompt, tools, messages },
      { signal },
    );

    stream.on('text', (text) => onEvent({ type: 'text', text }));
    const response = await stream.finalMessage();
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      if (conversationId) saveAnthropicHistory(conversationId, messages);
      onEvent({ type: 'done', toolsUsed });
      return;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        toolsUsed.push(block.name);
        onEvent({ type: 'tool', name: block.name });
        try {
          const result = await dispatchTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${msg}`, is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  if (conversationId) saveAnthropicHistory(conversationId, messages);
  onEvent({ type: 'done', toolsUsed });
}

// ---------------------------------------------------------------------------
// OpenAI-compatible streaming path (Ollama, OpenRouter, etc.)
// ---------------------------------------------------------------------------
async function chatStreamOpenAI(
  conversationId: string | null,
  question: string,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal | undefined,
  config: ActiveLLMConfig,
): Promise<void> {
  const baseURL = config.baseUrl ? `${config.baseUrl.replace(/\/$/, '')}/v1` : undefined;
  const client = new OpenAI({
    apiKey: config.apiKey ?? 'ollama', // Ollama ignores the key but the SDK requires a non-empty value
    baseURL,
  });

  const systemPrompt = await buildSystemPrompt();
  const openAITools = toOpenAITools(tools);
  const toolsUsed: string[] = [];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(conversationId ? getOpenAIHistory(conversationId) : []),
    { role: 'user', content: question },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Collect the full streamed response.
    const stream = await client.chat.completions.create(
      { model: config.model, messages, tools: openAITools, stream: true },
      { signal },
    );

    let textContent = '';
    // Accumulate streamed tool call deltas — indexed by tool_calls[].index.
    const tcAccum: Record<number, { id: string; name: string; args: string }> = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        textContent += delta.content;
        onEvent({ type: 'text', text: delta.content });
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!tcAccum[idx]) tcAccum[idx] = { id: '', name: '', args: '' };
          if (tc.id) tcAccum[idx].id = tc.id;
          if (tc.function?.name) tcAccum[idx].name = tc.function.name;
          if (tc.function?.arguments) tcAccum[idx].args += tc.function.arguments;
        }
      }
    }

    const toolCalls = Object.values(tcAccum).filter(tc => tc.name);

    if (toolCalls.length === 0) {
      // Model finished without requesting any tools.
      if (conversationId) saveOpenAIHistory(conversationId, messages);
      onEvent({ type: 'done', toolsUsed });
      return;
    }

    // Append assistant message with tool_calls.
    messages.push({
      role: 'assistant',
      content: textContent || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args },
      })),
    });

    // Execute each tool and append results.
    for (const tc of toolCalls) {
      toolsUsed.push(tc.name);
      onEvent({ type: 'tool', name: tc.name });
      try {
        const input = JSON.parse(tc.args || '{}') as Record<string, unknown>;
        const result = await dispatchTool(tc.name, input);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: `Error: ${msg}` });
      }
    }
  }

  if (conversationId) saveOpenAIHistory(conversationId, messages);
  onEvent({ type: 'done', toolsUsed });
}

// ---------------------------------------------------------------------------
// Public entry point — dispatches to the right provider
// ---------------------------------------------------------------------------
export async function chatStream(
  conversationId: string | null,
  question: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const config = await getActiveLLMConfig();

  if (config.provider === 'openai_compatible') {
    return chatStreamOpenAI(conversationId, question, onEvent, signal, config);
  }

  return chatStreamAnthropic(conversationId, question, onEvent, signal, config);
}
