'use client'

import { useState } from 'react'
import { TrendingUp, Users, Activity, Target, BarChart3, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '../components/cards/MetricCard'
import { UserGrowthChart } from '../components/charts/UserGrowthChart'
import { FeatureAdoptionChart } from '../components/charts/FeatureAdoptionChart'
import { BarChartWrapper } from '../components/charts/BarChartWrapper'
import {
  useBusinessMetrics,
  useUserGrowth,
  useFeatureAdoption,
  useConversionFunnel,
  usePlatformUsage,
  TimeRange,
  Granularity,
} from '../hooks/useBusinessMetrics'
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

export default function BusinessAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [granularity, setGranularity] = useState<Granularity>('day')

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useBusinessMetrics({ range: timeRange })
  const { data: userGrowth, isLoading: growthLoading } = useUserGrowth({ range: timeRange }, granularity)
  const { data: featureAdoption, isLoading: adoptionLoading } = useFeatureAdoption({ range: timeRange })
  const { data: conversionFunnel, isLoading: funnelLoading } = useConversionFunnel({ range: timeRange })
  const { data: platformUsage, isLoading: usageLoading } = usePlatformUsage({ range: timeRange })

  // Format numbers with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Format duration in seconds to readable format
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

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
              <BreadcrumbItem>
                <BreadcrumbPage>Business Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {metricsError && (
          <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">
            Failed to load business metrics data
          </Card>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Business Intelligence</h2>
            <p className="text-muted-foreground">
              Comprehensive analytics and KPIs for the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Select value={granularity} onValueChange={(value) => setGranularity(value as Granularity)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricsLoading ? (
            <>
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
            </>
          ) : metrics ? (
            <>
              <MetricCard
                title="New Users"
                value={formatNumber(metrics.metrics.newUsers)}
                icon={Users}
                description="Users registered in period"
                trend={{
                  value: metrics.metrics.growthRate,
                  label: 'vs previous period',
                  isPositive: metrics.metrics.growthRate >= 0,
                }}
              />
              <MetricCard
                title="Active Users"
                value={formatNumber(metrics.metrics.activeUsers)}
                icon={Activity}
                description="Users with activity"
                trend={{
                  value: metrics.metrics.churnRate,
                  label: 'churn rate',
                  isPositive: false,
                }}
              />
              <MetricCard
                title="Total Calls"
                value={formatNumber(metrics.metrics.totalCalls)}
                icon={BarChart3}
                description="Calls processed"
              />
              <MetricCard
                title="Total Campaigns"
                value={formatNumber(metrics.metrics.totalCampaigns)}
                icon={Target}
                description="Campaigns created"
              />
            </>
          ) : null}
        </div>

        {/* Platform Usage Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          {usageLoading ? (
            <>
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
              <Skeleton className="h-[140px]" />
            </>
          ) : platformUsage ? (
            <>
              <MetricCard
                title="Avg Session Duration"
                value={formatDuration(platformUsage.usage.avgSessionDuration)}
                icon={Clock}
                description="Average user session time"
              />
              <MetricCard
                title="Avg Call Duration"
                value={`${Math.round(platformUsage.usage.avgCallDuration)}s`}
                icon={Activity}
                description="Average call length"
              />
              <MetricCard
                title="Total Call Time"
                value={formatDuration(platformUsage.usage.totalCallDuration)}
                icon={TrendingUp}
                description="Total talk time"
              />
            </>
          ) : null}
        </div>

        {/* User Growth Chart */}
        {growthLoading ? (
          <Skeleton className="h-[600px]" />
        ) : userGrowth ? (
          <UserGrowthChart
            data={userGrowth.growthMetrics}
            granularity={granularity}
            summary={userGrowth.summary}
          />
        ) : null}

        {/* Feature Adoption and Conversion Funnel */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Feature Adoption */}
          {adoptionLoading ? (
            <Skeleton className="h-[600px]" />
          ) : featureAdoption ? (
            <FeatureAdoptionChart
              data={featureAdoption.features}
              summary={featureAdoption.summary}
            />
          ) : null}

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>User journey from registration to active user</CardDescription>
              {conversionFunnel?.summary && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Registrations</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(conversionFunnel.summary.totalRegistrations)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(conversionFunnel.summary.activeUsers)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">
                      {conversionFunnel.summary.overallConversionRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {funnelLoading ? (
                <Skeleton className="h-[400px]" />
              ) : conversionFunnel ? (
                <div className="space-y-6">
                  {/* Funnel Visualization */}
                  <div className="space-y-3">
                    {conversionFunnel.funnel.map((stage, index) => {
                      const widthPercent = conversionFunnel.funnel[0].userCount > 0
                        ? (stage.userCount / conversionFunnel.funnel[0].userCount) * 100
                        : 0

                      return (
                        <div key={stage.stage} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{stage.stage}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">
                                {formatNumber(stage.userCount)} users
                              </span>
                              <span className="font-medium">
                                {stage.conversionRate.toFixed(1)}%
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
                          {index < conversionFunnel.funnel.length - 1 && stage.dropoffRate > 0 && (
                            <p className="text-xs text-red-600">
                              {stage.dropoffRate.toFixed(1)}% drop-off to next stage
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Funnel Chart */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Conversion Rates by Stage</h4>
                    <BarChartWrapper
                      data={conversionFunnel.funnel.map((stage) => ({
                        stage: stage.stage,
                        'Conversion Rate (%)': stage.conversionRate,
                        'Users': stage.userCount,
                      }))}
                      xKey="stage"
                      bars={[
                        { key: 'Conversion Rate (%)', name: 'Conversion Rate', color: '#3b82f6' },
                      ]}
                      height={250}
                      tooltipFormatter={(value, name) => {
                        if (name === 'Conversion Rate (%)') {
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
        </div>

        {/* Call Disposition Distribution */}
        {platformUsage?.usage.callsByDisposition && (
          <Card>
            <CardHeader>
              <CardTitle>Call Disposition Distribution</CardTitle>
              <CardDescription>Breakdown of call outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartWrapper
                data={Object.entries(platformUsage.usage.callsByDisposition).map(([disposition, count]) => ({
                  disposition: disposition.charAt(0).toUpperCase() + disposition.slice(1),
                  'Calls': count,
                }))}
                xKey="disposition"
                bars={[
                  { key: 'Calls', name: 'Call Count', color: '#10b981' },
                ]}
                height={300}
                tooltipFormatter={(value) => formatNumber(value)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
