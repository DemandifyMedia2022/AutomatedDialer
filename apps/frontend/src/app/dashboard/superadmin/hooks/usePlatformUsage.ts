'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/superadminApi'

export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y'

export interface TimeRangeParams {
  range?: TimeRange
  startDate?: string
  endDate?: string
}

// Feature Usage Stats
export interface FeatureUsageStats {
  featureName: string
  dailyActiveUsers: number
  totalInteractions: number
  avgInteractionsPerUser: number
  growthRate: number
}

export interface FeatureUsageResponse {
  features: FeatureUsageStats[]
  summary: {
    totalInteractions: number
    avgGrowthRate: number
    mostUsedFeature: string
    fastestGrowingFeature: string
    totalFeatures: number
  }
  period: {
    startDate: string
    endDate: string
  }
}

// User Engagement Metrics
export interface UserEngagementMetrics {
  avgSessionDuration: number
  sessionsPerUser: number
  avgCallsPerSession: number
  avgNotesPerUser: number
  avgDocumentsPerUser: number
  featureInteractionFrequency: Record<string, number>
}

export interface UserEngagementResponse {
  engagement: UserEngagementMetrics
  engagementScore: number
  period: {
    startDate: string
    endDate: string
  }
}

// User Journey Analytics
export interface UserJourneyStep {
  step: string
  userCount: number
  avgTimeToNextStep: number
  completionRate: number
}

export interface UserJourneyResponse {
  journey: UserJourneyStep[]
  summary: {
    overallConversionRate: number
    totalRegistrations: number
    activeUsers: number
    biggestDropoffStep: string
    biggestDropoffRate: number
  }
  period: {
    startDate: string
    endDate: string
  }
}

// Cohort Analysis
export interface CohortAnalysis {
  cohortDate: string
  cohortSize: number
  retentionRates: {
    week1: number
    week2: number
    week4: number
    week8: number
  }
  avgLifetimeValue: number
  churnRate: number
}

export interface CohortAnalysisResponse {
  cohorts: CohortAnalysis[]
  summary: {
    totalCohorts: number
    avgRetentionRates: {
      week1: number
      week2: number
      week4: number
      week8: number
    }
    avgChurnRate: number
    bestPerformingCohort: string
    worstPerformingCohort: string
  }
  period: {
    startDate: string
    endDate: string
  }
}

/**
 * Hook to fetch feature usage statistics
 */
export function useFeatureUsageStats(params: TimeRangeParams = {}) {
  return useQuery<FeatureUsageResponse>({
    queryKey: ['superadmin', 'usage', 'features', params],
    queryFn: () => get('/api/superadmin/analytics/usage/features', params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch user engagement metrics
 */
export function useUserEngagementMetrics(params: TimeRangeParams = {}) {
  return useQuery<UserEngagementResponse>({
    queryKey: ['superadmin', 'usage', 'engagement', params],
    queryFn: () => get('/api/superadmin/analytics/usage/engagement', params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch user journey analytics
 */
export function useUserJourneyAnalytics(params: TimeRangeParams = {}) {
  return useQuery<UserJourneyResponse>({
    queryKey: ['superadmin', 'usage', 'journey', params],
    queryFn: () => get('/api/superadmin/analytics/usage/journey', params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch cohort analysis
 */
export function useCohortAnalysis(params: TimeRangeParams = {}) {
  return useQuery<CohortAnalysisResponse>({
    queryKey: ['superadmin', 'usage', 'cohorts', params],
    queryFn: () => get('/api/superadmin/analytics/usage/cohorts', params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
