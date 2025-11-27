'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { chartTheme, getChartColor } from './chartConfig'

interface PieChartWrapperProps {
  data: any[]
  dataKey: string
  nameKey: string
  height?: number
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
  colors?: string[]
  tooltipFormatter?: (value: any) => string
}

export function PieChartWrapper({
  data,
  dataKey,
  nameKey,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
  colors,
  tooltipFormatter,
}: PieChartWrapperProps) {
  const getColor = (index: number) => {
    if (colors && colors[index]) {
      return colors[index]
    }
    return getChartColor(index)
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          label={(entry) => entry[nameKey]}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(index)} />
          ))}
        </Pie>
        <Tooltip
          {...chartTheme.tooltip}
          formatter={tooltipFormatter}
        />
        {showLegend && <Legend {...chartTheme.legend} />}
      </PieChart>
    </ResponsiveContainer>
  )
}
