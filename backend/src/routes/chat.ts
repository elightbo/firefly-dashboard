import type { FastifyInstance } from 'fastify';
import { chat } from '../llm/chat.js';

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
}
