import { Router } from 'express';
import * as userManagementController from '../../controllers/superadmin/userManagementController';
import { auditLogger } from '../../middlewares/auditLogger';

const router = Router();

/**
 * User management routes for superadmin dashboard
 * All routes are protected by requireAuth and requireSuperadmin middlewares
 * applied in the parent router (superadmin/index.ts)
 */

/**
 * GET /api/superadmin/users
 * Get paginated list of users with optional filters
 * Query params: search, role, status, page, limit
 */
router.get('/', userManagementController.getUsers);

/**
 * GET /api/superadmin/users/:id
 * Get user details by ID
 */
router.get('/:id', userManagementController.getUserById);

/**
 * POST /api/superadmin/users
 * Create a new user
 */
router.post(
  '/',
  auditLogger('CREATE_USER', 'users'),
  userManagementController.createUser
);

/**
 * PUT /api/superadmin/users/:id
 * Update user information
 */
router.put(
  '/:id',
  auditLogger('UPDATE_USER', 'users'),
  userManagementController.updateUser
);

/**
 * DELETE /api/superadmin/users/:id
 * Delete a user
 */
router.delete(
  '/:id',
  auditLogger('DELETE_USER', 'users'),
  userManagementController.deleteUser
);

/**
 * PATCH /api/superadmin/users/:id/status
 * Update user status (active, inactive, suspended)
 */
router.patch(
  '/:id/status',
  auditLogger('UPDATE_USER_STATUS', 'users'),
  userManagementController.updateUserStatus
);

/**
 * PATCH /api/superadmin/users/:id/role
 * Assign role to user
 */
router.patch(
  '/:id/role',
  auditLogger('UPDATE_USER_ROLE', 'users'),
  userManagementController.assignRole
);

export default router;
