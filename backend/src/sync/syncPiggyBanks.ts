import { db } from '../db/index.js';
import { piggyBanks } from '../db/schema.js';
import type { FireflyClient } from './client.js';
import type { FireflyPiggyBank } from './types.js';

export async function syncPiggyBanks(
  client: FireflyClient,
): Promise<{ count: number; data: FireflyPiggyBank[] }> {
  const data = await client.getAll<FireflyPiggyBank>('/piggy-banks');

  for (const item of data) {
    const p = item.attributes;
    await db
      .insert(piggyBanks)
      .values({
        id: item.id,
        name: p.name,
        targetAmount: p.target_amount,
        currentAmount: p.current_amount,
        deadline: p.target_date ?? null,
        tags: [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: piggyBanks.id,
        set: {
          name: p.name,
          targetAmount: p.target_amount,
          currentAmount: p.current_amount,
          deadline: p.target_date ?? null,
          updatedAt: new Date(),
        },
      });
  }

  return { count: data.length, data };
}
