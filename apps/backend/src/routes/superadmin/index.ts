import { Router } from 'express';
import { requireAuth, requireSuperadmin } from '../../middlewares';
import systemRoutes from './system';
import analyticsRoutes from './analytics';
import usersRoutes from './users';
import rolesRoutes from './roles';
import activityRoutes from './activity';
import auditRoutes from './audit';

const router = Router();

/**
 * All superadmin routes require authentication and superadmin role
 * Apply these middlewares to all routes in this router
 */
router.use(requireAuth);
router.use(requireSuperadmin);

/**
 * Mount route modules
 */
router.use('/system', systemRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/activity', activityRoutes);
router.use('/audit', auditRoutes);

/**
 * TODO: Import and mount additional superadmin route modules:
 * - Configuration routes
 * - etc.
 * 
 * Example:
 * import configRoutes from './config';
 * router.use('/config', configRoutes);
 */

export default router;
