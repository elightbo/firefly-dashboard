import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { type Period, resolvePeriod, previousPeriod, toNum, pct } from './utils.js';

export interface CompareSpendingResult {
  period: { start: string; end: string };
  categoryTotals: Record<string, number>;
  totalSpending: number;
  trend: number; // % vs equivalent previous period
}

async function spendingByCategory(start: string, end: string): Promise<Record<string, number>> {
  const rows = await db
    .select({
      category: sql<string>`COALESCE(${transactions.budgetName}, ${transactions.category}, 'Uncategorized')`,
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(and(eq(transactions.type, 'withdrawal'), gte(transactions.date, start), lte(transactions.date, end)))
    .groupBy(sql`COALESCE(${transactions.budgetName}, ${transactions.category}, 'Uncategorized')`);

  return Object.fromEntries(
    rows.map(r => [r.category, Math.round(toNum(r.total) * 100) / 100])
  );
}

export async function compareSpending(period: Period = 'month_to_date'): Promise<CompareSpendingResult> {
  const { start, end } = resolvePeriod(period);
  const prev = previousPeriod(start, end);

  const [current, previous] = await Promise.all([
    spendingByCategory(start, end),
    spendingByCategory(prev.start, prev.end),
  ]);

  const totalCurrent = Object.values(current).reduce((s, v) => s + v, 0);
  const totalPrevious = Object.values(previous).reduce((s, v) => s + v, 0);

  return {
    period: { start, end },
    categoryTotals: current,
    totalSpending: Math.round(totalCurrent * 100) / 100,
    trend: pct(totalCurrent, totalPrevious),
  };
}
