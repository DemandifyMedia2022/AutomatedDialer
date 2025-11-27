import { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logActivity } from '../services/superadmin/activityFeedService';

// Type assertion for audit_logs table (will be available after prisma generate)
const auditLogsTable = (prisma as any).audit_logs;

/**
 * Audit log entry interface
 */
interface AuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  outcome?: 'success' | 'failure';
}

/**
 * Middleware to log superadmin actions to audit_logs table
 * Must be used after requireAuth middleware
 * 
 * Usage:
 * router.post('/api/superadmin/users', requireAuth, requireSuperadmin, auditLogger('CREATE_USER', 'users'), handler);
 */
export function auditLogger(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    // Capture the response
    res.json = function (body: any) {
      const responseTime = Date.now() - startTime;
      
      // Determine outcome based on response
      const outcome = body?.success === false || res.statusCode >= 400 ? 'failure' : 'success';
      
      // Extract resource ID from response or request
      const resourceId = body?.data?.id || req.params?.id || req.body?.id;
      
      // Log audit entry asynchronously (don't block response)
      logAuditEntry({
        userId: req.user?.userId,
        username: req.user?.email,
        action,
        resource,
        resourceId: resourceId?.toString(),
        changes: req.body,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        outcome,
      }).catch(err => {
        console.error('Failed to log audit entry:', err);
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Manually log an audit entry
 * Useful for logging actions that don't fit the middleware pattern
 */
export async function logAuditEntry(data: {
  userId?: number;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ip?: string;
  userAgent?: string;
  outcome: 'success' | 'failure';
}) {
  try {
    await auditLogsTable.create({
      data: {
        user_id: data.userId,
        username: data.username,
        action: data.action,
        resource: data.resource,
        resource_id: data.resourceId,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        ip: data.ip,
        user_agent: data.userAgent,
        outcome: data.outcome,
        timestamp: new Date(),
      },
    });

    // Note: We don't call logActivity here to avoid duplicate entries
    // logActivity already stores to audit_logs table, so calling it here would create duplicates
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
}
