import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import scalarReference from '@scalar/fastify-api-reference';
import cron from 'node-cron';
import { syncRoutes } from './routes/sync.js';
import { functionRoutes } from './routes/functions.js';
import { chatRoutes } from './routes/chat.js';
import { runSync } from './sync/index.js';

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

await app.register(syncRoutes);
await app.register(functionRoutes);
await app.register(chatRoutes);

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
