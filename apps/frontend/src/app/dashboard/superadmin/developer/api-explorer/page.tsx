'use client'

import { useState } from 'react'
import { Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Button } from '@/components/ui/button'
import { APIEndpointsTable } from '../../components/tables/APIEndpointsTable'
import { APIPerformanceChart } from '../../components/charts/APIPerformanceChart'
import { useAPIMetrics, TimeRange, TimeRangeParams } from '../../hooks/useAPIMetrics'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
]

export default function APIExplorerPage() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24h')
  const [timeRangeParams, setTimeRangeParams] = useState<TimeRangeParams>({ range: '24h' })

  const { data, isLoading, error } = useAPIMetrics(timeRangeParams)

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range)
    setTimeRangeParams({ range })
  }

  // Calculate summary metrics
  const totalRequests = data?.metrics.reduce((sum, m) => sum + m.requestCount, 0) || 0
  const totalErrors = data?.metrics.reduce((sum, m) => sum + m.errorCount, 0) || 0
  const overallErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  const avgResponseTime =
    data?.metrics.length
      ? data.metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / data.metrics.length
      : 0

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
                  <BreadcrumbPage>API Explorer</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">
              Failed to load API metrics data
            </Card>
          )}

          {/* Time Range Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Performance Analytics</CardTitle>
                  <CardDescription>
                    Monitor API endpoint performance, request volumes, and error rates
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {TIME_RANGES.map((range) => (
                    <Button
                      key={range.value}
                      variant={selectedRange === range.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleRangeChange(range.value)}
                      className={cn(
                        'transition-colors',
                        selectedRange === range.value && 'shadow-sm'
                      )}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <Skeleton className="h-[120px]" />
                <Skeleton className="h-[120px]" />
                <Skeleton className="h-[120px]" />
                <Skeleton className="h-[120px]" />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across {data?.metrics.length || 0} endpoints
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average across all endpoints
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={cn(
                        'text-2xl font-bold',
                        overallErrorRate >= 5
                          ? 'text-red-600'
                          : overallErrorRate >= 1
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      )}
                    >
                      {overallErrorRate.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalErrors.toLocaleString()} failed requests
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Slowest Endpoint</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data?.slowest[0]?.avgResponseTime || 0}ms
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {data?.slowest[0]?.endpoint || 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Top Slowest Endpoints */}
          {!isLoading && data?.slowest && data.slowest.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Slowest Endpoints</CardTitle>
                <CardDescription>
                  Endpoints with the highest average response times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.slowest.slice(0, 5).map((endpoint, index) => (
                    <div
                      key={`${endpoint.method}:${endpoint.endpoint}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm truncate">{endpoint.endpoint}</p>
                          <p className="text-xs text-muted-foreground">
                            {endpoint.method} • {endpoint.requestCount.toLocaleString()} requests
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold">{endpoint.avgResponseTime}ms</p>
                        <p className="text-xs text-muted-foreground">
                          P95: {endpoint.p95}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Volume Chart */}
          <APIPerformanceChart
            timeSeries={data?.timeSeries || []}
            isLoading={isLoading}
          />

          {/* API Endpoints Table */}
          <APIEndpointsTable
            metrics={data?.metrics || []}
            isLoading={isLoading}
          />
        </div>
    </>
  )
}
