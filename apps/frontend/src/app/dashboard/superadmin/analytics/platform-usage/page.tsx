'use client'

import { useState } from 'react'
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Target, 
  Clock, 
  BarChart3,
  Zap,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '../../components/cards/MetricCard'
import { BarChartWrapper } from '../../components/charts/BarChartWrapper'
import { LineChartWrapper } from '../../components/charts/LineChartWrapper'
import {
  useFeatureUsageStats,
  useUserEngagementMetrics,
  useUserJourneyAnalytics,
  useCohortAnalysis,
  TimeRange,
} from '../../hooks/usePlatformUsage'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PlatformUsagePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  const { data: featureUsage, isLoading: featureLoading, error: featureError } = useFeatureUsageStats({ range: timeRange })
  const { data: engagement, isLoading: engagementLoading, error: engagementError } = useUserEngagementMetrics({ range: timeRange })
  const { data: journey, isLoading: journeyLoading, error: journeyError } = useUserJourneyAnalytics({ range: timeRange })
  const { data: cohorts, isLoading: cohortsLoading, error: cohortsError } = useCohortAnalysis({ range: timeRange })

  // Format numbers with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value))
  }

  // Format duration in seconds to readable format
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  const hasError = featureError || engagementError || journeyError || cohortsError

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin">Super Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin/analytics">Analytics</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Platform Usage</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {hasError && (
          <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">
            Failed to load platform usage data
          </Card>
        )}

        {/* Header with Time Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Platform Usage Analytics</h2>
            <p className="text-muted-foreground">
              Detailed insights into feature usage, user engagement, and retention
            </p>
          </div>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feature Usage Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureLoading ? (
            <>
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
            </>
          ) : featureUsage ? (
            <>
              <MetricCard
                title="Total Interactions"
                value={formatNumber(featureUsage.summary.totalInteractions)}
                icon={Activity}
                description="Across all features"
              />
              <MetricCard
                title="Most Used Feature"
                value={featureUsage.summary.mostUsedFeature}
                icon={Target}
                description="Highest interaction count"
              />
              <MetricCard
                title="Fastest Growing"
                value={featureUsage.summary.fastestGrowingFeature}
                icon={TrendingUp}
                description="Highest growth rate"
              />
              <MetricCard
                title="Avg Growth Rate"
                value={`${featureUsage.summary.avgGrowthRate.toFixed(1)}%`}
                icon={BarChart3}
                description="Across all features"
                trend={{
                  value: featureUsage.summary.avgGrowthRate,
                  label: 'vs previous period',
                  isPositive: featureUsage.summary.avgGrowthRate >= 0,
                }}
              />
            </>
          ) : null}
        </div>

        {/* User Engagement Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {engagementLoading ? (
            <>
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
            </>
          ) : engagement ? (
            <>
              <MetricCard
                title="Engagement Score"
                value={engagement.engagementScore.toString()}
                icon={Zap}
                description="Out of 100"
                trend={{
                  value: engagement.engagementScore,
                  label: 'overall engagement',
                  isPositive: engagement.engagementScore >= 50,
                }}
              />
              <MetricCard
                title="Avg Session Duration"
                value={formatDuration(engagement.engagement.avgSessionDuration)}
                icon={Clock}
                description="Per user session"
              />
              <MetricCard
                title="Sessions Per User"
                value={engagement.engagement.sessionsPerUser.toFixed(1)}
                icon={UserCheck}
                description="Average sessions"
              />
              <MetricCard
                title="Calls Per Session"
                value={engagement.engagement.avgCallsPerSession.toFixed(1)}
                icon={Activity}
                description="Average call activity"
              />
            </>
          ) : null}
        </div>

        {/* Feature Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage Statistics</CardTitle>
            <CardDescription>
              Daily active users and interaction counts for each major feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            {featureLoading ? (
              <Skeleton className="h-[400px]" />
            ) : featureUsage ? (
              <div className="space-y-6">
                {/* Feature Usage Bar Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Total Interactions by Feature</h4>
                  <BarChartWrapper
                    data={featureUsage.features.map((feature) => ({
                      feature: feature.featureName,
                      'Total Interactions': feature.totalInteractions,
                      'Daily Active Users': feature.dailyActiveUsers,
                    }))}
                    xKey="feature"
                    bars={[
                      { key: 'Total Interactions', name: 'Interactions', color: '#3b82f6' },
                      { key: 'Daily Active Users', name: 'Active Users', color: '#10b981' },
                    ]}
                    height={300}
                    tooltipFormatter={(value) => formatNumber(value)}
                  />
                </div>

                {/* Growth Rate Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Feature Growth Rates</h4>
                  <BarChartWrapper
                    data={featureUsage.features.map((feature) => ({
                      feature: feature.featureName,
                      'Growth Rate (%)': feature.growthRate,
                    }))}
                    xKey="feature"
                    bars={[
                      { key: 'Growth Rate (%)', name: 'Growth Rate', color: '#8b5cf6' },
                    ]}
                    height={250}
                    tooltipFormatter={(value) => `${value.toFixed(2)}%`}
                    yAxisFormatter={(value) => `${value}%`}
                  />
                </div>

                {/* Feature Details Table */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Detailed Feature Metrics</h4>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Feature</th>
                          <th className="text-right p-3 font-medium">Active Users</th>
                          <th className="text-right p-3 font-medium">Total Interactions</th>
                          <th className="text-right p-3 font-medium">Avg per User</th>
                          <th className="text-right p-3 font-medium">Growth Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {featureUsage.features.map((feature, index) => (
                          <tr key={feature.featureName} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                            <td className="p-3 font-medium">{feature.featureName}</td>
                            <td className="text-right p-3">{formatNumber(feature.dailyActiveUsers)}</td>
                            <td className="text-right p-3">{formatNumber(feature.totalInteractions)}</td>
                            <td className="text-right p-3">{feature.avgInteractionsPerUser.toFixed(2)}</td>
                            <td className="text-right p-3">
                              <span className={`inline-flex items-center gap-1 ${
                                feature.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {feature.growthRate >= 0 ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )}
                                {Math.abs(feature.growthRate).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* User Engagement Details */}
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Metrics</CardTitle>
            <CardDescription>
              How engaged users are with the platform
            </CardDescription>
            {engagement && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Notes per User</p>
                  <p className="text-2xl font-bold">
                    {engagement.engagement.avgNotesPerUser.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Documents per User</p>
                  <p className="text-2xl font-bold">
                    {engagement.engagement.avgDocumentsPerUser.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessions per User</p>
                  <p className="text-2xl font-bold">
                    {engagement.engagement.sessionsPerUser.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Engagement Score</p>
                  <p className="text-2xl font-bold">
                    {engagement.engagementScore}/100
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <Skeleton className="h-[300px]" />
            ) : engagement ? (
              <div>
                <h4 className="text-sm font-medium mb-3">Feature Interaction Frequency</h4>
                <BarChartWrapper
                  data={Object.entries(engagement.engagement.featureInteractionFrequency).map(([feature, frequency]) => ({
                    feature,
                    'Interactions per User': frequency,
                  }))}
                  xKey="feature"
                  bars={[
                    { key: 'Interactions per User', name: 'Avg Interactions', color: '#f59e0b' },
                  ]}
                  height={300}
                  tooltipFormatter={(value) => value.toFixed(2)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* User Journey Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>User Journey Analytics</CardTitle>
            <CardDescription>
              Common navigation paths and feature adoption sequences
            </CardDescription>
            {journey?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Registrations</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(journey.summary.totalRegistrations)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(journey.summary.activeUsers)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">
                    {journey.summary.overallConversionRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Biggest Drop-off</p>
                  <p className="text-xl font-bold text-red-600">
                    {journey.summary.biggestDropoffRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{journey.summary.biggestDropoffStep}</p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {journeyLoading ? (
              <Skeleton className="h-[400px]" />
            ) : journey ? (
              <div className="space-y-6">
                {/* Journey Funnel Visualization */}
                <div className="space-y-3">
                  {journey.journey.map((step, index) => {
                    const widthPercent = journey.journey[0].userCount > 0
                      ? (step.userCount / journey.journey[0].userCount) * 100
                      : 0

                    return (
                      <div key={step.step} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{step.step}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {formatNumber(step.userCount)} users
                            </span>
                            <span className="font-medium">
                              {step.completionRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-10 bg-secondary rounded-md overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium transition-all"
                            style={{ width: `${widthPercent}%` }}
                          >
                            {widthPercent > 20 && `${widthPercent.toFixed(0)}%`}
                          </div>
                        </div>
                        {index < journey.journey.length - 1 && step.avgTimeToNextStep > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Avg time to next step: {formatDuration(step.avgTimeToNextStep)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Journey Completion Rates Chart */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Completion Rates by Step</h4>
                  <BarChartWrapper
                    data={journey.journey.map((step) => ({
                      step: step.step,
                      'Completion Rate (%)': step.completionRate,
                      'Users': step.userCount,
                    }))}
                    xKey="step"
                    bars={[
                      { key: 'Completion Rate (%)', name: 'Completion Rate', color: '#3b82f6' },
                    ]}
                    height={250}
                    tooltipFormatter={(value, name) => {
                      if (name === 'Completion Rate (%)') {
                        return `${value.toFixed(2)}%`
                      }
                      return formatNumber(value)
                    }}
                    yAxisFormatter={(value) => `${value}%`}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Cohort Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cohort Analysis</CardTitle>
            <CardDescription>
              User retention rates segmented by registration date
            </CardDescription>
            {cohorts?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cohorts</p>
                  <p className="text-2xl font-bold">
                    {cohorts.summary.totalCohorts}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Week 1 Retention</p>
                  <p className="text-2xl font-bold">
                    {cohorts.summary.avgRetentionRates.week1.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Week 8 Retention</p>
                  <p className="text-2xl font-bold">
                    {cohorts.summary.avgRetentionRates.week8.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Churn Rate</p>
                  <p className="text-2xl font-bold text-red-600">
                    {cohorts.summary.avgChurnRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {cohortsLoading ? (
              <Skeleton className="h-[500px]" />
            ) : cohorts ? (
              <div className="space-y-6">
                {/* Retention Rates Line Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Retention Rates Over Time</h4>
                  <LineChartWrapper
                    data={cohorts.cohorts.map((cohort) => ({
                      cohort: formatDate(cohort.cohortDate),
                      'Week 1': cohort.retentionRates.week1,
                      'Week 2': cohort.retentionRates.week2,
                      'Week 4': cohort.retentionRates.week4,
                      'Week 8': cohort.retentionRates.week8,
                    }))}
                    xKey="cohort"
                    lines={[
                      { key: 'Week 1', name: 'Week 1', color: '#3b82f6' },
                      { key: 'Week 2', name: 'Week 2', color: '#10b981' },
                      { key: 'Week 4', name: 'Week 4', color: '#f59e0b' },
                      { key: 'Week 8', name: 'Week 8', color: '#ef4444' },
                    ]}
                    height={350}
                    tooltipFormatter={(value) => `${value.toFixed(2)}%`}
                    yAxisFormatter={(value) => `${value}%`}
                  />
                </div>

                {/* Cohort Details Table */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Cohort Details</h4>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Cohort Date</th>
                          <th className="text-right p-3 font-medium">Size</th>
                          <th className="text-right p-3 font-medium">Week 1</th>
                          <th className="text-right p-3 font-medium">Week 2</th>
                          <th className="text-right p-3 font-medium">Week 4</th>
                          <th className="text-right p-3 font-medium">Week 8</th>
                          <th className="text-right p-3 font-medium">Churn Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohorts.cohorts.map((cohort, index) => (
                          <tr key={cohort.cohortDate} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                            <td className="p-3 font-medium">{formatDate(cohort.cohortDate)}</td>
                            <td className="text-right p-3">{formatNumber(cohort.cohortSize)}</td>
                            <td className="text-right p-3">{cohort.retentionRates.week1.toFixed(1)}%</td>
                            <td className="text-right p-3">{cohort.retentionRates.week2.toFixed(1)}%</td>
                            <td className="text-right p-3">{cohort.retentionRates.week4.toFixed(1)}%</td>
                            <td className="text-right p-3">{cohort.retentionRates.week8.toFixed(1)}%</td>
                            <td className="text-right p-3">
                              <span className="text-red-600">{cohort.churnRate.toFixed(1)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Average Retention Rates Summary */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Average Retention Rates</h4>
                  <BarChartWrapper
                    data={[
                      { period: 'Week 1', 'Retention Rate (%)': cohorts.summary.avgRetentionRates.week1 },
                      { period: 'Week 2', 'Retention Rate (%)': cohorts.summary.avgRetentionRates.week2 },
                      { period: 'Week 4', 'Retention Rate (%)': cohorts.summary.avgRetentionRates.week4 },
                      { period: 'Week 8', 'Retention Rate (%)': cohorts.summary.avgRetentionRates.week8 },
                    ]}
                    xKey="period"
                    bars={[
                      { key: 'Retention Rate (%)', name: 'Avg Retention', color: '#8b5cf6' },
                    ]}
                    height={250}
                    tooltipFormatter={(value) => `${value.toFixed(2)}%`}
                    yAxisFormatter={(value) => `${value}%`}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
