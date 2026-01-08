import { createApp } from './app';
import { env } from './config/env';
import { db } from './db/prisma';
import http from 'http';
import { initWs } from './utils/ws';
import { startPresenceScheduler } from './services/presenceService';
import { initActivityFeedWs } from './websocket/activityFeedServer';
import { initializeAnalyticsEmailScheduler, shutdownAnalyticsEmailScheduler } from './services/cronScheduler';

async function bootstrap() {
  const app = createApp();
  await db.$connect();
  const server = http.createServer(app);
  initWs(server);
  initActivityFeedWs(server);
  startPresenceScheduler();
  
  // Initialize analytics email scheduler
  initializeAnalyticsEmailScheduler();
  
  server.listen(env.PORT, () => {
    console.log(`[backend] listening on http://localhost:${env.PORT}`);
  });
  
  // Graceful shutdown handlers
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[${signal}] received. Shutting down gracefully...`);
    
    // Stop analytics email scheduler
    shutdownAnalyticsEmailScheduler();
    
    server.close(() => {
      console.log('[backend] HTTP server closed');
      db.$disconnect().then(() => {
        console.log('[backend] Database disconnected');
        process.exit(0);
      });
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('[backend] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[backend] failed to start', err);
  process.exit(1);
});
