import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { toNum } from './utils.js';

export interface MonthlyBudgetSpendingResult {
  months: Array<{ month: string; totals: Record<string, number> }>;
  budgets: string[]; // ordered by total spend descending (for consistent chart colors)
}

const TOP_N = 8;

export async function getMonthlyBudgetSpending(months: number = 12): Promise<MonthlyBudgetSpendingResult> {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const start = startDate.toISOString().split('T')[0];

  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      budget: sql<string>`COALESCE(${transactions.budgetName}, ${transactions.category}, 'Uncategorized')`,
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(and(
      eq(transactions.type, 'withdrawal'),
      gte(transactions.date, start),
      lte(transactions.date, end),
    ))
    .groupBy(
      sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      sql`COALESCE(${transactions.budgetName}, ${transactions.category}, 'Uncategorized')`,
    );

  // Find top N budgets by total spend across entire period.
  const budgetTotals: Record<string, number> = {};
  for (const row of rows) {
    budgetTotals[row.budget] = (budgetTotals[row.budget] ?? 0) + toNum(row.total);
  }

  const topBudgets = Object.entries(budgetTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP_N)
    .map(([name]) => name);

  const topBudgetSet = new Set(topBudgets);
  const hasOther = rows.some(r => !topBudgetSet.has(r.budget));

  // Aggregate by month, folding small budgets into "Other".
  const byMonth: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byMonth[row.month]) byMonth[row.month] = {};
    const key = topBudgetSet.has(row.budget) ? row.budget : 'Other';
    byMonth[row.month][key] = (byMonth[row.month][key] ?? 0) + toNum(row.total);
  }

  // Build result covering all months in the range (zero-fill months with no data).
  const result: Array<{ month: string; totals: Record<string, number> }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const raw = byMonth[month] ?? {};
    const totals: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      totals[k] = Math.round(v * 100) / 100;
    }
    result.push({ month, totals });
  }

  return {
    months: result,
    budgets: hasOther ? [...topBudgets, 'Other'] : topBudgets,
  };
}
