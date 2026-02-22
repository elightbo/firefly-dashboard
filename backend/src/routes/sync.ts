import type { FastifyInstance } from 'fastify';
import { runSync } from '../sync/index.js';

let syncInProgress = false;

const syncResultSchema = {
  type: 'object',
  properties: {
    accounts:     { type: 'number', description: 'Number of accounts synced' },
    piggyBanks:   { type: 'number', description: 'Number of piggy banks synced' },
    budgets:      { type: 'number', description: 'Number of budgets synced' },
    transactions: { type: 'number', description: 'Number of transactions synced' },
    durationMs:   { type: 'number', description: 'Total sync duration in milliseconds' },
  },
} as const;

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

export async function syncRoutes(app: FastifyInstance) {
  // POST /sync — trigger a manual sync
  app.post('/sync', {
    schema: {
      tags: ['Sync'],
      summary: 'Trigger a full Firefly III sync',
      description: 'Pulls accounts, piggy banks, budgets, and transactions from Firefly III and upserts them into the local database.',
      body: { type: 'null' },
      response: {
        200: syncResultSchema,
        409: { ...errorSchema, description: 'Sync already in progress' },
        500: { ...errorSchema, description: 'Sync failed' },
      },
    },
  }, async (_req, reply) => {
    if (syncInProgress) {
      return reply.code(409).send({ error: 'Sync already in progress' });
    }

    syncInProgress = true;
    try {
      const result = await runSync();
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error({ err }, '[sync] Sync failed');
      return reply.code(500).send({ error: message });
    } finally {
      syncInProgress = false;
    }
  });

  // GET /sync/status — quick health check
  app.get('/sync/status', {
    schema: {
      tags: ['Sync'],
      summary: 'Check sync status',
      response: {
        200: {
          type: 'object',
          properties: {
            inProgress: { type: 'boolean', description: 'Whether a sync is currently running' },
          },
        },
      },
    },
  }, async () => ({
    inProgress: syncInProgress,
  }));
}
