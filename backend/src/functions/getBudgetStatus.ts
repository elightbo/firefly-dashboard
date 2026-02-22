import { eq, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { budgets } from '../db/schema.js';
import { toNum } from './utils.js';

export interface BudgetStatusResult {
  id: string;
  name: string;
  period: string | null;
  limit: number | null;
  spent: number;
  remaining: number | null;
  percentUsed: number | null;
}

export async function getBudgetStatus(idOrName: string): Promise<BudgetStatusResult> {
  // Accept either a budget ID or a case-insensitive name search.
  const [budget] = await db.select().from(budgets)
    .where(eq(budgets.id, idOrName))
    .limit(1);

  const found = budget ?? (await db.select().from(budgets)
    .where(ilike(budgets.name, `%${idOrName}%`))
    .limit(1))[0];

  if (!found) throw new Error(`Budget not found: ${idOrName}`);

  const limit = found.limit != null ? toNum(found.limit) : null;
  const spent = Math.round(toNum(found.spent) * 100) / 100;
  const remaining = limit != null ? Math.round((limit - spent) * 100) / 100 : null;
  const percentUsed = limit != null && limit > 0
    ? Math.round((spent / limit) * 10000) / 100
    : null;

  return {
    id: found.id,
    name: found.name,
    period: found.period,
    limit: limit != null ? Math.round(limit * 100) / 100 : null,
    spent,
    remaining,
    percentUsed,
  };
}

export async function listBudgets(): Promise<BudgetStatusResult[]> {
  const rows = await db.select().from(budgets);
  return rows.map(found => {
    const limit = found.limit != null ? toNum(found.limit) : null;
    const spent = Math.round(toNum(found.spent) * 100) / 100;
    const remaining = limit != null ? Math.round((limit - spent) * 100) / 100 : null;
    const percentUsed = limit != null && limit > 0
      ? Math.round((spent / limit) * 10000) / 100
      : null;
    return { id: found.id, name: found.name, period: found.period, limit: limit != null ? Math.round(limit * 100) / 100 : null, spent, remaining, percentUsed };
  });
}
