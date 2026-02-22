import Anthropic from '@anthropic-ai/sdk';
import { tools } from './tools.js';
import { dispatchTool } from './dispatch.js';
import { listMemories } from '../functions/memory.js';

const BASE_SYSTEM_PROMPT = `You are a personal finance assistant for a Firefly III budgeting system.

You have access to a fixed set of financial reporting tools that query the user's local database.
You MUST only use these tools to answer financial questions — never invent figures or make assumptions about amounts not returned by a tool.

If a question cannot be answered with the available tools, say so clearly and list what you can help with instead.

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
      max_tokens: 1024,
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
