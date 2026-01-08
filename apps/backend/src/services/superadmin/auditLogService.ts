import { db } from '../../db/prisma';
import { getPool } from '../../db/pool';
import { Workbook } from 'exceljs';

/**
 * Audit log service for superadmin dashboard
 * Provides retrieval, filtering, and export functionality for audit logs
 */

export interface AuditLogFilters {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: number;
  action?: string;
  resource?: string;
  outcome?: 'success' | 'failure';
  page?: number;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: number | null;
  username: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  changes: any;
  ip: string | null;
  userAgent: string | null;
  outcome: 'success' | 'failure';
}

/**
 * Get paginated list of audit logs with optional filters
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const {
    dateFrom,
    dateTo,
    userId,
    action,
    resource,
    outcome,
    page = 1,
    limit = 50,
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) {
      where.timestamp.gte = dateFrom;
    }
    if (dateTo) {
      where.timestamp.lte = dateTo;
    }
  }

  if (userId !== undefined) {
    where.user_id = userId;
  }

  if (action) {
    where.action = { contains: action };
  }

  if (resource) {
    where.resource = { contains: resource };
  }

  if (outcome) {
    where.outcome = outcome;
  }

  // Get total count for pagination
  const total = await db.audit_logs.count({ where });

  // Get audit logs with pagination
  const logs = await db.audit_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      timestamp: true,
      user_id: true,
      username: true,
      action: true,
      resource: true,
      resource_id: true,
      changes: true,
      ip: true,
      user_agent: true,
      outcome: true,
    },
  });

  // Transform data
  const transformedLogs: AuditLogEntry[] = logs.map(log => ({
    id: log.id.toString(),
    timestamp: log.timestamp,
    userId: log.user_id,
    username: log.username,
    action: log.action,
    resource: log.resource,
    resourceId: log.resource_id,
    changes: log.changes ? parseChanges(log.changes) : null,
    ip: log.ip,
    userAgent: log.user_agent,
    outcome: log.outcome as 'success' | 'failure',
  }));

  return {
    logs: transformedLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get audit log entry by ID with full details
 */
export async function getAuditLogById(logId: string) {
  const log = await db.audit_logs.findUnique({
    where: { id: BigInt(logId) },
    select: {
      id: true,
      timestamp: true,
      user_id: true,
      username: true,
      action: true,
      resource: true,
      resource_id: true,
      changes: true,
      ip: true,
      user_agent: true,
      outcome: true,
    },
  });

  if (!log) {
    return null;
  }

  return {
    id: log.id.toString(),
    timestamp: log.timestamp,
    userId: log.user_id,
    username: log.username,
    action: log.action,
    resource: log.resource,
    resourceId: log.resource_id,
    changes: log.changes ? parseChanges(log.changes) : null,
    ip: log.ip,
    userAgent: log.user_agent,
    outcome: log.outcome as 'success' | 'failure',
  };
}

/**
 * Export audit logs in specified format (CSV, JSON, or Excel)
 */
