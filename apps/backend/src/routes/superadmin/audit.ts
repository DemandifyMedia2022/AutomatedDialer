import { Router } from 'express';
import * as auditLogController from '../../controllers/superadmin/auditLogController';

const router = Router();

/**
 * Audit log routes for superadmin dashboard
 * All routes are protected by requireAuth and requireSuperadmin middlewares
 * applied in the parent router (superadmin/index.ts)
 */

/**
 * GET /api/superadmin/audit/logs
 * Get paginated list of audit logs with optional filters
 * Query params: dateFrom, dateTo, userId, action, resource, outcome, page, limit
 */
router.get('/logs', auditLogController.getAuditLogs);

/**
 * GET /api/superadmin/audit/logs/:id
 * Get audit log entry by ID with full details
 */
router.get('/logs/:id', auditLogController.getAuditLogById);

/**
 * POST /api/superadmin/audit/export
 * Export audit logs to CSV format
 * Body: dateFrom, dateTo, userId, action, resource, outcome
 */
router.post('/export', auditLogController.exportAuditLogs);

/**
 * GET /api/superadmin/audit/stats
 * Get audit log statistics
 * Query params: dateFrom, dateTo
 */
router.get('/stats', auditLogController.getAuditLogStats);

export default router;
