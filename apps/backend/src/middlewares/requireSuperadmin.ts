import { NextFunction, Request, Response } from 'express';
import { requireAuth } from './auth';

/**
 * Middleware to require superadmin role
 * Must be used after requireAuth middleware
 * 
 * Usage:
 * router.get('/api/superadmin/users', requireAuth, requireSuperadmin, handler);
 */
export function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  // Check if user has superadmin role
  const role = (req.user.role || '').toLowerCase();
  if (role !== 'superadmin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden: Superadmin access required' 
    });
  }

  next();
}
