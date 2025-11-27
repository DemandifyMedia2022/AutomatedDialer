import { Router } from 'express';
import {
  getCurrentHealth,
  getHealthHistory,
  getPoolStats,
} from '../../controllers/superadmin/systemHealthController';

const router = Router();

/**
 * System health monitoring routes
 */

// GET /api/superadmin/system/health - Get current system health
router.get('/health', getCurrentHealth);

// GET /api/superadmin/system/health/history - Get historical health data
router.get('/health/history', getHealthHistory);

// GET /api/superadmin/system/health/pool - Get database pool statistics
router.get('/health/pool', getPoolStats);

export default router;
