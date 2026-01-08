import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requireAuth } from './middlewares/auth';
import { apiMetrics } from './middlewares/apiMetrics';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  // Security: Helmet for security headers (HSTS, X-Frame-Options, etc.)
  app.use(helmet());

  // Security: Stricter CORS
  app.use(cors({
    origin: env.NODE_ENV === 'production'
      ? (origin, callback) => {
        // Allow strict list or no origin (like mobile apps/curl)
        const allowed = [env.PUBLIC_BASE_URL, 'http://localhost:3000']
        if (!origin || allowed.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      }
      : true,
    credentials: true
  }));

  // Limits: Body parser limits to prevent DOS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Ensure recordings directory exists and serve it statically
  const recordingsPath = path.isAbsolute(env.RECORDINGS_DIR)
    ? env.RECORDINGS_DIR
    : path.resolve(process.cwd(), env.RECORDINGS_DIR);
  fs.mkdirSync(recordingsPath, { recursive: true });

  // Serve uploads with Content-Disposition attachment to prevent XSS
  // Protected by authentication
  app.use('/uploads', requireAuth as any, express.static(recordingsPath, {
    setHeaders: (res, path) => {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }));

  // API metrics collection middleware (tracks performance for superadmin dashboard)
  app.use('/api', apiMetrics);
  app.use('/api', routes);

  app.use(errorHandler);
  return app;
}