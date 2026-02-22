import 'dotenv/config';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import swagger from '@fastify/swagger';
import scalarReference from '@scalar/fastify-api-reference';
import cron from 'node-cron';
import { syncRoutes } from './routes/sync.js';
import { functionRoutes } from './routes/functions.js';
import { chatRoutes } from './routes/chat.js';
import { runSync } from './sync/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Run migrations on startup — no-op if already applied.
import { db } from './db/index.js';
await migrate(db, { migrationsFolder: join(__dirname, '..', 'drizzle') });

const app = Fastify({ logger: true });

// Allow empty bodies on POST requests (e.g. /sync has no body but Scalar sends
// Content-Type: application/json regardless).
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  if (!body || body === '') {
    done(null, null);
    return;
  }
  try {
    done(null, JSON.parse(body as string));
  } catch (err) {
    done(err as Error, undefined);
  }
});

await app.register(cors, { origin: true });

await app.register(swagger, {
  openapi: {
    info: {
      title: 'Budget API',
      description: 'Firefly III AI Personal Reporting System — local reporting and sync backend.',
      version: '0.1.0',
    },
    tags: [
      { name: 'Sync', description: 'Firefly III data sync operations' },
      { name: 'Functions', description: 'Whitelisted reporting functions' },
      { name: 'Chat', description: 'Natural language Q&A powered by Claude' },
      { name: 'Health', description: 'Server health' },
    ],
  },
});

await app.register(scalarReference, {
  routePrefix: '/documentation',
  configuration: {
    title: 'Budget API',
    theme: 'saturn',
  },
});

app.get('/health', {
  schema: {
    tags: ['Health'],
    summary: 'Health check',
    response: {
      200: {
        type: 'object',
        properties: { status: { type: 'string' } },
      },
    },
  },
}, async () => ({ status: 'ok' }));

await app.register(syncRoutes, { prefix: '/api' });
await app.register(functionRoutes, { prefix: '/api' });
await app.register(chatRoutes, { prefix: '/api' });

// Serve the built frontend in production (when ./public exists).
const publicDir = join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  await app.register(staticFiles, { root: publicDir, prefix: '/' });
  // SPA fallback — any unmatched route returns index.html so React Router works.
  app.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html');
  });
}

// Daily sync at midnight.
cron.schedule('0 0 * * *', async () => {
  app.log.info('[cron] Starting scheduled daily sync');
  try {
    const result = await runSync();
    app.log.info({ result }, '[cron] Daily sync complete');
  } catch (err) {
    app.log.error({ err }, '[cron] Daily sync failed');
  }
});

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
