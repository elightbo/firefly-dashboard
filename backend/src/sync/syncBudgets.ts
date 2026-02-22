import { db } from '../db/index.js';
import { budgets } from '../db/schema.js';
import type { FireflyClient } from './client.js';
import type { FireflyBudget, FireflyBudgetLimit } from './types.js';

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

export async function syncBudgets(client: FireflyClient): Promise<number> {
  const data = await client.getAll<FireflyBudget>('/budgets');
  const { start, end } = currentMonthRange();

  for (const item of data) {
    // Fetch current month's limit + spent for this budget.
    const limitsRes = await client.getSingle<FireflyBudgetLimit>(
      `/budgets/${item.id}/limits`,
      { start, end },
    );

    const currentLimit = limitsRes.data[0] ?? null;
    const limitAmount = currentLimit?.attributes.amount ?? null;
    const spentRaw = currentLimit?.attributes.spent[0]?.sum ?? '0';
    // Firefly returns spent as a negative string e.g. "-150.00"
    const spent = String(Math.abs(parseFloat(spentRaw)));
    const period = currentLimit?.attributes.period ?? null;

    await db
      .insert(budgets)
      .values({
        id: item.id,
        name: item.attributes.name,
        period,
        limit: limitAmount,
        spent,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: budgets.id,
        set: {
          name: item.attributes.name,
          period,
          limit: limitAmount,
          spent,
          updatedAt: new Date(),
        },
      });
  }

  return data.length;
}
