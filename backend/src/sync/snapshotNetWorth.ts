import { inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, netWorthSnapshots } from '../db/schema.js';
import { toNum } from '../functions/utils.js';

export async function snapshotNetWorth(): Promise<void> {
  const rows = await db
    .select({ balance: accounts.balance, type: accounts.type })
    .from(accounts)
    .where(inArray(accounts.type, ['asset', 'liabilities']));

  const total = String(Math.round(rows.reduce((s, a) => s + toNum(a.balance), 0) * 100) / 100);
  const today = new Date().toISOString().split('T')[0];

  await db
    .insert(netWorthSnapshots)
    .values({ date: today, total })
    .onConflictDoUpdate({ target: netWorthSnapshots.date, set: { total } });
}
