import { Request, Response } from 'express';
import {
  getSystemHealth,
  getDatabasePoolStats,
  calculateUptimeForPeriod,
  storeHealthSnapshot,
} from '../../services/superadmin/systemHealthService';
import { db } from '../../db/prisma';

/**
 * GET /api/superadmin/system/health
 * Get current system health status
 */
export async function getCurrentHealth(req: Request, res: Response) {
  try {
    const health = await getSystemHealth();
    const poolStats = await getDatabasePoolStats();
    
    // Calculate uptime for different periods
    const uptimeDay = await calculateUptimeForPeriod(24 * 60 * 60 * 1000);
    const uptimeWeek = await calculateUptimeForPeriod(7 * 24 * 60 * 60 * 1000);
    const uptimeMonth = await calculateUptimeForPeriod(30 * 24 * 60 * 60 * 1000);
    
    // Store snapshot for historical tracking
    await storeHealthSnapshot(health);
    
    res.json({
      success: true,
      data: {
        ...health,
        poolStats,
        uptime: {
          day: uptimeDay,
          week: uptimeWeek,
          month: uptimeMonth,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get system health',
    });
  }
}

/**
 * GET /api/superadmin/system/health/history
 * Get historical system health data
 */
export async function getHealthHistory(req: Request, res: Response) {
  try {
    const { hours = '24' } = req.query;
    const hoursNum = parseInt(hours as string, 10);
    
    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 720) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hours parameter. Must be between 1 and 720.',
      });
    }
    
    const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
    
    const snapshots = await db.system_health_snapshots.findMany({
      where: {
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      take: 1000, // Limit to prevent excessive data transfer
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedSnapshots = snapshots.map((snapshot: any) => ({
      ...snapshot,
      id: snapshot.id.toString(),
    }));
    
    res.json({
      success: true,
      data: {
        snapshots: serializedSnapshots,
        period: {
          hours: hoursNum,
          from: since,
          to: new Date(),
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting health history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get health history',
    });
  }
}

/**
 * GET /api/superadmin/system/health/pool
 * Get database connection pool statistics
 */
export async function getPoolStats(req: Request, res: Response) {
  try {
    const poolStats = await getDatabasePoolStats();
    
    res.json({
      success: true,
      data: poolStats,
    });
  } catch (error: any) {
    console.error('Error getting pool stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pool statistics',
    });
  }
}
