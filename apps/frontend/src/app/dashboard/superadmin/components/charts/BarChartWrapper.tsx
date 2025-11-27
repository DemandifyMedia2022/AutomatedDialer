'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { chartTheme, getChartColor } from './chartConfig'

interface BarChartWrapperProps {
  data: any[]
  xKey: string
  bars: {
    key: string
    name: string
    color?: string
  }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  layout?: 'horizontal' | 'vertical'
  xAxisFormatter?: (value: any) => string
  yAxisFormatter?: (value: any) => string
  tooltipFormatter?: (value: any, name?: any) => string
}

export function BarChartWrapper({
  data,
  xKey,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal',
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
}: BarChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        {showGrid && <CartesianGrid {...chartTheme.grid} />}
        <XAxis
          dataKey={layout === 'horizontal' ? xKey : undefined}
          type={layout === 'horizontal' ? 'category' : 'number'}
          {...chartTheme.axis}
          tickFormatter={xAxisFormatter}
        />
        <YAxis
          dataKey={layout === 'vertical' ? xKey : undefined}
          type={layout === 'horizontal' ? 'number' : 'category'}
          {...chartTheme.axis}
          tickFormatter={yAxisFormatter}
        />
        <Tooltip
          {...chartTheme.tooltip}
          formatter={tooltipFormatter}
        />
        {showLegend && <Legend {...chartTheme.legend} />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color || getChartColor(index)}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
