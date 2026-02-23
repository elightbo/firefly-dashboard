import Anthropic from '@anthropic-ai/sdk';
import { tools } from './tools.js';
import { dispatchTool } from './dispatch.js';
import { listMemories } from '../functions/memory.js';

// ---------------------------------------------------------------------------
// In-memory conversation store — persists message threads for the server
// lifetime. A new conversationId (sent by the client) starts a fresh thread.
// ---------------------------------------------------------------------------
const MAX_HISTORY = 40; // ~10 turns with a single tool call each
const conversationStore = new Map<string, Anthropic.MessageParam[]>();

function getHistory(id: string): Anthropic.MessageParam[] {
  return conversationStore.get(id) ?? [];
}

function saveHistory(id: string, messages: Anthropic.MessageParam[]): void {
  conversationStore.set(id, messages.slice(-MAX_HISTORY));
}

export function clearHistory(id: string): void {
  conversationStore.delete(id);
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

export async function chat(question: string): Promise<ChatResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

  const [systemPrompt, messages] = await Promise.all([
    buildSystemPrompt(),
    Promise.resolve<Anthropic.MessageParam[]>([{ role: 'user', content: question }]),
  ]);

  const toolsUsed: string[] = [];

  // Agentic loop — Claude may call multiple tools before forming a final answer.
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });

    // Append assistant response to message history.
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Claude is done — extract the final text response.
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim();
      return { answer: text, toolsUsed };
    }

    if (response.stop_reason === 'tool_use') {
      // Execute all tool calls Claude requested and collect results.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        toolsUsed.push(block.name);

        try {
          const result = await dispatchTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Error: ${message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason — bail out.
    break;
  }

  return { answer: 'Sorry, I was unable to answer that question.', toolsUsed };
}

// Streaming variant — fires onEvent callbacks as tokens and tool calls arrive.
// Tool rounds are awaited non-streaming; the final text answer streams token-by-token.
// Pass a conversationId to maintain history across turns; null for a stateless call.
export async function chatStream(
  conversationId: string | null,
  question: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

  const systemPrompt = await buildSystemPrompt();

  // Prepend stored history so Claude has full context from previous turns.
  const messages: Anthropic.MessageParam[] = [
    ...(conversationId ? getHistory(conversationId) : []),
    { role: 'user', content: question },
  ];
  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Use the streaming API every round so the final answer streams token-by-token.
    // During tool_use rounds Claude typically emits no text, so nothing reaches the client.
    const stream = client.messages.stream(
      { model, max_tokens: 2048, system: systemPrompt, tools, messages },
      { signal },
    );

    stream.on('text', (text) => onEvent({ type: 'text', text }));

    const response = await stream.finalMessage();
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      if (conversationId) saveHistory(conversationId, messages);
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

  if (conversationId) saveHistory(conversationId, messages);
  onEvent({ type: 'done', toolsUsed });
}
