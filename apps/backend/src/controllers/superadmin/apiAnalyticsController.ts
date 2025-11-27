import { Request, Response } from 'express';
import {
  aggregateAPIMetrics,
  getTimeSeriesData,
  getTopSlowestEndpoints,
  getAPIRequestLogs,
  getAPIErrorGroups,
  getEndpointMetrics,
} from '../../services/superadmin/apiMetricsService';

/**
 * Parse time range from query parameters
 * Supports: 24h, 7d, 30d, or custom start/end dates
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
      default:
        throw new Error('Invalid range. Use 24h, 7d, 30d, or 90d');
    }
  } else {
    // Default to last 24 hours
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return { startDate: start, endDate: end };
}

/**
 * GET /api/superadmin/analytics/api/endpoints
 * Get aggregated API endpoint metrics with time range filters
 */
export async function getEndpoints(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    const { endpoint } = req.query;
    
    let metrics;
    
    if (endpoint) {
      // Get specific endpoint metrics
      const endpointMetric = await getEndpointMetrics(
        endpoint as string,
        startDate,
        endDate
      );
      
      if (!endpointMetric) {
        return res.status(404).json({
          success: false,
          message: 'Endpoint not found or no data available',
        });
      }
      
      metrics = [endpointMetric];
    } else {
      // Get all endpoint metrics
      metrics = await aggregateAPIMetrics(startDate, endDate);
    }
    
    // Get time-series data for charting
    const timeSeries = await getTimeSeriesData(
      startDate,
      endDate,
      endpoint as string | undefined
    );
    
    // Get top slowest endpoints
    const slowest = await getTopSlowestEndpoints(startDate, endDate, 10);
    
    res.json({
      success: true,
      data: {
        metrics,
        timeSeries,
        slowest,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting API endpoints:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get API endpoint metrics',
    });
  }
}

/**
 * GET /api/superadmin/analytics/api/requests
 * Get API request logs with filtering and pagination
 */
export async function getRequests(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    const {
      endpoint,
      method,
      statusCode,
      minResponseTime,
      page = '1',
      limit = '50',
    } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page number',
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit. Must be between 1 and 500',
      });
    }
    
    const result = await getAPIRequestLogs(startDate, endDate, {
      endpoint: endpoint as string | undefined,
      method: method as string | undefined,
      statusCode: statusCode ? parseInt(statusCode as string, 10) : undefined,
      minResponseTime: minResponseTime
        ? parseInt(minResponseTime as string, 10)
        : undefined,
      page: pageNum,
      limit: limitNum,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting API requests:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get API request logs',
    });
  }
}

/**
 * GET /api/superadmin/analytics/api/errors
 * Get API errors grouped by type for error analysis
 */
export async function getErrors(req: Request, res: Response) {
  try {
    const { startDate, endDate } = parseTimeRange(req);
    
    const errorGroups = await getAPIErrorGroups(startDate, endDate);
    
    // Calculate summary statistics
    const totalErrors = errorGroups.reduce((sum, group) => sum + group.count, 0);
    const uniqueErrors = errorGroups.length;
    
    // Group by status code for distribution
    const statusCodeDistribution = errorGroups.reduce((acc: any, group) => {
      const code = group.statusCode;
      if (!acc[code]) {
        acc[code] = 0;
      }
      acc[code] += group.count;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        errorGroups,
        summary: {
          totalErrors,
          uniqueErrors,
          statusCodeDistribution,
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting API errors:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get API error analysis',
    });
  }
}
