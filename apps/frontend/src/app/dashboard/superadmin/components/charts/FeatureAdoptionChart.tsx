'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChartWrapper } from './BarChartWrapper'
import { FeatureAdoption } from '../../hooks/useBusinessMetrics'

interface FeatureAdoptionChartProps {
  data: FeatureAdoption[]
  summary?: {
    avgAdoptionRate: number
    mostAdoptedFeature: string
    leastAdoptedFeature: string
    totalFeatures: number
  }
}

export function FeatureAdoptionChart({ data, summary }: FeatureAdoptionChartProps) {
  // Format data for the chart
  const chartData = data.map((item) => ({
    feature: item.featureName,
    'Adoption Rate (%)': item.adoptionRate,
    'Active Users': item.activeUsers,
    'Avg Usage': item.avgUsagePerUser,
  }))

  // Format numbers with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Format tooltip values
  const tooltipFormatter = (value: any, name: string) => {
    if (name === 'Adoption Rate (%)') {
      return `${value.toFixed(2)}%`
    }
    if (name === 'Avg Usage') {
      return value.toFixed(2)
    }
    return formatNumber(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Adoption Rates</CardTitle>
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Features</p>
              <p className="text-2xl font-bold">{summary.totalFeatures}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Adoption Rate</p>
              <p className="text-2xl font-bold">{summary.avgAdoptionRate.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most Adopted</p>
              <p className="text-lg font-semibold truncate">{summary.mostAdoptedFeature}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Least Adopted</p>
              <p className="text-lg font-semibold truncate">{summary.leastAdoptedFeature}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Adoption Rate Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Adoption Rate by Feature</h4>
            <BarChartWrapper
              data={chartData}
              xKey="feature"
              bars={[
                { key: 'Adoption Rate (%)', name: 'Adoption Rate', color: '#3b82f6' },
              ]}
              height={300}
              tooltipFormatter={tooltipFormatter}
              yAxisFormatter={(value) => `${value}%`}
            />
          </div>

          {/* Active Users Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Active Users per Feature</h4>
            <BarChartWrapper
              data={chartData}
              xKey="feature"
              bars={[
                { key: 'Active Users', name: 'Active Users', color: '#10b981' },
              ]}
              height={250}
              tooltipFormatter={tooltipFormatter}
            />
          </div>

          {/* Average Usage Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Average Usage per User</h4>
            <BarChartWrapper
              data={chartData}
              xKey="feature"
              bars={[
                { key: 'Avg Usage', name: 'Avg Usage', color: '#8b5cf6' },
              ]}
              height={250}
              tooltipFormatter={tooltipFormatter}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
