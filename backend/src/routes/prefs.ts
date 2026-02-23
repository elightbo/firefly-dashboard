import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userPreferences } from '../db/schema.js';

const PINNED_KEY = 'pinned_budgets';

export async function prefsRoutes(app: FastifyInstance) {

  // GET /api/prefs/pinned-budgets
  app.get('/prefs/pinned-budgets', {
    schema: {
      tags: ['Prefs'],
      summary: 'Get pinned budget names for the current user',
      response: {
        200: { type: 'array', items: { type: 'string' } },
      },
    },
  }, async (req) => {
    const userId = (req.user as { sub: number }).sub;

    const [row] = await db
      .select({ value: userPreferences.value })
      .from(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.key, PINNED_KEY),
      ))
      .limit(1);

    if (!row) return [];
    try {
      return JSON.parse(row.value) as string[];
    } catch {
      return [];
    }
  });

  // PUT /api/prefs/pinned-budgets
  app.put<{ Body: { names: string[] } }>('/prefs/pinned-budgets', {
    schema: {
      tags: ['Prefs'],
      summary: 'Set pinned budget names for the current user',
      body: {
        type: 'object',
        required: ['names'],
        properties: {
          names: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
    },
  }, async (req) => {
    const userId = (req.user as { sub: number }).sub;
    const { names } = req.body;

    await db
      .insert(userPreferences)
      .values({ userId, key: PINNED_KEY, value: JSON.stringify(names) })
      .onConflictDoUpdate({
        target: [userPreferences.userId, userPreferences.key],
        set: { value: JSON.stringify(names) },
      });

    return { ok: true };
  });
}
