import { Router } from 'express';
import * as organizationDataController from '../controllers/organizationDataController';
import { requireAuth } from '../middlewares/auth';
import { requireOrganizationAccess } from '../middlewares/organizationAccess';

const router = Router();

// All data routes require authentication
router.use(requireAuth);
router.use(requireOrganizationAccess());

// Organization-aware data endpoints
router.get('/leaderboard', organizationDataController.getLeaderboard);
router.get('/campaign-stats', organizationDataController.getCampaignStats);
router.get('/agent-sessions', organizationDataController.getAgentSessions);
router.get('/calls', organizationDataController.getCalls);

export default router;