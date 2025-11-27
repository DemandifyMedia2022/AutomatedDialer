import { Request, Response, NextFunction } from 'express';
import * as roleManagementService from '../../services/superadmin/roleManagementService';
import { z } from 'zod';

/**
 * Role management controller for superadmin dashboard
 */

// Validation schemas
const RoleNameSchema = z.enum(['agent', 'manager', 'qa', 'superadmin']);

const PermissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  actions: z.array(z.enum(['create', 'read', 'update', 'delete'])),
  description: z.string().optional(),
});

const UpdatePermissionsSchema = z.object({
  permissions: z.array(PermissionSchema),
});

const GetUsersByRoleQuerySchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
});

/**
 * GET /api/superadmin/roles
 * Get all roles with their permissions and user counts
 */
export async function getAllRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await roleManagementService.getAllRoles();

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/superadmin/roles/:role
 * Get a specific role with its permissions and user count
 */
export async function getRoleByName(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RoleNameSchema.safeParse(req.params.role);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role name',
        errors: parsed.error.flatten(),
      });
    }

    const role = await roleManagementService.getRoleByName(parsed.data);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/superadmin/roles/:role/users
 * Get users assigned to a specific role
 */
export async function getUsersByRole(req: Request, res: Response, next: NextFunction) {
  try {
    const roleNameParsed = RoleNameSchema.safeParse(req.params.role);

    if (!roleNameParsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role name',
        errors: roleNameParsed.error.flatten(),
      });
    }

    const queryParsed = GetUsersByRoleQuerySchema.safeParse(req.query);

    if (!queryParsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: queryParsed.error.flatten(),
      });
    }

    const result = await roleManagementService.getUsersByRole(
      roleNameParsed.data,
      queryParsed.data.page,
      queryParsed.data.limit
    );

    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/superadmin/roles/:role/permissions
 * Update permissions for a role
 */
export async function updateRolePermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const roleNameParsed = RoleNameSchema.safeParse(req.params.role);

    if (!roleNameParsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role name',
        errors: roleNameParsed.error.flatten(),
      });
    }

    const bodyParsed = UpdatePermissionsSchema.safeParse(req.body);

    if (!bodyParsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: bodyParsed.error.flatten(),
      });
    }

    const updatedRole = await roleManagementService.updateRolePermissions(
      roleNameParsed.data,
      bodyParsed.data.permissions
    );

    res.json({
      success: true,
      data: updatedRole,
      message: 'Role permissions updated successfully',
    });
  } catch (error: any) {
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * GET /api/superadmin/roles/permissions/available
 * Get all available resources and actions for permission configuration
 */
export async function getAvailablePermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const permissions = roleManagementService.getAvailablePermissions();

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
}
