import { Router } from 'express';
import { getRecentActivityController } from '../../controllers/superadmin/activityFeedController';

const router = Router();

/**
 * GET /api/superadmin/activity/recent
 * Get recent activity events for initial load
 * Query params:
 * - limit: number (default: 100)
 * - type: comma-separated event types (auth,api,database,error)
 * - severity: comma-separated severity levels (info,warning,error,critical)
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/recent', getRecentActivityController);

export default router;
