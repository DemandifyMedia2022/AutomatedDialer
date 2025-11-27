import { createApp } from './app';
import { env } from './config/env';
import { db } from './db/prisma';
import http from 'http';
import { initWs } from './utils/ws';
import { startPresenceScheduler } from './services/presenceService';
import { initActivityFeedWs } from './websocket/activityFeedServer';

async function bootstrap() {
  const app = createApp();
  await db.$connect();
  const server = http.createServer(app);
  initWs(server);
  initActivityFeedWs(server);
  startPresenceScheduler();
  server.listen(env.PORT, () => {
    console.log(`[backend] listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[backend] failed to start', err);
  process.exit(1);
});
