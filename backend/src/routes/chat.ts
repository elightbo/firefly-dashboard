import type { FastifyInstance } from 'fastify';
import { chat, chatStream, clearHistory, type StreamEvent } from '../llm/chat.js';

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: { question: string } }>('/chat', {
    schema: {
      tags: ['Chat'],
      summary: 'Ask a natural language question about your finances',
      body: {
        type: 'object',
        required: ['question'],
        properties: {
          question: { type: 'string', description: 'Natural language financial question' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            answer: { type: 'string', description: 'Natural language answer from Claude' },
            toolsUsed: { type: 'array', items: { type: 'string' }, description: 'Whitelisted functions that were called' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { question } = req.body;
    try {
      const result = await chat(question);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error({ err }, '[chat] Chat failed');
      return reply.code(500).send({ error: message });
    }
  });

  // POST /chat/stream — SSE streaming response
  app.post<{ Body: { question: string; conversationId?: string } }>('/chat/stream', {
    schema: {
      tags: ['Chat'],
      summary: 'Ask a question — answer streams back as SSE text deltas',
      body: {
        type: 'object',
        required: ['question'],
        properties: {
          question: { type: 'string', description: 'Natural language financial question' },
          conversationId: { type: 'string', description: 'Opaque ID to maintain conversation history across turns' },
        },
      },
    },
  }, async (req, reply) => {
    const { question, conversationId = null } = req.body;

    // Take over the raw response; Fastify won't touch it after hijack().
    reply.hijack();
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    const ac = new AbortController();
    req.raw.on('close', () => ac.abort());

    function send(event: StreamEvent) {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    }

    try {
      await chatStream(conversationId, question, send, ac.signal);
    } catch (err) {
      if (!ac.signal.aborted) {
        const message = err instanceof Error ? err.message : String(err);
        app.log.error({ err }, '[chat/stream] Stream failed');
        send({ type: 'error', message });
      }
    } finally {
      if (!reply.raw.writableEnded) reply.raw.end();
    }
  });

  // DELETE /chat/history/:id — clears server-side history for a conversation
  app.delete<{ Params: { id: string } }>('/chat/history/:id', {
    schema: {
      tags: ['Chat'],
      summary: 'Clear the stored conversation history for a given conversationId',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
    },
  }, async (req) => {
    clearHistory(req.params.id);
    return { ok: true };
  });
}
