import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { piggyBanks } from '../db/schema.js';
import { toNum } from './utils.js';

export interface PiggyBankStatusResult {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number | null;
  progress: number | null; // % of target reached, null if no target set
  deadline: string | null;
}

export async function getPiggyBankStatus(id: string): Promise<PiggyBankStatusResult> {
  const [bank] = await db.select().from(piggyBanks).where(eq(piggyBanks.id, id));
  if (!bank) throw new Error(`Piggy bank not found: ${id}`);

  const current = toNum(bank.currentAmount);
  const target = bank.targetAmount != null ? toNum(bank.targetAmount) : null;
  const progress = target != null && target > 0
    ? Math.round((current / target) * 10000) / 100
    : null;

  return {
    id: bank.id,
    name: bank.name,
    currentAmount: Math.round(current * 100) / 100,
    targetAmount: target != null ? Math.round(target * 100) / 100 : null,
    progress,
    deadline: bank.deadline ?? null,
  };
}

export async function listPiggyBanks(): Promise<PiggyBankStatusResult[]> {
  const banks = await db.select().from(piggyBanks);
  return banks.map(bank => {
    const current = toNum(bank.currentAmount);
    const target = bank.targetAmount != null ? toNum(bank.targetAmount) : null;
    const progress = target != null && target > 0
      ? Math.round((current / target) * 10000) / 100
      : null;
    return {
      id: bank.id,
      name: bank.name,
      currentAmount: Math.round(current * 100) / 100,
      targetAmount: target != null ? Math.round(target * 100) / 100 : null,
      progress,
      deadline: bank.deadline ?? null,
    };
  });
}
