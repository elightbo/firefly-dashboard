import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { llmConfigs } from '../db/schema.js';

type Provider = 'anthropic' | 'openai_compatible';

interface LLMConfigBody {
  name: string;
  provider: Provider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

function sanitize(row: typeof llmConfigs.$inferSelect) {
  return {
    id:        row.id,
    name:      row.name,
    provider:  row.provider,
    baseUrl:   row.baseUrl ?? null,
    model:     row.model,
    apiKeySet: row.apiKey != null && row.apiKey.length > 0,
    isActive:  row.isActive,
    createdAt: row.createdAt,
  };
}

export async function llmConfigRoutes(app: FastifyInstance) {

  // GET /api/admin/llm-configs
  app.get('/admin/llm-configs', {
    schema: { tags: ['Admin'], summary: 'List all LLM provider configurations' },
  }, async () => {
    const rows = await db.select().from(llmConfigs).orderBy(llmConfigs.id);
    return rows.map(sanitize);
  });

  // POST /api/admin/llm-configs
  app.post<{ Body: LLMConfigBody }>('/admin/llm-configs', {
    schema: {
      tags: ['Admin'],
      summary: 'Add a new LLM provider configuration',
      body: {
        type: 'object',
        required: ['name', 'provider', 'model'],
        properties: {
          name:     { type: 'string', minLength: 1 },
          provider: { type: 'string', enum: ['anthropic', 'openai_compatible'] },
          model:    { type: 'string', minLength: 1 },
          baseUrl:  { type: 'string' },
          apiKey:   { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { name, provider, model, baseUrl, apiKey } = req.body;

    // First config becomes active automatically.
    const existing = await db.select().from(llmConfigs).limit(1);
    const isActive = existing.length === 0;

    const [created] = await db.insert(llmConfigs).values({
      name, provider, model,
      baseUrl: baseUrl ?? null,
      apiKey:  apiKey  ?? null,
      isActive,
    }).returning();

    return reply.code(201).send(sanitize(created));
  });

  // PUT /api/admin/llm-configs/:id
  app.put<{ Params: { id: string }; Body: LLMConfigBody }>('/admin/llm-configs/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Update an LLM provider configuration',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['name', 'provider', 'model'],
        properties: {
          name:     { type: 'string', minLength: 1 },
          provider: { type: 'string', enum: ['anthropic', 'openai_compatible'] },
          model:    { type: 'string', minLength: 1 },
          baseUrl:  { type: 'string' },
          apiKey:   { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const id = Number(req.params.id);
    const { name, provider, model, baseUrl, apiKey } = req.body;

    const [existing] = await db.select().from(llmConfigs).where(eq(llmConfigs.id, id)).limit(1);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const [updated] = await db
      .update(llmConfigs)
      .set({
        name, provider, model,
        baseUrl: baseUrl ?? null,
        // Only update apiKey if a new value was provided; keep existing otherwise.
        apiKey: apiKey && apiKey.length > 0 ? apiKey : existing.apiKey,
      })
      .where(eq(llmConfigs.id, id))
      .returning();

    return reply.send(sanitize(updated));
  });

  // POST /api/admin/llm-configs/:id/activate — set one config as active
  app.post<{ Params: { id: string } }>('/admin/llm-configs/:id/activate', {
    schema: {
      tags: ['Admin'],
      summary: 'Set an LLM config as the active provider',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const id = Number(req.params.id);
    await db.update(llmConfigs).set({ isActive: false });
    const [activated] = await db
      .update(llmConfigs)
      .set({ isActive: true })
      .where(eq(llmConfigs.id, id))
      .returning();
    if (!activated) return reply.code(404).send({ error: 'Not found' });
    return reply.send(sanitize(activated));
  });

  // DELETE /api/admin/llm-configs/:id
  app.delete<{ Params: { id: string } }>('/admin/llm-configs/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Delete an LLM provider configuration',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(llmConfigs).where(eq(llmConfigs.id, id)).limit(1);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (existing.isActive) return reply.code(400).send({ error: 'Cannot delete the active provider. Activate another one first.' });
    await db.delete(llmConfigs).where(eq(llmConfigs.id, id));
    return { ok: true };
  });
}
