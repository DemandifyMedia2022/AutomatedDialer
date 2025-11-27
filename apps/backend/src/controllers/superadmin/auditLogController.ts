import { Request, Response, NextFunction } from 'express';
import * as auditLogService from '../../services/superadmin/auditLogService';
import { z } from 'zod';

/**
 * Audit log controller for superadmin dashboard
 */

// Validation schemas
const GetAuditLogsQuerySchema = z.object({
  dateFrom: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  dateTo: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  userId: z.string().optional().transform(val => (val ? parseInt(val, 10) : undefined)),
  action: z.string().optional(),
  resource: z.string().optional(),
  outcome: z.enum(['success', 'failure']).optional(),
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 50)),
});

const ExportAuditLogsSchema = z.object({
  format: z.enum(['csv', 'json', 'excel']).default('csv'),
  filters: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: z.number().optional(),
    action: z.string().optional(),
    resource: z.string().optional(),
    outcome: z.enum(['success', 'failure']).optional(),
  }).optional(),
});

const GetStatsQuerySchema = z.object({
  dateFrom: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  dateTo: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
});

/**
 * GET /api/superadmin/audit/logs
 * Get paginated list of audit logs with optional filters
 */
export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetAuditLogsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const result = await auditLogService.getAuditLogs(parsed.data);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/superadmin/audit/logs/:id
 * Get audit log entry by ID with full details
 */
export async function getAuditLogById(req: Request, res: Response, next: NextFunction) {
  try {
    const logId = req.params.id;

    if (!logId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log ID',
      });
    }

    const log = await auditLogService.getAuditLogById(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log entry not found',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/superadmin/audit/export
 * Export audit logs in specified format (CSV, JSON, or Excel)
 */
export async function exportAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ExportAuditLogsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const { format, filters } = parsed.data;
    
    // Transform filters to match service interface
    const serviceFilters = filters ? {
      dateFrom: filters.startDate ? new Date(filters.startDate) : undefined,
      dateTo: filters.endDate ? new Date(filters.endDate) : undefined,
      userId: filters.userId,
      action: filters.action,
      resource: filters.resource,
      outcome: filters.outcome,
    } : {};

    const result = await auditLogService.exportAuditLogs(serviceFilters, format);

    // Set headers based on format
    const timestamp = new Date().toISOString().split('T')[0];
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        contentType = 'application/json';
        filename = `audit-logs-${timestamp}.json`;
        break;
      case 'excel':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `audit-logs-${timestamp}.xlsx`;
        break;
      case 'csv':
      default:
        contentType = 'text/csv';
        filename = `audit-logs-${timestamp}.csv`;
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/superadmin/audit/stats
 * Get audit log statistics
 */
export async function getAuditLogStats(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetStatsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const stats = await auditLogService.getAuditLogStats(parsed.data);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
