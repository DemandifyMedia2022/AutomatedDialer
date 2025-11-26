import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
 
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: env.USE_AUTH_COOKIE,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
 
  // Ensure recordings directory exists and serve it statically
  const recordingsPath = path.isAbsolute(env.RECORDINGS_DIR)
    ? env.RECORDINGS_DIR
    : path.resolve(process.cwd(), env.RECORDINGS_DIR);
  fs.mkdirSync(recordingsPath, { recursive: true });
  app.use('/uploads', express.static(recordingsPath));
 
  app.use('/api', routes);
 
  app.use(errorHandler);
  return app;
}