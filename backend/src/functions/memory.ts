import { db } from '../db/index.js';
import { memories } from '../db/schema.js';
import { desc } from 'drizzle-orm';

export async function rememberFact(fact: string): Promise<{ saved: boolean }> {
  await db.insert(memories).values({ content: fact.trim() });
  return { saved: true };
}

export async function listMemories(): Promise<string[]> {
  const rows = await db
    .select({ content: memories.content })
    .from(memories)
    .orderBy(desc(memories.createdAt));
  return rows.map(r => r.content);
}
