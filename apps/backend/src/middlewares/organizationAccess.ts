import { NextFunction, Request, Response } from 'express';
import { db } from '../db/prisma';

/**
 * Middleware to ensure users can only access resources from their own organization
 * Superadmins can access all organizations
 */
export function requireOrganizationAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Superadmins can access everything
      if (user.role === 'superadmin') {
        return next();
      }

      // For non-superadmin users, ensure they have an organization
      if (!user.organizationId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: User not assigned to an organization' 
        });
      }

      // Add organization context to request for use in controllers
      req.organizationContext = {
        organizationId: user.organizationId,
        canAccessAllOrganizations: user.role === 'superadmin',
      };

      next();
    } catch (error) {
      console.error('Organization access middleware error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}

/**
 * Middleware to validate that a user can access a specific organization resource
 * Used for endpoints that take organization_id as a parameter
 */
export function validateOrganizationAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Superadmins can access any organization
      if (user.role === 'superadmin') {
        return next();
      }

      // Get organization ID from request (could be in params, body, or query)
      const targetOrgId = parseInt(req.params.organizationId || req.body.organization_id || req.query.organization_id as string);

      if (!targetOrgId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Organization ID is required' 
        });
      }

      // Non-superadmin users can only access their own organization
      if (user.organizationId !== targetOrgId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: Cannot access resources from other organizations' 
        });
      }

      next();
    } catch (error) {
      console.error('Organization validation middleware error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    organizationContext?: {
      organizationId: number | null;
      canAccessAllOrganizations: boolean;
    };
  }
}