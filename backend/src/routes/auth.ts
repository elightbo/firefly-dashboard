import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { eq, count, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const COOKIE_NAME = 'session';
const BCRYPT_ROUNDS = 12;

const credentialsBody = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 64 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
} as const;

const userResponse = {
  type: 'object',
  properties: {
    id:        { type: 'number' },
    username:  { type: 'string' },
    isDefault: { type: 'boolean' },
  },
} as const;

const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } },
} as const;

export async function authRoutes(app: FastifyInstance) {

  // GET /api/auth/setup-needed — unprotected; tells the UI whether the default account is still in place
  app.get('/auth/setup-needed', {
    schema: {
      tags: ['Auth'],
      summary: 'Returns true if only the default admin account exists (first-boot state)',
      response: {
        200: { type: 'object', properties: { setupNeeded: { type: 'boolean' } } },
      },
    },
  }, async () => {
    const [{ value: total }] = await db.select({ value: count() }).from(users);
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.username, 'admin'));
    return { setupNeeded: Number(total) === 1 && Number(adminCount) === 1 };
  });

  // POST /api/auth/register — only works when 0 users exist
  app.post<{ Body: { username: string; password: string } }>(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register first user (only works when no users exist)',
        body: credentialsBody,
        response: { 201: userResponse, 400: errorResponse, 403: errorResponse },
      },
    },
    async (req, reply) => {
      const [{ value: userCount }] = await db
        .select({ value: count() })
        .from(users);

      if (Number(userCount) > 0) {
        return reply.code(403).send({ error: 'Registration is closed' });
      }

      const { username, password } = req.body;
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const [newUser] = await db
        .insert(users)
        .values({ username, passwordHash })
        .returning({ id: users.id, username: users.username });

      return reply.code(201).send(newUser);
    },
  );

  // POST /api/auth/login
  app.post<{ Body: { username: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login with username + password',
        body: credentialsBody,
        response: { 200: userResponse, 401: errorResponse },
      },
    },
    async (req, reply) => {
      const { username, password } = req.body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      // Always run bcrypt even on miss to prevent timing-based username enumeration
      const hash = user?.passwordHash ?? '$2b$12$invalidhashpaddingtomakethissafe00';
      const valid = await bcrypt.compare(password, hash);

      if (!user || !valid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = app.jwt.sign(
        { sub: user.id, username: user.username },
        { expiresIn: '30d' },
      );

      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return reply.send({ id: user.id, username: user.username });
    },
  );

  // POST /api/auth/logout
  app.post('/auth/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Clear session cookie',
      response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    },
  }, async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return reply.send({ ok: true });
  });

  // GET /api/auth/me
  app.get('/auth/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Return current authenticated user',
      response: { 200: userResponse, 401: errorResponse },
    },
  }, async (req, reply) => {
    try {
      await req.jwtVerify({ onlyCookie: true });
    } catch {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    const isDefault = req.user.username === 'admin';
    return reply.send({ id: req.user.sub, username: req.user.username, isDefault });
  });
}
