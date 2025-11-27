'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { chartTheme, getChartColor } from './chartConfig'

interface AreaChartWrapperProps {
  data: any[]
  xKey: string
  areas: {
    key: string
    name: string
    color?: string
  }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  stacked?: boolean
  xAxisFormatter?: (value: any) => string
  yAxisFormatter?: (value: any) => string
  tooltipFormatter?: (value: any) => string
}

export function AreaChartWrapper({
  data,
  xKey,
  areas,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
}: AreaChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid {...chartTheme.grid} />}
        <XAxis
          dataKey={xKey}
          {...chartTheme.axis}
          tickFormatter={xAxisFormatter}
        />
        <YAxis {...chartTheme.axis} tickFormatter={yAxisFormatter} />
        <Tooltip
          {...chartTheme.tooltip}
          formatter={tooltipFormatter}
        />
        {showLegend && <Legend {...chartTheme.legend} />}
        {areas.map((area, index) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.name}
            stroke={area.color || getChartColor(index)}
            fill={area.color || getChartColor(index)}
            fillOpacity={0.6}
            stackId={stacked ? '1' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
