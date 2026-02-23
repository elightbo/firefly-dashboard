import type { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payStubs } from '../db/schema.js';

interface PayStubBody {
  payDate: string;
  employer: string;
  gross: number;
  retirement: number;
  employerMatch: number;
  stockOptions: number;
  notes?: string;
}

export async function payStubRoutes(app: FastifyInstance) {

  // GET /api/pay-stubs
  app.get<{ Querystring: { year?: string } }>('/pay-stubs', {
    schema: {
      tags: ['Pay Stubs'],
      summary: 'List all pay stubs (all users), desc by pay date',
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'string', description: 'Filter by year, e.g. 2025' },
        },
      },
    },
  }, async (req) => {
    const { year } = req.query;
    const conditions = [];
    if (year) {
      conditions.push(gte(payStubs.payDate, `${year}-01-01`));
      conditions.push(lte(payStubs.payDate, `${year}-12-31`));
    }

    const rows = await db
      .select()
      .from(payStubs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payStubs.payDate));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      payDate: r.payDate,
      employer: r.employer,
      gross: parseFloat(r.gross),
      retirement: parseFloat(r.retirement),
      employerMatch: parseFloat(r.employerMatch),
      stockOptions: parseFloat(r.stockOptions),
      notes: r.notes,
      createdAt: r.createdAt,
    }));
  });

  // POST /api/pay-stubs
  app.post<{ Body: PayStubBody }>('/pay-stubs', {
    schema: {
      tags: ['Pay Stubs'],
      summary: 'Create a pay stub',
      body: {
        type: 'object',
        required: ['payDate', 'employer', 'gross', 'retirement', 'employerMatch', 'stockOptions'],
        properties: {
          payDate:       { type: 'string', description: 'Pay date in YYYY-MM-DD' },
          employer:      { type: 'string' },
          gross:         { type: 'number' },
          retirement:    { type: 'number' },
          employerMatch: { type: 'number' },
          stockOptions:  { type: 'number' },
          notes:         { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const userId = (req.user as { sub: number }).sub;
    const { payDate, employer, gross, retirement, employerMatch, stockOptions, notes } = req.body;

    const [created] = await db.insert(payStubs).values({
      userId,
      payDate,
      employer,
      gross: String(gross),
      retirement: String(retirement),
      employerMatch: String(employerMatch),
      stockOptions: String(stockOptions),
      notes: notes ?? null,
    }).returning();

    return reply.code(201).send({
      id: created.id,
      userId: created.userId,
      payDate: created.payDate,
      employer: created.employer,
      gross: parseFloat(created.gross),
      retirement: parseFloat(created.retirement),
      employerMatch: parseFloat(created.employerMatch),
      stockOptions: parseFloat(created.stockOptions),
      notes: created.notes,
      createdAt: created.createdAt,
    });
  });

  // DELETE /api/pay-stubs/:id
  app.delete<{ Params: { id: string } }>('/pay-stubs/:id', {
    schema: {
      tags: ['Pay Stubs'],
      summary: 'Delete a pay stub (own stubs only)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const userId = (req.user as { sub: number }).sub;
    const stubId = parseInt(req.params.id, 10);

    const result = await db
      .delete(payStubs)
      .where(and(eq(payStubs.id, stubId), eq(payStubs.userId, userId)))
      .returning({ id: payStubs.id });

    if (result.length === 0) {
      return reply.code(404).send({ error: 'Not found or not authorized' });
    }

    return { ok: true };
  });
}
