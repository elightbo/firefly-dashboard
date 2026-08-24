import { notInArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts } from '../db/schema.js';
import type { FireflyClient } from './client.js';
import type { FireflyAccount } from './types.js';

export async function syncAccounts(client: FireflyClient): Promise<number> {
  // Sync all account types so transactions can reference any account without
  // violating the FK constraint (expense/revenue/liability accounts appear as
  // transaction sources/destinations in Firefly).
  const data = await client.getAll<FireflyAccount>('/accounts');

  for (const item of data) {
    const a = item.attributes;
    await db
      .insert(accounts)
      .values({
        id: item.id,
        name: a.name,
        type: a.type,
        balance: a.current_balance,
        currencyCode: a.currency_code,
        active: a.active,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: {
          name: a.name,
          type: a.type,
          balance: a.current_balance,
          currencyCode: a.currency_code,
          active: a.active,
          updatedAt: new Date(),
        },
      });
  }

  // Accounts deleted in Firefly no longer appear in the response — deactivate
  // any local rows Firefly didn't report so they drop out of net worth, but
  // keep the rows (not a hard delete) so historical transactions still join.
  if (data.length > 0) {
    await db
      .update(accounts)
      .set({ active: false, updatedAt: new Date() })
      .where(notInArray(accounts.id, data.map(item => item.id)));
  }

  return data.length;
}
