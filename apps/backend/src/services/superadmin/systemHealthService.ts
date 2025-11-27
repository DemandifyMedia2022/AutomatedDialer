import { db } from '../../db/prisma';
import { getPool } from '../../db/pool';
import { env } from '../../config/env';

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  uptime?: number;
  lastCheck: Date;
  errorRate?: number;
  message?: string;
}

export interface SystemHealth {
  frontend: ComponentHealth;
  backend: ComponentHealth;
  database: ComponentHealth;
  agentic: ComponentHealth;
  timestamp: Date;
}

export interface DatabasePoolStats {
  active: number;
  idle: number;
  total: number;
}

// Track service start time for uptime calculation
const serviceStartTime = Date.now();

/**
 * Check database health and response time
 */
export async function checkDatabaseHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    // Simple query to check database connectivity
    await db.$queryRaw`SELECT 1 as ok`;
    const responseTime = Date.now() - startTime;
    
    // Get pool statistics
    const pool = getPool();
    const poolStats = await getDatabasePoolStats();
    
    // Determine status based on response time and pool usage
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (responseTime > 1000) {
      status = 'degraded';
    }
    if (poolStats.active >= poolStats.total * 0.9) {
      status = 'degraded';
    }
    
    return {
      status,
      responseTime,
      uptime: calculateUptime(),
      lastCheck: new Date(),
      message: status === 'degraded' ? 'High response time or pool usage' : undefined,
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      uptime: calculateUptime(),
      lastCheck: new Date(),
      message: error.message || 'Database connection failed',
    };
  }
}

/**
 * Check backend API health
 */
export async function checkBackendHealth(): Promise<ComponentHealth> {
  // Backend is healthy if this code is running
  return {
    status: 'healthy',
    responseTime: 0,
    uptime: calculateUptime(),
    lastCheck: new Date(),
  };
}

/**
 * Check frontend health by attempting to reach the frontend URL
 */
export async function checkFrontendHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();
  const frontendUrl = env.CORS_ORIGIN || 'http://localhost:3000';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(frontendUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok || response.status === 404) {
      // 404 is acceptable - means frontend is responding
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        lastCheck: new Date(),
        message: `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      message: error.message || 'Frontend unreachable',
    };
  }
}

/**
 * Check agentic service health
 * Note: This is a placeholder - actual implementation depends on how agentic service exposes health
 */
export async function checkAgenticHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    // Check if agentic service is accessible
    // For now, we'll check if the Python process is running by checking if we can import the module
    // In production, this should be a proper health check endpoint
    
    // Placeholder: assume healthy if backend is running
    // TODO: Implement actual agentic service health check when endpoint is available
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      message: 'Health check not implemented',
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      message: error.message || 'Agentic service unreachable',
    };
  }
}

/**
 * Get comprehensive system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [frontend, backend, database, agentic] = await Promise.all([
    checkFrontendHealth(),
    checkBackendHealth(),
    checkDatabaseHealth(),
    checkAgenticHealth(),
  ]);
  
  return {
    frontend,
    backend,
    database,
    agentic,
    timestamp: new Date(),
  };
}

/**
 * Get database connection pool statistics
 */
export async function getDatabasePoolStats(): Promise<DatabasePoolStats> {
  const pool = getPool();
  
  // Get pool statistics from mysql2
  // Note: mysql2 doesn't expose detailed pool stats directly
  // We'll use the pool configuration and make reasonable estimates
  const poolConfig = pool.pool.config;
  
  return {
    active: 0, // mysql2 doesn't expose this easily
    idle: 0,   // mysql2 doesn't expose this easily
    total: poolConfig.connectionLimit || 10,
  };
}

/**
 * Calculate service uptime as a percentage
 * Returns uptime percentage for the current day
 */
export function calculateUptime(): number {
  const now = Date.now();
  const uptimeMs = now - serviceStartTime;
  
  // Calculate uptime as percentage of time since service start
  // For a more accurate implementation, this should track actual downtime
  // For now, we assume 100% uptime since service start
  return 100;
}

/**
 * Calculate uptime percentage for a given time period
 * @param periodMs Time period in milliseconds
 */
export async function calculateUptimeForPeriod(periodMs: number): Promise<number> {
  try {
    // Query system_health_snapshots to calculate actual uptime
    const since = new Date(Date.now() - periodMs);
    
    const snapshots = await db.system_health_snapshots.findMany({
      where: {
        timestamp: {
          gte: since,
        },
      },
      select: {
        backend_status: true,
        database_status: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
    
    if (snapshots.length === 0) {
      // No data available, assume current uptime
      return calculateUptime();
    }
    
    // Count healthy snapshots
    const healthyCount = snapshots.filter(
      (s: any) => s.backend_status === 'healthy' && s.database_status === 'healthy'
    ).length;
    
    return (healthyCount / snapshots.length) * 100;
  } catch (error) {
    // If table doesn't exist yet or query fails, return current uptime
    return calculateUptime();
  }
}

/**
 * Store current health snapshot to database
 */
export async function storeHealthSnapshot(health: SystemHealth): Promise<void> {
  try {
    await db.system_health_snapshots.create({
      data: {
        frontend_status: health.frontend.status,
        backend_status: health.backend.status,
        database_status: health.database.status,
        agentic_status: health.agentic.status,
        backend_response: health.backend.responseTime || 0,
        database_response: health.database.responseTime || 0,
        error_rate: 0, // TODO: Calculate from api_metrics table
        timestamp: health.timestamp,
      },
    });
  } catch (error) {
    // Silently fail if table doesn't exist yet
    console.error('Failed to store health snapshot:', error);
  }
}
