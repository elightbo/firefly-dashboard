import { and, gte, lte, sum, desc, SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payStubs } from '../db/schema.js';
import { type Period, resolvePeriod, toNum } from './utils.js';

export interface PayStubRecord {
  id: number;
  payDate: string;
  employer: string;
  gross: number;
  retirement: number;
  employerMatch: number;
  stockOptions: number;
  notes: string | null;
}

export async function listPayStubs(limit = 10): Promise<PayStubRecord[]> {
  const rows = await db
    .select()
    .from(payStubs)
    .orderBy(desc(payStubs.payDate))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    payDate: r.payDate,
    employer: r.employer,
    gross: Math.round(toNum(r.gross) * 100) / 100,
    retirement: Math.round(toNum(r.retirement) * 100) / 100,
    employerMatch: Math.round(toNum(r.employerMatch) * 100) / 100,
    stockOptions: Math.round(toNum(r.stockOptions) * 100) / 100,
    notes: r.notes ?? null,
  }));
}

export interface PayStubSummaryResult {
  period: { start: string; end: string };
  grossIncome: number;
  retirementContributions: number;
  employerMatch: number;
  stockOptions: number;
  preTaxSavings: number;       // retirement + employerMatch + stockOptions
  preTaxSavingsRate: number;   // preTaxSavings / grossIncome * 100 (0 if no stubs)
  byEmployer: Array<{ employer: string; gross: number; preTaxSavings: number }>;
}

export async function getPayStubSummary(period?: Period): Promise<PayStubSummaryResult> {
  const resolved = period ? resolvePeriod(period) : null;
  const { start, end } = resolved ?? { start: null, end: null };

  const dateFilter: SQL | undefined = start && end
    ? and(gte(payStubs.payDate, start), lte(payStubs.payDate, end))
    : undefined;

  const [totals, byEmployerRows] = await Promise.all([
    db
      .select({
        gross:         sum(payStubs.gross),
        retirement:    sum(payStubs.retirement),
        employerMatch: sum(payStubs.employerMatch),
        stockOptions:  sum(payStubs.stockOptions),
      })
      .from(payStubs)
      .where(dateFilter),
    db
      .select({
        employer:      payStubs.employer,
        gross:         sum(payStubs.gross),
        retirement:    sum(payStubs.retirement),
        employerMatch: sum(payStubs.employerMatch),
        stockOptions:  sum(payStubs.stockOptions),
      })
      .from(payStubs)
      .where(dateFilter)
      .groupBy(payStubs.employer),
  ]);

  const grossIncome             = Math.round(toNum(totals[0]?.gross) * 100) / 100;
  const retirementContributions = Math.round(toNum(totals[0]?.retirement) * 100) / 100;
  const employerMatchTotal      = Math.round(toNum(totals[0]?.employerMatch) * 100) / 100;
  const stockOptionsTotal       = Math.round(toNum(totals[0]?.stockOptions) * 100) / 100;
  const preTaxSavings           = Math.round((retirementContributions + employerMatchTotal + stockOptionsTotal) * 100) / 100;
  const preTaxSavingsRate       = grossIncome > 0 ? Math.round((preTaxSavings / grossIncome) * 10000) / 100 : 0;

  const byEmployer = byEmployerRows.map((r) => {
    const empGross    = toNum(r.gross);
    const empSavings  = toNum(r.retirement) + toNum(r.employerMatch) + toNum(r.stockOptions);
    return {
      employer:     r.employer,
      gross:        Math.round(empGross * 100) / 100,
      preTaxSavings: Math.round(empSavings * 100) / 100,
    };
  });

  return {
    period: { start: start ?? 'all_time', end: end ?? 'all_time' },
    grossIncome,
    retirementContributions,
    employerMatch: employerMatchTotal,
    stockOptions: stockOptionsTotal,
    preTaxSavings,
    preTaxSavingsRate,
    byEmployer,
  };
}
