import { Request, Response } from 'express';
import { getRecentActivity } from '../../services/superadmin/activityFeedService';

/**
 * Get recent activity events for initial load
 * GET /api/superadmin/activity/recent
 */
export async function getRecentActivityController(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const type = req.query.type as string | undefined;
    const severity = req.query.severity as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Build filters
    const filters: any = {};
    
    if (type) {
      filters.type = type.split(',').map(t => t.trim());
    }
    
    if (severity) {
      filters.severity = severity.split(',').map(s => s.trim());
    }
    
    if (startDate) {
      filters.startDate = startDate;
    }
    
    if (endDate) {
      filters.endDate = endDate;
    }

    const activities = await getRecentActivity(limit, filters);

    res.json({
      success: true,
      data: activities,
      count: activities.length
    });
  } catch (error) {
    console.error('[ActivityFeed] Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
}
