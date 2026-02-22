import { and, gte, lte, sum, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { toNum } from './utils.js';

export interface MonthlyOverviewPoint {
  month: string; // YYYY-MM
  income: number;
  spending: number;
  savingsRate: number;
}

export async function getMonthlyOverview(months: number = 12): Promise<MonthlyOverviewPoint[]> {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const start = startDate.toISOString().split('T')[0];

  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      type: transactions.type,
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(and(
      inArray(transactions.type, ['deposit', 'withdrawal']),
      gte(transactions.date, start),
      lte(transactions.date, end),
    ))
    .groupBy(
      sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      transactions.type,
    );

  const byMonth: Record<string, { income: number; spending: number }> = {};
  for (const row of rows) {
    if (!byMonth[row.month]) byMonth[row.month] = { income: 0, spending: 0 };
    if (row.type === 'deposit') byMonth[row.month].income += toNum(row.total);
    else if (row.type === 'withdrawal') byMonth[row.month].spending += toNum(row.total);
  }

  const result: MonthlyOverviewPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const { income, spending } = byMonth[month] ?? { income: 0, spending: 0 };
    const savingsRate = income > 0 ? Math.round(((income - spending) / income) * 10000) / 100 : 0;
    result.push({
      month,
      income: Math.round(income * 100) / 100,
      spending: Math.round(spending * 100) / 100,
      savingsRate,
    });
  }
  return result;
}
