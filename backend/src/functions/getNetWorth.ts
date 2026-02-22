import { eq, inArray, and, gte, lte, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, transactions } from '../db/schema.js';
import { toNum, pct } from './utils.js';

export interface NetWorthResult {
  total: number;
  trend: number; // % change vs 30 days ago
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
}

export async function getNetWorth(): Promise<NetWorthResult> {
  // Include both assets and liabilities. Firefly stores liability balances as
  // negative values so summing them together gives correct net worth.
  const allAccounts = await db
    .select({ id: accounts.id, name: accounts.name, type: accounts.type, balance: accounts.balance })
    .from(accounts)
    .where(inArray(accounts.type, ['asset', 'liabilities']));

  const total = allAccounts.reduce((s, a) => s + toNum(a.balance), 0);
  const assetIds = allAccounts.filter(a => a.type === 'asset').map(a => a.id);

  if (assetIds.length === 0) return { total: 0, trend: 0, accounts: [] };

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const d30 = thirtyDaysAgo.toISOString().split('T')[0];

  const [deposits, withdrawals] = await Promise.all([
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.type, 'deposit'), gte(transactions.date, d30), lte(transactions.date, today), inArray(transactions.accountId, assetIds))),
    db.select({ total: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.type, 'withdrawal'), gte(transactions.date, d30), lte(transactions.date, today), inArray(transactions.accountId, assetIds))),
  ]);

  const netFlow = toNum(deposits[0]?.total) - toNum(withdrawals[0]?.total);
  const previousTotal = total - netFlow;

  return {
    total: Math.round(total * 100) / 100,
    trend: pct(total, previousTotal),
    accounts: allAccounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Math.round(toNum(a.balance) * 100) / 100,
    })),
  };
}
