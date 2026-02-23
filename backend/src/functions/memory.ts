import { db } from '../db/index.js';
import { memories } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

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

export async function listMemoriesWithIds(): Promise<Array<{ id: number; content: string }>> {
  const rows = await db
    .select({ id: memories.id, content: memories.content })
    .from(memories)
    .orderBy(desc(memories.createdAt));
  return rows;
}

export async function forgetMemory(id: number): Promise<{ deleted: boolean }> {
  const result = await db.delete(memories).where(eq(memories.id, id)).returning({ id: memories.id });
  return { deleted: result.length > 0 };
}

export async function updateMemory(id: number, content: string): Promise<{ updated: boolean }> {
  const result = await db
    .update(memories)
    .set({ content: content.trim() })
    .where(eq(memories.id, id))
    .returning({ id: memories.id });
  return { updated: result.length > 0 };
}
