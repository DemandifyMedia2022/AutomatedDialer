import { Request, Response } from 'express';
import {
  calculateFeatureUsageStats,
  calculateUserEngagementMetrics,
  calculateUserJourneyAnalytics,
  calculateCohortAnalysis,
} from '../../services/superadmin/usageAnalyticsService';

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
 * GET /api/superadmin/analytics/usage/features
 * Get feature usage statistics showing daily active users and interaction counts
 */
export async function getFeatureUsageStats(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const featureStats = await calculateFeatureUsageStats(startDate, endDate);
    
    // Calculate summary statistics
    const totalInteractions = featureStats.reduce((sum, f) => sum + f.totalInteractions, 0);
    const avgGrowthRate = featureStats.length > 0
      ? featureStats.reduce((sum, f) => sum + f.growthRate, 0) / featureStats.length
      : 0;
    
    const mostUsedFeature = featureStats.reduce((max, f) => 
      f.totalInteractions > max.totalInteractions ? f : max,
      featureStats[0] || { featureName: 'None', totalInteractions: 0 }
    );
    
    const fastestGrowingFeature = featureStats.reduce((max, f) => 
      f.growthRate > max.growthRate ? f : max,
      featureStats[0] || { featureName: 'None', growthRate: 0 }
    );
    
    res.json({
      success: true,
      data: {
        features: featureStats,
        summary: {
          totalInteractions,
          avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
          mostUsedFeature: mostUsedFeature.featureName,
          fastestGrowingFeature: fastestGrowingFeature.featureName,
          totalFeatures: featureStats.length,
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting feature usage stats:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get feature usage statistics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/usage/engagement
 * Get user engagement metrics including session duration and interaction frequency
 */
export async function getUserEngagementMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const engagementMetrics = await calculateUserEngagementMetrics(startDate, endDate);
    
    // Calculate engagement score (0-100)
    // Based on session duration, sessions per user, and feature interactions
    const sessionScore = Math.min((engagementMetrics.avgSessionDuration / 3600) * 20, 20); // Max 20 points for 1 hour avg
    const frequencyScore = Math.min(engagementMetrics.sessionsPerUser * 10, 30); // Max 30 points for 3+ sessions
    const interactionScore = Math.min(engagementMetrics.avgCallsPerSession * 10, 30); // Max 30 points for 3+ calls
    const featureScore = Object.keys(engagementMetrics.featureInteractionFrequency).length * 4; // 4 points per feature used
    
    const engagementScore = Math.min(
      Math.round(sessionScore + frequencyScore + interactionScore + featureScore),
      100
    );
    
    res.json({
      success: true,
      data: {
        engagement: engagementMetrics,
        engagementScore,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting user engagement metrics:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user engagement metrics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/usage/journey
 * Get user journey analytics showing common navigation paths
 */
export async function getUserJourneyAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const journeySteps = await calculateUserJourneyAnalytics(startDate, endDate);
    
    // Calculate overall conversion rate
    const overallConversionRate = journeySteps.length > 0 && journeySteps[0].userCount > 0
      ? (journeySteps[journeySteps.length - 1].userCount / journeySteps[0].userCount) * 100
      : 0;
    
    // Find biggest drop-off point
    let biggestDropoff = { step: 'None', dropoffRate: 0 };
    for (let i = 1; i < journeySteps.length; i++) {
      const dropoffRate = 100 - journeySteps[i].completionRate;
      if (dropoffRate > biggestDropoff.dropoffRate) {
        biggestDropoff = {
          step: journeySteps[i].step,
          dropoffRate: Math.round(dropoffRate * 100) / 100,
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        journey: journeySteps,
        summary: {
          overallConversionRate: Math.round(overallConversionRate * 100) / 100,
          totalRegistrations: journeySteps[0]?.userCount || 0,
          activeUsers: journeySteps[journeySteps.length - 1]?.userCount || 0,
          biggestDropoffStep: biggestDropoff.step,
          biggestDropoffRate: biggestDropoff.dropoffRate,
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting user journey analytics:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user journey analytics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/usage/cohorts
 * Get cohort analysis showing user retention rates by registration date
 */
export async function getCohortAnalysis(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const cohorts = await calculateCohortAnalysis(startDate, endDate);
    
    // Calculate average retention rates across all cohorts
    const avgRetention = {
      week1: 0,
      week2: 0,
      week4: 0,
      week8: 0,
    };
    
    if (cohorts.length > 0) {
      for (const cohort of cohorts) {
        avgRetention.week1 += cohort.retentionRates.week1;
        avgRetention.week2 += cohort.retentionRates.week2;
        avgRetention.week4 += cohort.retentionRates.week4;
        avgRetention.week8 += cohort.retentionRates.week8;
      }
      
      avgRetention.week1 = Math.round((avgRetention.week1 / cohorts.length) * 100) / 100;
      avgRetention.week2 = Math.round((avgRetention.week2 / cohorts.length) * 100) / 100;
      avgRetention.week4 = Math.round((avgRetention.week4 / cohorts.length) * 100) / 100;
      avgRetention.week8 = Math.round((avgRetention.week8 / cohorts.length) * 100) / 100;
    }
    
    // Calculate average churn rate
    const avgChurnRate = cohorts.length > 0
      ? cohorts.reduce((sum, c) => sum + c.churnRate, 0) / cohorts.length
      : 0;
    
    // Find best and worst performing cohorts
    const bestCohort = cohorts.reduce((best, c) => 
      c.retentionRates.week8 > best.retentionRates.week8 ? c : best,
      cohorts[0] || { cohortDate: new Date(), retentionRates: { week8: 0 } }
    );
    
    const worstCohort = cohorts.reduce((worst, c) => 
      c.retentionRates.week8 < worst.retentionRates.week8 ? c : worst,
      cohorts[0] || { cohortDate: new Date(), retentionRates: { week8: 0 } }
    );
    
    res.json({
      success: true,
      data: {
        cohorts,
        summary: {
          totalCohorts: cohorts.length,
          avgRetentionRates: avgRetention,
          avgChurnRate: Math.round(avgChurnRate * 100) / 100,
          bestPerformingCohort: bestCohort.cohortDate,
          worstPerformingCohort: worstCohort.cohortDate,
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting cohort analysis:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get cohort analysis',
    });
  }
}
