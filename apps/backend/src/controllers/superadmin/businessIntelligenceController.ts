import { Request, Response } from 'express';
import {
  calculateBusinessMetrics,
  calculateUserGrowthMetrics,
  calculateFeatureAdoption,
  calculateConversionFunnel,
  calculatePlatformUsageMetrics,
} from '../../services/superadmin/businessIntelligenceService';

/**
 * Parse time range from query parameters
 * Supports: 24h, 7d, 30d, 90d, or custom start/end dates
 */
function parseTimeRange(req: Request): { startDate: Date; endDate: Date } {
  const { range, startDate, endDate } = req.query;
  
  const now = new Date();
  let start: Date;
  let end: Date = now;
  
  if (startDate && endDate) {
    // Custom date range
    start = new Date(startDate as string);
    end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
  } else if (range) {
    // Predefined range
    switch (range) {
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        throw new Error('Invalid range. Use 24h, 7d, 30d, 90d, or 1y');
    }
  } else {
    // Default to last 30 days
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate: start, endDate: end };
}

/**
 * GET /api/superadmin/analytics/business/metrics
 * Get comprehensive business metrics including revenue, user growth, and platform usage
 */
export async function getBusinessMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const metrics = await calculateBusinessMetrics(startDate, endDate);
    
    res.json({
      success: true,
      data: {
        metrics,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting business metrics:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get business metrics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/business/growth
 * Get user growth metrics over time with granularity options
 */
export async function getUserGrowth(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    const { granularity = 'day' } = req.query;
    
    // Validate granularity
    if (!['day', 'week', 'month'].includes(granularity as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid granularity. Use day, week, or month',
      });
    }
    
    const growthMetrics = await calculateUserGrowthMetrics(
      startDate,
      endDate,
      granularity as 'day' | 'week' | 'month'
    );
    
    // Calculate summary statistics
    const totalNewUsers = growthMetrics.reduce((sum, m) => sum + m.newUsers, 0);
    const avgChurnRate = growthMetrics.length > 0
      ? growthMetrics.reduce((sum, m) => sum + m.churnRate, 0) / growthMetrics.length
      : 0;
    const latestMetrics = growthMetrics[growthMetrics.length - 1];
    
    res.json({
      success: true,
      data: {
        growthMetrics,
        summary: {
          totalNewUsers,
          avgChurnRate: Math.round(avgChurnRate * 100) / 100,
          currentTotalUsers: latestMetrics?.totalUsers || 0,
          currentActiveUsers: latestMetrics?.activeUsers || 0,
        },
        period: {
          startDate,
          endDate,
          granularity,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting user growth metrics:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user growth metrics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/business/features
 * Get feature adoption rates and usage statistics
 */
export async function getFeatureAdoption(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const featureAdoption = await calculateFeatureAdoption(startDate, endDate);
    
    // Calculate overall adoption statistics
    const avgAdoptionRate = featureAdoption.length > 0
      ? featureAdoption.reduce((sum, f) => sum + f.adoptionRate, 0) / featureAdoption.length
      : 0;
    
    const mostAdoptedFeature = featureAdoption.reduce((max, f) => 
      f.adoptionRate > max.adoptionRate ? f : max,
      featureAdoption[0] || { featureName: 'None', adoptionRate: 0 }
    );
    
    const leastAdoptedFeature = featureAdoption.reduce((min, f) => 
      f.adoptionRate < min.adoptionRate ? f : min,
      featureAdoption[0] || { featureName: 'None', adoptionRate: 0 }
    );
    
    res.json({
      success: true,
      data: {
        features: featureAdoption,
        summary: {
          avgAdoptionRate: Math.round(avgAdoptionRate * 100) / 100,
          mostAdoptedFeature: mostAdoptedFeature.featureName,
          leastAdoptedFeature: leastAdoptedFeature.featureName,
          totalFeatures: featureAdoption.length,
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting feature adoption:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get feature adoption metrics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/business/funnel
 * Get conversion funnel metrics from registration to active user
 */
export async function getConversionFunnel(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const funnelMetrics = await calculateConversionFunnel(startDate, endDate);
    
    // Calculate overall conversion rate (from registration to active user)
    const overallConversionRate = funnelMetrics.length > 0 && funnelMetrics[0].userCount > 0
      ? (funnelMetrics[funnelMetrics.length - 1].userCount / funnelMetrics[0].userCount) * 100
      : 0;
    
    res.json({
      success: true,
      data: {
        funnel: funnelMetrics,
        summary: {
          overallConversionRate: Math.round(overallConversionRate * 100) / 100,
          totalRegistrations: funnelMetrics[0]?.userCount || 0,
          activeUsers: funnelMetrics[funnelMetrics.length - 1]?.userCount || 0,
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting conversion funnel:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get conversion funnel metrics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/business/usage
 * Get detailed platform usage metrics
 */
export async function getPlatformUsage(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const usageMetrics = await calculatePlatformUsageMetrics(startDate, endDate);
    
    res.json({
      success: true,
      data: {
        usage: usageMetrics,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting platform usage:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get platform usage metrics',
    });
  }
}
