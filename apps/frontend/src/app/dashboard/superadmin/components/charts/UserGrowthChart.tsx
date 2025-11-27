'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChartWrapper } from './LineChartWrapper'
import { UserGrowthMetrics } from '../../hooks/useBusinessMetrics'
import { format } from 'date-fns'

interface UserGrowthChartProps {
  data: UserGrowthMetrics[]
  granularity?: 'day' | 'week' | 'month'
  summary?: {
    totalNewUsers: number
    avgChurnRate: number
    currentTotalUsers: number
    currentActiveUsers: number
  }
}

export function UserGrowthChart({ data, granularity = 'day', summary }: UserGrowthChartProps) {
  // Format data for the chart
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), granularity === 'month' ? 'MMM yyyy' : 'MMM dd'),
    'New Users': item.newUsers,
    'Total Users': item.totalUsers,
    'Active Users': item.activeUsers,
    'Churn Rate (%)': item.churnRate,
  }))

  // Format numbers with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Format tooltip values
  const tooltipFormatter = (value: any, name: string) => {
    if (name === 'Churn Rate (%)') {
      return `${value.toFixed(2)}%`
    }
    return formatNumber(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Growth Over Time</CardTitle>
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Total New Users</p>
              <p className="text-2xl font-bold">{formatNumber(summary.totalNewUsers)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Total Users</p>
              <p className="text-2xl font-bold">{formatNumber(summary.currentTotalUsers)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Active Users</p>
              <p className="text-2xl font-bold">{formatNumber(summary.currentActiveUsers)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Churn Rate</p>
              <p className="text-2xl font-bold">{summary.avgChurnRate.toFixed(2)}%</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* User Growth Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">User Metrics</h4>
            <LineChartWrapper
              data={chartData}
              xKey="date"
              lines={[
                { key: 'New Users', name: 'New Users', color: '#10b981' },
                { key: 'Total Users', name: 'Total Users', color: '#3b82f6' },
                { key: 'Active Users', name: 'Active Users', color: '#8b5cf6' },
              ]}
              height={300}
              tooltipFormatter={tooltipFormatter}
            />
          </div>

          {/* Churn Rate Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Churn Rate Trend</h4>
            <LineChartWrapper
              data={chartData}
              xKey="date"
              lines={[
                { key: 'Churn Rate (%)', name: 'Churn Rate', color: '#ef4444' },
              ]}
              height={200}
              tooltipFormatter={tooltipFormatter}
              yAxisFormatter={(value) => `${value}%`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
