// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import * as organizationService from '../../services/superadmin/organizationService';
import { z } from 'zod';

/**
 * Organization management controller for superadmin dashboard
 */

// Validation schemas
const GetOrganizationsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
});

const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required'),
  status: z.enum(['active', 'inactive', 'suspended']).optional().default('active'),
  is_demo: z.boolean().optional().default(false),
  valid_until: z.string().datetime().optional().nullable(),
  max_users: z.number().int().positive().optional().default(10),
  contact_email: z.string().email().optional().nullable(),
  billing_info: z.string().optional().nullable(),
});

const UpdateOrganizationSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  is_demo: z.boolean().optional(),
  valid_until: z.string().datetime().optional().nullable(),
  max_users: z.number().int().positive().optional(),
  contact_email: z.string().email().optional().nullable(),
  billing_info: z.string().optional().nullable(),
});

/**
 * GET /api/superadmin/organizations
 * Get paginated list of organizations with optional filters
 */
export async function getOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = GetOrganizationsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const result = await organizationService.getOrganizations(parsed.data);

    res.json({
      success: true,
      data: {
        organizations: result.organizations,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/superadmin/organizations/:id
 * Get organization details by ID
 */
export async function getOrganizationById(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = parseInt(req.params.id, 10);

    if (!Number.isFinite(organizationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization ID',
      });
    }

    const organization = await organizationService.getOrganizationById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/superadmin/organizations
 * Create a new organization
 */
export async function createOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateOrganizationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const organization = await organizationService.createOrganization(parsed.data);

    res.status(201).json({
      success: true,
      data: organization,
      message: 'Organization created successfully',
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * PUT /api/superadmin/organizations/:id
 * Update organization information
 */
export async function updateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = parseInt(req.params.id, 10);

    if (!Number.isFinite(organizationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization ID',
      });
    }

    const parsed = UpdateOrganizationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: parsed.error.flatten(),
      });
    }

    const organization = await organizationService.updateOrganization(organizationId, parsed.data);

    res.json({
      success: true,
      data: organization,
      message: 'Organization updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'Organization not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * GET /api/superadmin/organizations/list
 * Get all active organizations for dropdown/selection purposes
 */
export async function getOrganizationsList(req: Request, res: Response, next: NextFunction) {
  try {
    const organizations = await organizationService.getAllOrganizations();

    res.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/superadmin/organizations/:id
 * Delete an organization
 */
export async function deleteOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = parseInt(req.params.id, 10);

    if (!Number.isFinite(organizationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization ID',
      });
    }

    await organizationService.deleteOrganization(organizationId);

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Organization not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('has users')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}