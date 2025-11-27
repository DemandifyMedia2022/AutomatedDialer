'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { chartTheme, getChartColor } from './chartConfig'

interface LineChartWrapperProps {
  data: any[]
  xKey: string
  lines: {
    key: string
    name: string
    color?: string
  }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  xAxisFormatter?: (value: any) => string
  yAxisFormatter?: (value: any) => string
  tooltipFormatter?: (value: any, name?: any) => string
}

export function LineChartWrapper({
  data,
  xKey,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
}: LineChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
        {lines.map((line, index) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color || getChartColor(index)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
