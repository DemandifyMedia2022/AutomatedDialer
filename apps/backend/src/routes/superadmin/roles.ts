import { Router } from 'express';
import * as roleManagementController from '../../controllers/superadmin/roleManagementController';
import { auditLogger } from '../../middlewares/auditLogger';

const router = Router();

/**
 * Role management routes for superadmin dashboard
 * All routes are protected by requireAuth and requireSuperadmin middlewares
 * applied in the parent router (superadmin/index.ts)
 */

/**
 * GET /api/superadmin/roles
 * Get all roles with their permissions and user counts
 */
router.get('/', roleManagementController.getAllRoles);

/**
 * GET /api/superadmin/roles/permissions/available
 * Get all available resources and actions for permission configuration
 * Note: This route must come before /:role to avoid route conflicts
 */
router.get('/permissions/available', roleManagementController.getAvailablePermissions);

/**
 * GET /api/superadmin/roles/:role
 * Get a specific role with its permissions and user count
 */
router.get('/:role', roleManagementController.getRoleByName);

/**
 * GET /api/superadmin/roles/:role/users
 * Get users assigned to a specific role
 * Query params: page, limit
 */
router.get('/:role/users', roleManagementController.getUsersByRole);

/**
 * PUT /api/superadmin/roles/:role/permissions
 * Update permissions for a role
 */
router.put(
  '/:role/permissions',
  auditLogger('UPDATE_ROLE_PERMISSIONS', 'roles'),
  roleManagementController.updateRolePermissions
);

export default router;
