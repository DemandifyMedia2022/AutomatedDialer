import { Router } from 'express';
import {
  getFeatureUsageStats,
  getUserEngagementMetrics,
  getUserJourneyAnalytics,
  getCohortAnalysis,
} from '../../controllers/superadmin/usageAnalyticsController';

const router = Router();

/**
 * GET /api/superadmin/analytics/usage/features
 * Get feature usage statistics
 */
router.get('/features', getFeatureUsageStats);

/**
 * GET /api/superadmin/analytics/usage/engagement
 * Get user engagement metrics
 */
router.get('/engagement', getUserEngagementMetrics);

/**
 * GET /api/superadmin/analytics/usage/journey
 * Get user journey analytics
 */
router.get('/journey', getUserJourneyAnalytics);

/**
 * GET /api/superadmin/analytics/usage/cohorts
 * Get cohort analysis
 */
router.get('/cohorts', getCohortAnalysis);

export default router;
