import { and, gte, lte, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payStubs } from '../db/schema.js';
import { type Period, resolvePeriod, toNum } from './utils.js';

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

export async function getPayStubSummary(period: Period = 'year_to_date'): Promise<PayStubSummaryResult> {
  const { start, end } = resolvePeriod(period);

  const dateFilter = and(gte(payStubs.payDate, start), lte(payStubs.payDate, end));

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
    period: { start, end },
    grossIncome,
    retirementContributions,
    employerMatch: employerMatchTotal,
    stockOptions: stockOptionsTotal,
    preTaxSavings,
    preTaxSavingsRate,
    byEmployer,
  };
}
