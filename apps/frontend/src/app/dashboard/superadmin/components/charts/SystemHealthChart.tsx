'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChartWrapper } from './LineChartWrapper'
import { HealthSnapshot } from '../../hooks/useSystemHealth'
import { Loader2 } from 'lucide-react'

interface SystemHealthChartProps {
  data: HealthSnapshot[]
  isLoading?: boolean
  hours?: number
}

export function SystemHealthChart({ data, isLoading, hours = 24 }: SystemHealthChartProps) {
  // Transform data for the chart
  const chartData = data.map((snapshot) => {
    const timestamp = new Date(snapshot.timestamp)
    return {
      time: timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      fullTime: timestamp.toLocaleString(),
      backendResponse: snapshot.backend_response || 0,
      databaseResponse: snapshot.database_response || 0,
      errorRate: snapshot.error_rate ? snapshot.error_rate * 100 : 0,
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health History</CardTitle>
          <CardDescription>Response time and error rate trends</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health History</CardTitle>
          <CardDescription>Response time and error rate trends</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground">No historical data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health History</CardTitle>
        <CardDescription>
          Response time and error rate trends over the last {hours} hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Response Time Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Response Time (ms)</h4>
            <LineChartWrapper
              data={chartData}
              xKey="time"
              lines={[
                {
                  key: 'backendResponse',
                  name: 'Backend',
                  color: '#3b82f6',
                },
                {
                  key: 'databaseResponse',
                  name: 'Database',
                  color: '#10b981',
                },
              ]}
              height={250}
              yAxisFormatter={(value) => `${value}ms`}
              tooltipFormatter={(value) => `${value}ms`}
            />
          </div>

          {/* Error Rate Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Error Rate (%)</h4>
            <LineChartWrapper
              data={chartData}
              xKey="time"
              lines={[
                {
                  key: 'errorRate',
                  name: 'Error Rate',
                  color: '#ef4444',
                },
              ]}
              height={200}
              yAxisFormatter={(value) => `${value}%`}
              tooltipFormatter={(value) => `${value.toFixed(2)}%`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
