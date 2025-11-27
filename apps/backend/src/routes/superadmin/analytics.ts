import { Router } from 'express';
import {
  getEndpoints,
  getRequests,
  getErrors,
} from '../../controllers/superadmin/apiAnalyticsController';
import {
  getBusinessMetrics,
  getUserGrowth,
  getFeatureAdoption,
  getConversionFunnel,
  getPlatformUsage,
} from '../../controllers/superadmin/businessIntelligenceController';
import usageRoutes from './usage';

const router = Router();

/**
 * API analytics routes
 */

// GET /api/superadmin/analytics/api/endpoints - Get API endpoint metrics
router.get('/api/endpoints', getEndpoints);

// GET /api/superadmin/analytics/api/requests - Get API request logs
router.get('/api/requests', getRequests);

// GET /api/superadmin/analytics/api/errors - Get API error analysis
router.get('/api/errors', getErrors);

/**
 * Business intelligence routes
 */

// GET /api/superadmin/analytics/business/metrics - Get comprehensive business metrics
router.get('/business/metrics', getBusinessMetrics);

// GET /api/superadmin/analytics/business/growth - Get user growth metrics over time
router.get('/business/growth', getUserGrowth);

// GET /api/superadmin/analytics/business/features - Get feature adoption rates
router.get('/business/features', getFeatureAdoption);

// GET /api/superadmin/analytics/business/funnel - Get conversion funnel metrics
router.get('/business/funnel', getConversionFunnel);

// GET /api/superadmin/analytics/business/usage - Get platform usage metrics
router.get('/business/usage', getPlatformUsage);

/**
 * Platform usage analytics routes
 */
router.use('/usage', usageRoutes);

export default router;
