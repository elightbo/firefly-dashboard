import { buildClient } from './client.js';
import { syncAccounts } from './syncAccounts.js';
import { syncPiggyBanks } from './syncPiggyBanks.js';
import { syncBudgets } from './syncBudgets.js';
import { syncTransactions } from './syncTransactions.js';
import { buildPiggyBankMap } from './buildPiggyBankMap.js';

export interface SyncResult {
  accounts: number;
  piggyBanks: number;
  budgets: number;
  transactions: number;
  durationMs: number;
  error?: string;
}

export async function runSync(): Promise<SyncResult> {
  const start = Date.now();
  const client = buildClient();

  console.log('[sync] Starting Firefly III sync...');

  // Accounts and piggy banks first — transactions reference them.
  const [accountCount, { count: piggyBankCount, data: piggyBankData }] = await Promise.all([
    syncAccounts(client),
    syncPiggyBanks(client),
  ]);
  console.log(`[sync] Accounts: ${accountCount}, Piggy banks: ${piggyBankCount}`);

  const budgetCount = await syncBudgets(client);
  console.log(`[sync] Budgets: ${budgetCount}`);

  // Build journal → piggy bank map before syncing transactions.
  const piggyBankMap = await buildPiggyBankMap(client, piggyBankData);
  console.log(`[sync] Piggy bank event map: ${piggyBankMap.size} entries`);

  const transactionCount = await syncTransactions(client, piggyBankMap);
  console.log(`[sync] Transactions: ${transactionCount}`);

  const durationMs = Date.now() - start;
  console.log(`[sync] Done in ${durationMs}ms`);

  return {
    accounts: accountCount,
    piggyBanks: piggyBankCount,
    budgets: budgetCount,
    transactions: transactionCount,
    durationMs,
  };
}
