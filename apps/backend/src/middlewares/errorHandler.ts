import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status || 500;
  const message = err?.message || 'Internal Server Error';

  const response: any = { success: false, message };

  // Only include stack trace in non-production environments
  if (env.NODE_ENV !== 'production') {
    response.stack = err?.stack;
  }

  res.status(status).json(response);
}
