import { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logApiActivity } from '../services/superadmin/activityFeedService';

// Type assertion for api_metrics table (will be available after prisma generate)
const apiMetricsTable = (prisma as any).api_metrics;

/**
 * Middleware to collect API performance metrics
 * Tracks endpoint performance, response times, and errors
 * 
 * Usage:
 * app.use('/api', apiMetrics);
 */
export function apiMetrics(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Capture response
  const captureMetrics = (body?: any) => {
    const responseTime = Date.now() - startTime;
    
    // Extract error message if present
    let errorMessage: string | undefined;
    if (res.statusCode >= 400) {
      if (typeof body === 'string') {
        errorMessage = body;
      } else if (body?.message) {
        errorMessage = body.message;
      } else if (body?.error) {
        errorMessage = body.error;
      }
    }

    // Log metrics asynchronously (don't block response)
    logApiMetrics({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.userId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      errorMessage,
    }).catch(err => {
      console.error('Failed to log API metrics:', err);
    });
  };

  // Override json method
  res.json = function (body: any) {
    captureMetrics(body);
    return originalJson(body);
  };

  // Override send method
  res.send = function (body: any) {
    captureMetrics(body);
    return originalSend(body);
  };

  next();
}

/**
 * Log API metrics to database
 */
async function logApiMetrics(data: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: number;
  ip?: string;
  userAgent?: string;
  errorMessage?: string;
}) {
  try {
    // Only log if response time is significant or there's an error
    // This prevents logging every single request and keeps the table manageable
    if (data.responseTime > 100 || data.statusCode >= 400) {
      await apiMetricsTable.create({
        data: {
          endpoint: data.endpoint.substring(0, 500), // Truncate to fit column
          method: data.method,
          status_code: data.statusCode,
          response_time: data.responseTime,
          user_id: data.userId,
          ip: data.ip?.substring(0, 45),
          user_agent: data.userAgent?.substring(0, 500),
          error_message: data.errorMessage,
          timestamp: new Date(),
        },
      });

      // Broadcast activity event for significant API calls (slow or errors)
      // Only broadcast for superadmin endpoints or errors to avoid spam
      if (data.endpoint.includes('/superadmin') || data.statusCode >= 400) {
        logApiActivity(
          data.endpoint,
          data.method,
          data.statusCode,
          data.responseTime,
          data.userId,
          undefined // username not available here
        ).catch(err => {
          console.error('Failed to log API activity:', err);
        });
      }
    }
  } catch (error) {
    // Silently fail to avoid impacting API performance
    console.error('Error logging API metrics:', error);
  }
}

/**
 * Manually log API metrics
 * Useful for logging metrics outside of HTTP requests
 */
export async function logApiMetricsManual(data: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: number;
  ip?: string;
  userAgent?: string;
  errorMessage?: string;
}) {
  return logApiMetrics(data);
}
