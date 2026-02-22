import type { FireflyClient } from './client.js';
import type { FireflyPiggyBank, FireflyPiggyBankEvent } from './types.js';

// Returns a map of transaction_journal_id → piggy_bank_id by fetching
// /piggy-banks/{id}/events for every piggy bank.
export async function buildPiggyBankMap(
  client: FireflyClient,
  piggyBanks: FireflyPiggyBank[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  await Promise.all(
    piggyBanks.map(async (bank) => {
      const events = await client.getAll<FireflyPiggyBankEvent>(
        `/piggy-banks/${bank.id}/events`,
      );
      for (const event of events) {
        const journalId = String(event.attributes.transaction_journal_id);
        map.set(journalId, bank.id);
      }
    }),
  );

  return map;
}
