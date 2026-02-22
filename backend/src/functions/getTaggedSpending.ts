import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { type Period, resolvePeriod, toNum } from './utils.js';

export interface TaggedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category: string | null;
}

export interface TaggedSpendingResult {
  tag: string;
  period: { start: string; end: string };
  total: number;
  transactions: TaggedTransaction[];
}

export async function getTaggedSpending(tag: string, period: Period = 'month_to_date'): Promise<TaggedSpendingResult> {
  const { start, end } = resolvePeriod(period);

  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      category: transactions.category,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'withdrawal'),
        gte(transactions.date, start),
        lte(transactions.date, end),
        sql`${transactions.tags} @> ARRAY[${tag}]::text[]`,
      )
    )
    .orderBy(transactions.date);

  const total = rows.reduce((s, r) => s + toNum(r.amount), 0);

  return {
    tag,
    period: { start, end },
    total: Math.round(total * 100) / 100,
    transactions: rows.map(r => ({
      id: r.id,
      date: r.date,
      amount: Math.round(toNum(r.amount) * 100) / 100,
      description: r.description,
      category: r.category,
    })),
  };
}
