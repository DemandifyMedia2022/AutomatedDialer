import { broadcastActivityEvent, generateEventId } from '../../websocket/activityFeedServer';
import { db } from '../../db/prisma';

interface ActivityEvent {
  id: string;
  type: 'auth' | 'api' | 'database' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Log and broadcast an activity event
 */
export async function logActivity(
  type: ActivityEvent['type'],
  severity: ActivityEvent['severity'],
  message: string,
  metadata?: any
): Promise<void> {
  const event: ActivityEvent = {
    id: generateEventId(),
    type,
    severity,
    message,
    timestamp: new Date(),
    metadata
  };

  // Broadcast to connected WebSocket clients
  broadcastActivityEvent(event);

  // Only store important events in database (errors, warnings, and auth events)
  // Skip storing routine API calls to prevent database bloat
  const shouldStore = severity === 'error' || 
                      severity === 'critical' || 
                      severity === 'warning' ||
                      type === 'auth';

  if (shouldStore) {
    try {
      await db.audit_logs.create({
        data: {
          user_id: metadata?.userId || null,
          username: metadata?.username || 'system',
          action: `ACTIVITY_${type.toUpperCase()}`,
          resource: metadata?.resource || type,
          resource_id: metadata?.resourceId || null,
          changes: metadata ? JSON.stringify(metadata) : null,
          ip: metadata?.ip || null,
          user_agent: metadata?.userAgent || null,
          outcome: severity === 'error' || severity === 'critical' ? 'failure' : 'success',
          timestamp: event.timestamp
        }
      });
    } catch (error) {
      console.error('[ActivityFeed] Error storing activity in database:', error);
    }
  }
}

/**
 * Get recent activity events from database
 */
export async function getRecentActivity(
  limit: number = 100,
  filters?: {
    type?: string[];
    severity?: string[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<ActivityEvent[]> {
  try {
    const where: any = {};

    // Build where clause based on filters
    if (filters?.type && filters.type.length > 0) {
      where.action = {
        in: filters.type.map(t => `ACTIVITY_${t.toUpperCase()}`)
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const logs = await db.audit_logs.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    // Transform audit logs to activity events
    return logs.map(log => {
      const metadata = log.changes ? JSON.parse(log.changes as string) : {};
      const typeMatch = log.action.match(/^ACTIVITY_(.+)$/);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'api';
      
      return {
        id: log.id.toString(),
        type: type as ActivityEvent['type'],
        severity: log.outcome === 'failure' ? 'error' : 'info',
        message: `${log.action} on ${log.resource}`,
        timestamp: log.timestamp,
        metadata: {
          userId: log.user_id,
          username: log.username,
          resource: log.resource,
          resourceId: log.resource_id,
          ip: log.ip,
          userAgent: log.user_agent,
          ...metadata
        }
      };
    });
  } catch (error) {
    console.error('[ActivityFeed] Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Log authentication event
 */
export async function logAuthActivity(
  action: 'login' | 'logout' | 'failed_login',
  userId: number | null,
  username: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const severity = action === 'failed_login' ? 'warning' : 'info';
  const message = action === 'login' 
    ? `User ${username} logged in`
    : action === 'logout'
    ? `User ${username} logged out`
    : `Failed login attempt for ${username}`;

  await logActivity('auth', severity, message, {
    userId,
    username,
    action,
    ip,
    userAgent
  });
}

/**
 * Log API activity
 */
export async function logApiActivity(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  userId?: number,
  username?: string
): Promise<void> {
  const severity = statusCode >= 500 ? 'error' 
    : statusCode >= 400 ? 'warning' 
    : 'info';
  
  const message = `${method} ${endpoint} - ${statusCode} (${responseTime}ms)`;

  await logActivity('api', severity, message, {
    userId,
    username,
    endpoint,
    method,
    statusCode,
    responseTime
  });
}

/**
 * Log database activity
 */
export async function logDatabaseActivity(
  operation: string,
  table: string,
  duration: number,
  success: boolean,
  error?: string
): Promise<void> {
  const severity = !success ? 'error' : duration > 1000 ? 'warning' : 'info';
  const message = success
    ? `${operation} on ${table} completed in ${duration}ms`
    : `${operation} on ${table} failed: ${error}`;

  await logActivity('database', severity, message, {
    operation,
    table,
    duration,
    success,
    error
  });
}

/**
 * Log error activity
 */
export async function logErrorActivity(
  errorType: string,
  errorMessage: string,
  stackTrace?: string,
  context?: any
): Promise<void> {
  await logActivity('error', 'error', `${errorType}: ${errorMessage}`, {
    errorType,
    errorMessage,
    stackTrace,
    ...context
  });
}
