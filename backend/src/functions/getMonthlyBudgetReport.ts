import { eq, and, gte, lte, sum, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions, budgets } from '../db/schema.js';
import { toNum } from './utils.js';

export interface BudgetReportItem {
  id: string;
  name: string;
  currentLimit: number | null;
  monthlySpend: number[]; // one entry per lookback month, oldest first
  avgSpend: number;
  suggestedLimit: number;
}

export interface MonthlyBudgetReportResult {
  reportMonth: string; // YYYY-MM this report is planning for
  lookbackMonths: Array<{ month: string; label: string }>; // months used for averages
  avgMonthlyIncome: number;
  budgets: BudgetReportItem[];
  totalCurrentLimits: number;
  totalSuggestedLimits: number;
  projectedSavingsRate: number;
}

function suggestLimit(avgSpend: number): number {
  if (avgSpend === 0) return 0;
  // Round up to nearest $25 — no buffer
  return Math.ceil(avgSpend / 25) * 25;
}

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export async function getMonthlyBudgetReport(lookback = 3, targetMonth?: string): Promise<MonthlyBudgetReportResult> {
  const now = new Date();

  // Determine the report month (the month being planned for).
  // If targetMonth (YYYY-MM) is provided use it; otherwise default to next month.
  let reportMonth: string;
  let anchor: Date; // first day of the report month, used to calculate lookback

  if (targetMonth && /^\d{4}-\d{2}$/.test(targetMonth)) {
    reportMonth = targetMonth;
    const [y, m] = targetMonth.split('-').map(Number);
    anchor = new Date(y, m - 1, 1);
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    reportMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    anchor = nextMonth;
  }

  // Build the N complete months immediately before the report month.
  const lookbackMonths: Array<{ month: string; start: string; end: string; label: string }> = [];
  for (let i = lookback; i >= 1; i--) {
    const first = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() - i + 1, 0);
    const month = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`;
    lookbackMonths.push({
      month,
      start: first.toISOString().split('T')[0],
      end: last.toISOString().split('T')[0],
      label: monthLabel(month),
    });
  }

  const rangeStart = lookbackMonths[0].start;
  const rangeEnd = lookbackMonths[lookbackMonths.length - 1].end;

  // All spending grouped by month + budget over the lookback window.
  const spendRows = await db
    .select({
      month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      budget: sql<string>`COALESCE(${transactions.budgetName}, ${transactions.category}, 'Uncategorized')`,
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(and(
      eq(transactions.type, 'withdrawal'),
      gte(transactions.date, rangeStart),
      lte(transactions.date, rangeEnd),
    ))
    .groupBy(
      sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      sql`COALESCE(${transactions.budgetName}, ${transactions.category}, 'Uncategorized')`,
    );

  // Income over the same window.
  const incomeRows = await db
    .select({
      month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
      total: sum(transactions.amount),
    })
    .from(transactions)
    .where(and(
      eq(transactions.type, 'deposit'),
      gte(transactions.date, rangeStart),
      lte(transactions.date, rangeEnd),
    ))
    .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

  // Current budget limits from DB.
  const budgetRows = await db.select().from(budgets);
  const budgetLimitMap = new Map(
    budgetRows.map(b => [b.name, b.limit != null ? toNum(b.limit) : null])
  );
  const budgetIdMap = new Map(budgetRows.map(b => [b.name, b.id]));

  // Index spend by budget → month → total.
  const spendIndex: Record<string, Record<string, number>> = {};
  for (const row of spendRows) {
    if (!spendIndex[row.budget]) spendIndex[row.budget] = {};
    spendIndex[row.budget][row.month] = toNum(row.total);
  }

  // All unique budget names that had spend in the window.
  const budgetNames = Object.keys(spendIndex).sort();

  const avgMonthlyIncome = incomeRows.reduce((s, r) => s + toNum(r.total), 0) / lookback;

  const reportBudgets: BudgetReportItem[] = budgetNames.map(name => {
    const monthly = lookbackMonths.map(m => spendIndex[name]?.[m.month] ?? 0);
    const avg = monthly.reduce((s, v) => s + v, 0) / lookback;
    return {
      id: budgetIdMap.get(name) ?? name,
      name,
      currentLimit: budgetLimitMap.get(name) ?? null,
      monthlySpend: monthly.map(v => Math.round(v * 100) / 100),
      avgSpend: Math.round(avg * 100) / 100,
      suggestedLimit: suggestLimit(avg),
    };
  });

  // Sort by avg spend descending.
  reportBudgets.sort((a, b) => b.avgSpend - a.avgSpend);

  const totalCurrentLimits = reportBudgets.reduce((s, b) => s + (b.currentLimit ?? 0), 0);
  const totalSuggestedLimits = reportBudgets.reduce((s, b) => s + b.suggestedLimit, 0);
  const projectedSavingsRate = avgMonthlyIncome > 0
    ? Math.round(((avgMonthlyIncome - totalSuggestedLimits) / avgMonthlyIncome) * 10000) / 100
    : 0;

  return {
    reportMonth,
    lookbackMonths: lookbackMonths.map(m => ({ month: m.month, label: m.label })),
    avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
    budgets: reportBudgets,
    totalCurrentLimits: Math.round(totalCurrentLimits * 100) / 100,
    totalSuggestedLimits: Math.round(totalSuggestedLimits * 100) / 100,
    projectedSavingsRate,
  };
}
