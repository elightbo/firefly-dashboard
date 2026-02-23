import { gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { netWorthSnapshots } from '../db/schema.js';

export interface NetWorthSnapshot {
  date: string;
  total: number;
}

export async function getNetWorthHistory(months: number = 12): Promise<NetWorthSnapshot[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const rows = await db
    .select({ date: netWorthSnapshots.date, total: netWorthSnapshots.total })
    .from(netWorthSnapshots)
    .where(gte(netWorthSnapshots.date, cutoffStr))
    .orderBy(netWorthSnapshots.date);

  return rows.map(r => ({
    date: r.date,
    total: Math.round(parseFloat(r.total) * 100) / 100,
  }));
}
