import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/superadminApi'

export interface APIMetrics {
  endpoint: string
  method: string
  avgResponseTime: number
  requestCount: number
  errorCount: number
  errorRate: number
  p50: number
  p95: number
  p99: number
}

export interface TimeSeriesDataPoint {
  timestamp: Date
  requestCount: number
  avgResponseTime: number
  errorCount: number
}

export interface APIEndpointsData {
  metrics: APIMetrics[]
  timeSeries: TimeSeriesDataPoint[]
  slowest: APIMetrics[]
  period: {
    startDate: Date
    endDate: Date
  }
}

export interface APIRequestLog {
  id: string
  endpoint: string
  method: string
  status_code: number
  response_time: number
  timestamp: Date
  user_id?: number | null
  ip?: string | null
  user_agent?: string | null
  error_message?: string | null
}

export interface APIRequestLogsData {
  logs: APIRequestLog[]
  total: number
  page: number
  limit: number
}

export interface APIErrorGroup {
  endpoint: string
  method: string
  statusCode: number
  errorMessage: string | null
  count: number
  firstOccurrence: Date
  lastOccurrence: Date
}

export interface APIErrorsData {
  errorGroups: APIErrorGroup[]
  summary: {
    totalErrors: number
    uniqueErrors: number
    statusCodeDistribution: Record<number, number>
  }
  period: {
    startDate: Date
    endDate: Date
  }
}

export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'custom'

export interface TimeRangeParams {
  range?: TimeRange
  startDate?: string
  endDate?: string
}

/**
 * Hook to fetch API endpoint metrics with time range filtering
 */
export function useAPIMetrics(
  timeRange: TimeRangeParams = { range: '24h' },
  endpoint?: string
) {
  const params: Record<string, any> = {}
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }
  
  if (endpoint) {
    params.endpoint = endpoint
  }

  return useQuery<APIEndpointsData>({
    queryKey: ['apiMetrics', timeRange, endpoint],
    queryFn: () => get<APIEndpointsData>('/api/superadmin/analytics/api/endpoints', params),
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch API request logs with filtering and pagination
 */
export function useAPIRequestLogs(
  timeRange: TimeRangeParams = { range: '24h' },
  filters: {
    endpoint?: string
    method?: string
    statusCode?: number
    minResponseTime?: number
    page?: number
    limit?: number
  } = {}
) {
  const params: Record<string, any> = { ...filters }
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<APIRequestLogsData>({
    queryKey: ['apiRequestLogs', timeRange, filters],
    queryFn: () => get<APIRequestLogsData>('/api/superadmin/analytics/api/requests', params),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch API error analysis
 */
export function useAPIErrors(timeRange: TimeRangeParams = { range: '24h' }) {
  const params: Record<string, any> = {}
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<APIErrorsData>({
    queryKey: ['apiErrors', timeRange],
    queryFn: () => get<APIErrorsData>('/api/superadmin/analytics/api/errors', params),
    staleTime: 60000, // 1 minute
  })
}
