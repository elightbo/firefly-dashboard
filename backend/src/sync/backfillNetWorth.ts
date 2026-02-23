import { and, eq, gte, inArray, min, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, netWorthSnapshots, transactions } from '../db/schema.js';
import { toNum } from '../functions/utils.js';

// Returns the last day of each calendar month between `from` and `until` (exclusive).
function monthEnds(from: Date, until: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor < until) {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    if (lastDay < until) {
      dates.push(lastDay.toISOString().split('T')[0]);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return dates;
}

// Reconstructs historical month-end net worth snapshots from current account
// balances + transaction history. Only inserts rows that don't already exist.
// Returns the number of snapshots inserted.
export async function backfillNetWorth(): Promise<number> {
  // Find the earliest transaction we have on record.
  const [earliest] = await db
    .select({ date: min(transactions.date) })
    .from(transactions);

  if (!earliest?.date) return 0;

  const today = new Date();
  const targets = monthEnds(new Date(earliest.date), today);
  if (targets.length === 0) return 0;

  // Skip dates that already have a snapshot.
  const existing = await db.select({ date: netWorthSnapshots.date }).from(netWorthSnapshots);
  const existingSet = new Set(existing.map(r => r.date));
  const missing = targets.filter(d => !existingSet.has(d));
  if (missing.length === 0) return 0;

  // Get all asset + liability accounts and their current balances.
  const allAccounts = await db
    .select({ id: accounts.id, balance: accounts.balance })
    .from(accounts)
    .where(inArray(accounts.type, ['asset', 'liabilities']));

  if (allAccounts.length === 0) return 0;

  const currentNetWorth = allAccounts.reduce((s, a) => s + toNum(a.balance), 0);
  const accountIds = allAccounts.map(a => a.id);

  // For each missing month-end, reconstruct net worth by reversing the cash
  // flows that happened AFTER that date:
  //   net_worth_at_D = current_net_worth
  //                    - deposits_after_D   (deposits increased net worth)
  //                    + withdrawals_after_D (withdrawals decreased net worth)
  // Transfers between asset accounts net to zero and are excluded.
  let inserted = 0;

  for (const dateStr of missing) {
    // "After D" means strictly after the last moment of that day.
    const dayAfter = new Date(dateStr);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    const [depRow, wdRow] = await Promise.all([
      db.select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(
          eq(transactions.type, 'deposit'),
          gte(transactions.date, dayAfterStr),
          inArray(transactions.accountId, accountIds),
        )),
      db.select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(
          eq(transactions.type, 'withdrawal'),
          gte(transactions.date, dayAfterStr),
          inArray(transactions.accountId, accountIds),
        )),
    ]);

    const depositsAfter = toNum(depRow[0]?.total);
    const withdrawalsAfter = toNum(wdRow[0]?.total);
    const total = String(
      Math.round((currentNetWorth - depositsAfter + withdrawalsAfter) * 100) / 100,
    );

    await db
      .insert(netWorthSnapshots)
      .values({ date: dateStr, total })
      .onConflictDoNothing();

    inserted++;
  }

  return inserted;
}
