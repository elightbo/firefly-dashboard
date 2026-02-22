import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const BCRYPT_ROUNDS = 12;

export async function adminRoutes(app: FastifyInstance) {

  // GET /api/admin/users — list all users (id + username only)
  app.get('/admin/users', {
    schema: {
      tags: ['Admin'],
      summary: 'List all users',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:        { type: 'number' },
              username:  { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async () => {
    return db
      .select({ id: users.id, username: users.username, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.id);
  });

  // POST /api/admin/users — create a new user
  app.post<{ Body: { username: string; password: string } }>(
    '/admin/users',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Create a new user',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1, maxLength: 64 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: { id: { type: 'number' }, username: { type: 'string' } },
          },
          409: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const { username, password } = req.body;

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existing.length > 0) {
        return reply.code(409).send({ error: 'Username already taken' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const [newUser] = await db
        .insert(users)
        .values({ username, passwordHash })
        .returning({ id: users.id, username: users.username });

      return reply.code(201).send(newUser);
    },
  );

  // DELETE /api/admin/users/:id — remove a user (can't delete yourself)
  app.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete a user',
        params: { type: 'object', properties: { id: { type: 'string' } } },
        response: {
          200: { type: 'object', properties: { ok: { type: 'boolean' } } },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const targetId = Number(req.params.id);

      // Prevent self-deletion
      if (targetId === req.user.sub) {
        return reply.code(400).send({ error: "You can't delete your own account" });
      }

      await db.delete(users).where(eq(users.id, targetId));
      return reply.send({ ok: true });
    },
  );
}
