'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HeatmapWrapper } from './HeatmapWrapper'
import { BarChartWrapper } from './BarChartWrapper'
import { LineChartWrapper } from './LineChartWrapper'
import { TimeSeriesDataPoint } from '../../hooks/useAPIMetrics'
import { Activity, BarChart3, TrendingUp } from 'lucide-react'

interface APIPerformanceChartProps {
  timeSeries: TimeSeriesDataPoint[]
  isLoading?: boolean
}

export function APIPerformanceChart({ timeSeries, isLoading }: APIPerformanceChartProps) {
  // Prepare heatmap data for request volume by hour
  const heatmapData = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return { cells: [], xLabels: [], yLabels: [] }

    // Group by day and hour
    const dataByDayHour = new Map<string, Map<number, number>>()
    
    timeSeries.forEach((point) => {
      const date = new Date(point.timestamp)
      const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const hour = date.getHours()
      
      if (!dataByDayHour.has(dayKey)) {
        dataByDayHour.set(dayKey, new Map())
      }
      
      const dayData = dataByDayHour.get(dayKey)!
      dayData.set(hour, (dayData.get(hour) || 0) + point.requestCount)
    })

    // Get unique days and hours
    const days = Array.from(dataByDayHour.keys())
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    // Create cells
    const cells = days.flatMap((day) =>
      hours.map((hour) => ({
        x: hour,
        y: day,
        value: dataByDayHour.get(day)?.get(hour) || 0,
      }))
    )

    return {
      cells,
      xLabels: hours.map((h) => `${h}:00`),
      yLabels: days,
    }
  }, [timeSeries])

  // Prepare response time distribution histogram
  const responseTimeDistribution = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return []

    // Create buckets for response times
    const buckets = [
      { range: '0-50ms', min: 0, max: 50, count: 0 },
      { range: '50-100ms', min: 50, max: 100, count: 0 },
      { range: '100-200ms', min: 100, max: 200, count: 0 },
      { range: '200-500ms', min: 200, max: 500, count: 0 },
      { range: '500-1000ms', min: 500, max: 1000, count: 0 },
      { range: '1000ms+', min: 1000, max: Infinity, count: 0 },
    ]

    timeSeries.forEach((point) => {
      const responseTime = point.avgResponseTime
      const bucket = buckets.find((b) => responseTime >= b.min && responseTime < b.max)
      if (bucket) {
        bucket.count += point.requestCount
      }
    })

    return buckets.map((b) => ({
      range: b.range,
      count: b.count,
    }))
  }, [timeSeries])

  // Prepare error rate trends
  const errorRateTrends = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return []

    return timeSeries.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      errorRate: point.errorCount > 0 
        ? ((point.errorCount / point.requestCount) * 100).toFixed(2)
        : 0,
      errorCount: point.errorCount,
      requestCount: point.requestCount,
    }))
  }, [timeSeries])

  // Prepare request volume over time
  const requestVolumeTrends = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return []

    return timeSeries.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      requests: point.requestCount,
      avgResponseTime: point.avgResponseTime,
    }))
  }, [timeSeries])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Performance Analytics</CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!timeSeries || timeSeries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Performance Analytics</CardTitle>
          <CardDescription>No performance data available for the selected time range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Performance Analytics</CardTitle>
        <CardDescription>
          Visualizations of API request patterns, response times, and error rates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="heatmap" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Request Heatmap</span>
              <span className="sm:hidden">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="volume" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Volume Trend</span>
              <span className="sm:hidden">Volume</span>
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Response Time</span>
              <span className="sm:hidden">Time</span>
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Error Rate</span>
              <span className="sm:hidden">Errors</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="heatmap" className="mt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Request Volume by Hour</h3>
              <p className="text-xs text-muted-foreground">
                Darker colors indicate higher request volumes
              </p>
              {heatmapData.cells.length > 0 ? (
                <HeatmapWrapper
                  data={heatmapData.cells}
                  xLabels={heatmapData.xLabels}
                  yLabels={heatmapData.yLabels}
                  height={300}
                  colorScale={{
                    min: 'hsl(217, 91%, 95%)',
                    mid: 'hsl(217, 91%, 60%)',
                    max: 'hsl(217, 91%, 35%)',
                  }}
                  valueFormatter={(v) => v.toLocaleString()}
                  showValues={false}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Insufficient data for heatmap
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="volume" className="mt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Request Volume Over Time</h3>
              <p className="text-xs text-muted-foreground">
                Total API requests and average response time
              </p>
              <LineChartWrapper
                data={requestVolumeTrends}
                xKey="time"
                lines={[
                  { key: 'requests', name: 'Requests', color: '#3b82f6' },
                  { key: 'avgResponseTime', name: 'Avg Response Time (ms)', color: '#10b981' },
                ]}
                height={350}
                xAxisFormatter={(value) => {
                  // Show only time for better readability
                  const parts = value.split(', ')
                  return parts.length > 1 ? parts[1] : value
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="mt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Response Time Distribution</h3>
              <p className="text-xs text-muted-foreground">
                Number of requests grouped by response time ranges
              </p>
              <BarChartWrapper
                data={responseTimeDistribution}
                xKey="range"
                bars={[{ key: 'count', name: 'Request Count', color: '#8b5cf6' }]}
                height={350}
                yAxisFormatter={(value) => value.toLocaleString()}
                tooltipFormatter={(value) => value.toLocaleString()}
              />
            </div>
          </TabsContent>

          <TabsContent value="errors" className="mt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Error Rate Trends</h3>
              <p className="text-xs text-muted-foreground">
                Percentage of failed requests over time
              </p>
              <LineChartWrapper
                data={errorRateTrends}
                xKey="time"
                lines={[
                  { key: 'errorRate', name: 'Error Rate (%)', color: '#ef4444' },
                ]}
                height={350}
                xAxisFormatter={(value) => {
                  // Show only time for better readability
                  const parts = value.split(', ')
                  return parts.length > 1 ? parts[1] : value
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
