import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/superadminApi'

export interface BusinessMetrics {
  mrr: number
  revenuePerUser: number
  growthRate: number
  newUsers: number
  churnRate: number
  activeUsers: number
  totalCalls: number
  totalCampaigns: number
  avgSessionDuration: number
}

export interface UserGrowthMetrics {
  date: Date
  newUsers: number
  totalUsers: number
  activeUsers: number
  churnedUsers: number
  churnRate: number
}

export interface FeatureAdoption {
  featureName: string
  totalUsers: number
  activeUsers: number
  adoptionRate: number
  avgUsagePerUser: number
}

export interface ConversionFunnelMetrics {
  stage: string
  userCount: number
  conversionRate: number
  dropoffRate: number
}

export interface PlatformUsageMetrics {
  totalCalls: number
  totalCampaigns: number
  avgSessionDuration: number
  totalCallDuration: number
  avgCallDuration: number
  callsByDisposition: Record<string, number>
}

export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom'
export type Granularity = 'day' | 'week' | 'month'

export interface TimeRangeParams {
  range?: TimeRange
  startDate?: string
  endDate?: string
}

/**
 * Hook to fetch comprehensive business metrics
 */
export function useBusinessMetrics(timeRange: TimeRangeParams = { range: '30d' }) {
  const params: Record<string, any> = {}
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<{
    metrics: BusinessMetrics
    period: {
      startDate: Date
      endDate: Date
    }
  }>({
    queryKey: ['businessMetrics', timeRange],
    queryFn: () => get('/api/superadmin/analytics/business/metrics', params),
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Hook to fetch user growth metrics over time
 */
export function useUserGrowth(
  timeRange: TimeRangeParams = { range: '30d' },
  granularity: Granularity = 'day'
) {
  const params: Record<string, any> = { granularity }
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<{
    growthMetrics: UserGrowthMetrics[]
    summary: {
      totalNewUsers: number
      avgChurnRate: number
      currentTotalUsers: number
      currentActiveUsers: number
    }
    period: {
      startDate: Date
      endDate: Date
      granularity: Granularity
    }
  }>({
    queryKey: ['userGrowth', timeRange, granularity],
    queryFn: () => get('/api/superadmin/analytics/business/growth', params),
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Hook to fetch feature adoption rates
 */
export function useFeatureAdoption(timeRange: TimeRangeParams = { range: '30d' }) {
  const params: Record<string, any> = {}
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<{
    features: FeatureAdoption[]
    summary: {
      avgAdoptionRate: number
      mostAdoptedFeature: string
      leastAdoptedFeature: string
      totalFeatures: number
    }
    period: {
      startDate: Date
      endDate: Date
    }
  }>({
    queryKey: ['featureAdoption', timeRange],
    queryFn: () => get('/api/superadmin/analytics/business/features', params),
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Hook to fetch conversion funnel metrics
 */
export function useConversionFunnel(timeRange: TimeRangeParams = { range: '30d' }) {
  const params: Record<string, any> = {}
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<{
    funnel: ConversionFunnelMetrics[]
    summary: {
      overallConversionRate: number
      totalRegistrations: number
      activeUsers: number
    }
    period: {
      startDate: Date
      endDate: Date
    }
  }>({
    queryKey: ['conversionFunnel', timeRange],
    queryFn: () => get('/api/superadmin/analytics/business/funnel', params),
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Hook to fetch platform usage metrics
 */
export function usePlatformUsage(timeRange: TimeRangeParams = { range: '30d' }) {
  const params: Record<string, any> = {}
  
  if (timeRange.range && timeRange.range !== 'custom') {
    params.range = timeRange.range
  } else if (timeRange.startDate && timeRange.endDate) {
    params.startDate = timeRange.startDate
    params.endDate = timeRange.endDate
  }

  return useQuery<{
    usage: PlatformUsageMetrics
    period: {
      startDate: Date
      endDate: Date
    }
  }>({
    queryKey: ['platformUsage', timeRange],
    queryFn: () => get('/api/superadmin/analytics/business/usage', params),
    staleTime: 300000, // 5 minutes
  })
}
