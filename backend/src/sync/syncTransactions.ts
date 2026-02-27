import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import type { FireflyClient } from './client.js';
import type { FireflyTransactionGroup, FireflyTransactionJournal } from './types.js';

// Determines the "primary" account for a transaction — the asset account
// that the money moved in or out of.
function primaryAccountId(journal: FireflyTransactionJournal): string {
  // For deposits the asset account is the destination; for everything else
  // (withdrawal, transfer) it's the source.
  if (journal.type === 'deposit') {
    return String(journal.destination_id);
  }
  return String(journal.source_id);
}

function syncStartDate(): string {
  // Default: 1 year back. Override with SYNC_START_DATE env var (YYYY-MM-DD)
  // for a full historical load on first run.
  if (process.env.SYNC_START_DATE) return process.env.SYNC_START_DATE;
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

export async function syncTransactions(
  client: FireflyClient,
  piggyBankMap: Map<string, string> = new Map(),
): Promise<number> {
  const start = syncStartDate();
  const end = new Date().toISOString().split('T')[0];

  const groups = await client.getAll<FireflyTransactionGroup>('/transactions', {
    start,
    end,
    type: 'all',
  });

  let count = 0;

  for (const group of groups) {
    for (const journal of group.attributes.transactions) {
      const id = String(journal.transaction_journal_id);
      const accountId = primaryAccountId(journal);
      const piggyBankId = piggyBankMap.get(id) ?? null;

      await db
        .insert(transactions)
        .values({
          id,
          accountId,
          piggyBankId,
          date: journal.date.split('T')[0],
          amount: journal.amount,
          type: journal.type,
          budgetName: journal.budget_name ?? null,
          category: journal.category_name ?? null,
          description: journal.description,
          notes: journal.notes ?? null,
          tags: journal.tags ?? [],
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: transactions.id,
          set: {
            accountId,
            piggyBankId,
            date: journal.date.split('T')[0],
            amount: journal.amount,
            type: journal.type,
            budgetName: journal.budget_name ?? null,
            category: journal.category_name ?? null,
            description: journal.description,
            notes: journal.notes ?? null,
            tags: journal.tags ?? [],
            updatedAt: new Date(),
          },
        });

      count++;
    }
  }

  return count;
}
