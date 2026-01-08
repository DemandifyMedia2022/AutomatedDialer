// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import * as userManagementService from '../../services/superadmin/userManagementService';
import { z } from 'zod';

/**
 * User management controller for superadmin dashboard
 */

// Validation schemas
const GetUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['agent', 'manager', 'qa', 'superadmin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  organization_id: z.string().optional().transform(val => (val ? parseInt(val, 10) : undefined)),
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
});

const CreateUserSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['agent', 'manager', 'qa', 'superadmin']),
  extension: z.string().trim().optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  is_demo_user: z.boolean().optional(),
  organization_id: z.number().int().positive().optional().nullable(),
});

const UpdateUserSchema = z.object({
  username: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['agent', 'manager', 'qa', 'superadmin']).optional(),
  extension: z.string().trim().optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  password: z.string().min(6).optional(),
  is_demo_user: z.boolean().optional(),
  organization_id: z.number().int().positive().optional().nullable(),
});

const UpdateUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
});

const AssignRoleSchema = z.object({
  role: z.enum(['agent', 'manager', 'qa', 'superadmin']),
});

/**
 * GET /api/superadmin/users
 * Get paginated list of users with optional filters
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetUsersQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const result = await userManagementService.getUsers(parsed.data, {
      role: req.user?.role,
      organizationId: req.user?.organizationId,
    });

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
 * GET /api/superadmin/users/:id
 * Get user details by ID
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const user = await userManagementService.getUserById(userId, {
      role: req.user?.role,
      organizationId: req.user?.organizationId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/superadmin/users
 * Create a new user
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const user = await userManagementService.createUser(parsed.data);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('Organization')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * PUT /api/superadmin/users/:id
 * Update user information
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const parsed = UpdateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const user = await userManagementService.updateUser(userId, parsed.data);

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes('already in use') ||
      error.message.includes('Extension') ||
      error.message.includes('Organization') ||
      error.message.includes('superadmin')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * DELETE /api/superadmin/users/:id
 * Delete a user
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    await userManagementService.deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('superadmin')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * PATCH /api/superadmin/users/:id/status
 * Update user status
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const parsed = UpdateUserStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const user = await userManagementService.updateUserStatus(userId, parsed.data.status);

    res.json({
      success: true,
      data: user,
      message: 'User status updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('superadmin')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * PATCH /api/superadmin/users/:id/role
 * Assign role to user
 */
export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const parsed = AssignRoleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const user = await userManagementService.assignRole(userId, parsed.data.role);

    res.json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('superadmin')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}
