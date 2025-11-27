import { db } from '../../db/prisma';

export interface APIMetrics {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface APIRequestLog {
  id: bigint;
  endpoint: string;
  method: string;
  status_code: number;
  response_time: number;
  timestamp: Date;
  user_id?: number | null;
  ip?: string | null;
  user_agent?: string | null;
  error_message?: string | null;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  requestCount: number;
  avgResponseTime: number;
  errorCount: number;
}

export interface APIErrorGroup {
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage: string | null;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
}

/**
 * Calculate percentile from sorted array of numbers
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Aggregate API metrics for endpoints within a time range
 */
export async function aggregateAPIMetrics(
  startDate: Date,
  endDate: Date
): Promise<APIMetrics[]> {
  try {
    // Type assertion for api_metrics table
    const apiMetricsTable = (db as any).api_metrics;
    
    // Fetch all metrics within the time range
    const metrics = await apiMetricsTable.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        endpoint: true,
        method: true,
        status_code: true,
        response_time: true,
      },
    });

    // Group by endpoint and method
    const grouped = new Map<string, any[]>();
    
    for (const metric of metrics) {
      const key = `${metric.method}:${metric.endpoint}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    // Calculate aggregated metrics for each endpoint
    const results: APIMetrics[] = [];
    
    for (const [key, endpointMetrics] of grouped.entries()) {
      const [method, endpoint] = key.split(':');
      
      // Calculate basic metrics
      const requestCount = endpointMetrics.length;
      const errorCount = endpointMetrics.filter((m: any) => m.status_code >= 400).length;
      const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
      
      // Calculate average response time
      const totalResponseTime = endpointMetrics.reduce(
        (sum: number, m: any) => sum + m.response_time,
        0
      );
      const avgResponseTime = totalResponseTime / requestCount;
      
      // Calculate percentiles
      const sortedResponseTimes = endpointMetrics
        .map((m: any) => m.response_time)
        .sort((a: number, b: number) => a - b);
      
      const p50 = calculatePercentile(sortedResponseTimes, 50);
      const p95 = calculatePercentile(sortedResponseTimes, 95);
      const p99 = calculatePercentile(sortedResponseTimes, 99);
      
      results.push({
        endpoint,
        method,
        avgResponseTime: Math.round(avgResponseTime),
        requestCount,
        errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
      });
    }
    
    // Sort by request count descending
    results.sort((a, b) => b.requestCount - a.requestCount);
    
    return results;
  } catch (error) {
    console.error('Error aggregating API metrics:', error);
    throw error;
  }
}

/**
 * Get time-series data for API requests
 * Aggregates data by hour for charting
 */
export async function getTimeSeriesData(
  startDate: Date,
  endDate: Date,
  endpoint?: string
): Promise<TimeSeriesDataPoint[]> {
  try {
    const apiMetricsTable = (db as any).api_metrics;
    
    // Build where clause
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (endpoint) {
      where.endpoint = endpoint;
    }
    
    // Fetch metrics
    const metrics = await apiMetricsTable.findMany({
      where,
      select: {
        timestamp: true,
        response_time: true,
        status_code: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group by hour
    const hourlyData = new Map<string, any[]>();
    
    for (const metric of metrics) {
      const hour = new Date(metric.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, []);
      }
      hourlyData.get(hourKey)!.push(metric);
    }

    // Calculate aggregated data for each hour
    const results: TimeSeriesDataPoint[] = [];
    
    for (const [hourKey, hourMetrics] of hourlyData.entries()) {
      const requestCount = hourMetrics.length;
      const errorCount = hourMetrics.filter((m: any) => m.status_code >= 400).length;
      const totalResponseTime = hourMetrics.reduce(
        (sum: number, m: any) => sum + m.response_time,
        0
      );
      const avgResponseTime = totalResponseTime / requestCount;
      
      results.push({
        timestamp: new Date(hourKey),
        requestCount,
        avgResponseTime: Math.round(avgResponseTime),
        errorCount,
      });
    }
    
    // Sort by timestamp
    results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return results;
  } catch (error) {
    console.error('Error getting time-series data:', error);
    throw error;
  }
}

/**
 * Get top slowest endpoints
 */
export async function getTopSlowestEndpoints(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<APIMetrics[]> {
  const metrics = await aggregateAPIMetrics(startDate, endDate);
  
  // Sort by average response time descending
  return metrics
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, limit);
}

/**
 * Get API request logs with pagination
 */
export async function getAPIRequestLogs(
  startDate: Date,
  endDate: Date,
  options: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    minResponseTime?: number;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ logs: APIRequestLog[]; total: number; page: number; limit: number }> {
  try {
    const apiMetricsTable = (db as any).api_metrics;
    
    const {
      endpoint,
      method,
      statusCode,
      minResponseTime,
      page = 1,
      limit = 50,
    } = options;
    
    // Build where clause
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (endpoint) {
      where.endpoint = { contains: endpoint };
    }
    
    if (method) {
      where.method = method;
    }
    
    if (statusCode) {
      where.status_code = statusCode;
    }
    
    if (minResponseTime) {
      where.response_time = { gte: minResponseTime };
    }
    
    // Get total count
    const total = await apiMetricsTable.count({ where });
    
    // Get paginated logs
    const logs = await apiMetricsTable.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return {
      logs,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error getting API request logs:', error);
    throw error;
  }
}

/**
 * Get API errors grouped by type
 */
export async function getAPIErrorGroups(
  startDate: Date,
  endDate: Date
): Promise<APIErrorGroup[]> {
  try {
    const apiMetricsTable = (db as any).api_metrics;
    
    // Fetch all error records
    const errors = await apiMetricsTable.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        status_code: {
          gte: 400,
        },
      },
      select: {
        endpoint: true,
        method: true,
        status_code: true,
        error_message: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Group by endpoint, method, status code, and error message
    const grouped = new Map<string, any>();
    
    for (const error of errors) {
      const key = `${error.method}:${error.endpoint}:${error.status_code}:${error.error_message || 'unknown'}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          endpoint: error.endpoint,
          method: error.method,
          statusCode: error.status_code,
          errorMessage: error.error_message,
          count: 0,
          firstOccurrence: error.timestamp,
          lastOccurrence: error.timestamp,
        });
      }
      
      const group = grouped.get(key);
      group.count++;
      
      // Update first and last occurrence
      if (error.timestamp < group.firstOccurrence) {
        group.firstOccurrence = error.timestamp;
      }
      if (error.timestamp > group.lastOccurrence) {
        group.lastOccurrence = error.timestamp;
      }
    }

    // Convert to array and sort by count
    const results = Array.from(grouped.values());
    results.sort((a, b) => b.count - a.count);
    
    return results;
  } catch (error) {
    console.error('Error getting API error groups:', error);
    throw error;
  }
}

/**
 * Get endpoint-specific metrics
 */
export async function getEndpointMetrics(
  endpoint: string,
  startDate: Date,
  endDate: Date
): Promise<APIMetrics | null> {
  const allMetrics = await aggregateAPIMetrics(startDate, endDate);
  return allMetrics.find(m => m.endpoint === endpoint) || null;
}
