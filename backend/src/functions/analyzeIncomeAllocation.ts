import { eq, and, gte, lte, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { type Period, resolvePeriod, toNum } from './utils.js';

export interface IncomeAllocationResult {
  period: { start: string; end: string };
  income: number;
  spending: number;
  netSavings: number;
  savingsRate: number; // % of income saved
}

export async function analyzeIncomeAllocation(period: Period = 'month_to_date'): Promise<IncomeAllocationResult> {
  const { start, end } = resolvePeriod(period);

  const [depositRows, withdrawalRows] = await Promise.all([
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.type, 'deposit'), gte(transactions.date, start), lte(transactions.date, end))),
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.type, 'withdrawal'), gte(transactions.date, start), lte(transactions.date, end))),
  ]);

  const income = Math.round(toNum(depositRows[0]?.total) * 100) / 100;
  const spending = Math.round(toNum(withdrawalRows[0]?.total) * 100) / 100;
  const netSavings = Math.round((income - spending) * 100) / 100;
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 10000) / 100 : 0;

  return { period: { start, end }, income, spending, netSavings, savingsRate };
}
