import { Request, Response, NextFunction } from 'express';
import * as organizationAwareService from '../services/organizationAwareService';
import { z } from 'zod';

/**
 * Controller for organization-aware data endpoints
 * Provides leaderboards, statistics, and other data filtered by organization
 */

// Validation schemas
const LeaderboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 10)),
});

const CampaignStatsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  campaignId: z.string().optional().transform(val => (val ? parseInt(val, 10) : undefined)),
});

const AgentSessionsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional().transform(val => (val ? parseInt(val, 10) : undefined)),
  isActive: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
});

const CallsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional().transform(val => (val ? parseInt(val, 10) : undefined)),
  campaignName: z.string().optional(),
  disposition: z.string().optional(),
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
});

/**
 * GET /api/data/leaderboard
 * Get agent leaderboard filtered by organization
 */
export async function getLeaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = LeaderboardQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const context = {
      organizationId: req.user?.organizationId || null,
      canAccessAllOrganizations: req.user?.role === 'superadmin',
    };

    const leaderboard = await organizationAwareService.getOrganizationLeaderboard(context, parsed.data);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/data/campaign-stats
 * Get campaign statistics filtered by organization
 */
export async function getCampaignStats(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CampaignStatsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const context = {
      organizationId: req.user?.organizationId || null,
      canAccessAllOrganizations: req.user?.role === 'superadmin',
    };

    const stats = await organizationAwareService.getOrganizationCampaignStats(context, parsed.data);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/data/agent-sessions
 * Get agent sessions filtered by organization
 */
export async function getAgentSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = AgentSessionsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const context = {
      organizationId: req.user?.organizationId || null,
      canAccessAllOrganizations: req.user?.role === 'superadmin',
    };

    const sessions = await organizationAwareService.getOrganizationAgentSessions(context, parsed.data);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/data/calls
 * Get calls filtered by organization
 */
export async function getCalls(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CallsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const context = {
      organizationId: req.user?.organizationId || null,
      canAccessAllOrganizations: req.user?.role === 'superadmin',
    };

    const result = await organizationAwareService.getOrganizationCalls(context, parsed.data);

    res.json({
      success: true,
      data: {
        calls: result.calls,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}