export async function exportAuditLogs(
  filters: AuditLogFilters = {},
  format: 'csv' | 'json' | 'excel' = 'csv'
): Promise<string | Buffer> {
  const {
    dateFrom,
    dateTo,
    userId,
    action,
    resource,
    outcome,
  } = filters;

  // Build where clause (same as getAuditLogs but without pagination)
  const where: any = {};

  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) {
      where.timestamp.gte = dateFrom;
    }
    if (dateTo) {
      where.timestamp.lte = dateTo;
    }
  }

  if (userId !== undefined) {
    where.user_id = userId;
  }

  if (action) {
    where.action = { contains: action };
  }

  if (resource) {
    where.resource = { contains: resource };
  }

  if (outcome) {
    where.outcome = outcome;
  }

  // Get all matching logs (limit to 10000 for safety)
  const logs = await db.audit_logs.findMany({
    where,
    take: 10000,
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      timestamp: true,
      user_id: true,
      username: true,
      action: true,
      resource: true,
      resource_id: true,
      changes: true,
      ip: true,
      user_agent: true,
      outcome: true,
    },
  });

  // Transform logs to export format
  const exportData = logs.map(log => ({
    id: log.id.toString(),
    timestamp: log.timestamp.toISOString(),
    userId: log.user_id?.toString() || '',
    username: log.username || '',
    action: log.action,
    resource: log.resource,
    resourceId: log.resource_id || '',
    changes: log.changes ? parseChanges(log.changes) : null,
    ip: log.ip || '',
    userAgent: log.user_agent || '',
    outcome: log.outcome,
  }));

  // Generate output based on format
  switch (format) {
    case 'json':
      return JSON.stringify(exportData, null, 2);

    case 'excel':
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Audit Logs');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Timestamp', key: 'timestamp', width: 25 },
        { header: 'User ID', key: 'userId', width: 10 },
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Action', key: 'action', width: 20 },
        { header: 'Resource', key: 'resource', width: 20 },
        { header: 'Resource ID', key: 'resourceId', width: 20 },
        { header: 'Changes', key: 'changes', width: 40 },
        { header: 'IP Address', key: 'ip', width: 15 },
        { header: 'User Agent', key: 'userAgent', width: 30 },
        { header: 'Outcome', key: 'outcome', width: 10 },
      ];

      exportData.forEach(log => {
        worksheet.addRow({
          id: log.id,
          timestamp: log.timestamp,
          userId: log.userId,
          username: log.username,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          changes: log.changes ? JSON.stringify(log.changes) : '',
          ip: log.ip,
          userAgent: log.userAgent,
          outcome: log.outcome,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    case 'csv':
    default:
      const headers = [
        'ID',
        'Timestamp',
        'User ID',
        'Username',
        'Action',
        'Resource',
        'Resource ID',
        'Changes',
        'IP Address',
        'User Agent',
        'Outcome',
      ];

      const rows = exportData.map(log => [
        log.id,
        log.timestamp,
        log.userId,
        log.username,
        log.action,
        log.resource,
        log.resourceId,
        log.changes ? JSON.stringify(log.changes) : '',
        log.ip,
        log.userAgent,
        log.outcome,
      ]);

      // Build CSV string
      const csvLines = [
        headers.join(','),
        ...rows.map(row => row.map(cell => escapeCSV(cell)).join(',')),
      ];

      return csvLines.join('\n');
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(filters: { dateFrom?: Date; dateTo?: Date } = {}) {
  const { dateFrom, dateTo } = filters;

  const where: any = {};

  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) {
      where.timestamp.gte = dateFrom;
    }
    if (dateTo) {
      where.timestamp.lte = dateTo;
    }
  }

  // Get total count
  const totalLogs = await db.audit_logs.count({ where });

  // Get success/failure counts
  const successCount = await db.audit_logs.count({
    where: { ...where, outcome: 'success' },
  });

  const failureCount = await db.audit_logs.count({
    where: { ...where, outcome: 'failure' },
  });

  // Get top actions
  const pool = getPool();
  const whereClause = buildWhereClause(dateFrom, dateTo);
  
  const [topActionsRows]: any = await pool.query(
    `SELECT action, COUNT(*) as count 
     FROM audit_logs 
     ${whereClause}
     GROUP BY action 
     ORDER BY count DESC 
     LIMIT 10`
  );

  const topActions = topActionsRows.map((row: any) => ({
    action: row.action,
    count: Number(row.count),
  }));

  // Get top users
  const [topUsersRows]: any = await pool.query(
    `SELECT user_id, username, COUNT(*) as count 
     FROM audit_logs 
     ${whereClause}
     GROUP BY user_id, username 
     ORDER BY count DESC 
     LIMIT 10`
  );

  const topUsers = topUsersRows.map((row: any) => ({
    userId: row.user_id,
    username: row.username,
    count: Number(row.count),
  }));

  // Get top resources
  const [topResourcesRows]: any = await pool.query(
    `SELECT resource, COUNT(*) as count 
     FROM audit_logs 
     ${whereClause}
     GROUP BY resource 
     ORDER BY count DESC 
     LIMIT 10`
  );

  const topResources = topResourcesRows.map((row: any) => ({
    resource: row.resource,
    count: Number(row.count),
  }));

  return {
    totalLogs,
    successCount,
    failureCount,
    successRate: totalLogs > 0 ? (successCount / totalLogs) * 100 : 0,
    topActions,
    topUsers,
    topResources,
  };
}

/**
 * Helper function to parse changes JSON string
 */
function parseChanges(changesStr: string): any {
  try {
    return JSON.parse(changesStr);
  } catch (error) {
    // If parsing fails, return the raw string
    return changesStr;
  }
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Helper function to build WHERE clause for raw SQL queries
 */
function buildWhereClause(dateFrom?: Date, dateTo?: Date): string {
  const conditions: string[] = [];

  if (dateFrom) {
    conditions.push(`timestamp >= '${dateFrom.toISOString()}'`);
  }

  if (dateTo) {
    conditions.push(`timestamp <= '${dateTo.toISOString()}'`);
  }

  if (conditions.length === 0) {
    return '';
  }

  return `WHERE ${conditions.join(' AND ')}`;
}
