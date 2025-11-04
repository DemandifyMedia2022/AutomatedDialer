import { createApp } from './app';
import { env } from './config/env';
import { db } from './db/prisma';

async function bootstrap() {
  const app = createApp();
  await db.$connect();
  app.listen(env.PORT, () => {
    console.log(`[backend] listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[backend] failed to start', err);
  process.exit(1);
});
