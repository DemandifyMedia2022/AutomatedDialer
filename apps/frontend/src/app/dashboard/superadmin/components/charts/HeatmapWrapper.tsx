'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface HeatmapCell {
  x: string | number
  y: string | number
  value: number
}

interface HeatmapWrapperProps {
  data: HeatmapCell[]
  xLabels: (string | number)[]
  yLabels: (string | number)[]
  height?: number
  colorScale?: {
    min: string
    mid: string
    max: string
  }
  valueFormatter?: (value: number) => string
  showValues?: boolean
}

export function HeatmapWrapper({
  data,
  xLabels,
  yLabels,
  height = 300,
  colorScale = {
    min: 'hsl(142, 76%, 90%)',
    mid: 'hsl(142, 76%, 60%)',
    max: 'hsl(142, 76%, 36%)',
  },
  valueFormatter = (v) => v.toString(),
  showValues = true,
}: HeatmapWrapperProps) {
  const { minValue, maxValue } = useMemo(() => {
    const values = data.map((d) => d.value)
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    }
  }, [data])

  const getColor = (value: number) => {
    if (maxValue === minValue) return colorScale.mid

    const normalized = (value - minValue) / (maxValue - minValue)
    
    if (normalized < 0.5) {
      // Interpolate between min and mid
      const ratio = normalized * 2
      return interpolateColor(colorScale.min, colorScale.mid, ratio)
    } else {
      // Interpolate between mid and max
      const ratio = (normalized - 0.5) * 2
      return interpolateColor(colorScale.mid, colorScale.max, ratio)
    }
  }

  const getCellValue = (x: string | number, y: string | number) => {
    const cell = data.find((d) => d.x === x && d.y === y)
    return cell?.value ?? 0
  }

  const cellWidth = 100 / xLabels.length
  const cellHeight = height / yLabels.length

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Y-axis labels and cells */}
        <div className="flex">
          {/* Y-axis labels */}
          <div className="flex flex-col" style={{ width: '80px' }}>
            <div style={{ height: '40px' }} /> {/* Spacer for X-axis labels */}
            {yLabels.map((label) => (
              <div
                key={label}
                className="flex items-center justify-end pr-2 text-xs text-muted-foreground"
                style={{ height: `${cellHeight}px` }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex-1">
            {/* X-axis labels */}
            <div className="flex" style={{ height: '40px' }}>
              {xLabels.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-center text-xs text-muted-foreground"
                  style={{ width: `${cellWidth}%` }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Cells */}
            {yLabels.map((yLabel) => (
              <div key={yLabel} className="flex">
                {xLabels.map((xLabel) => {
                  const value = getCellValue(xLabel, yLabel)
                  return (
                    <div
                      key={`${xLabel}-${yLabel}`}
                      className={cn(
                        'flex items-center justify-center border border-border text-xs font-medium transition-opacity hover:opacity-80',
                        showValues && 'cursor-default'
                      )}
                      style={{
                        width: `${cellWidth}%`,
                        height: `${cellHeight}px`,
                        backgroundColor: getColor(value),
                      }}
                      title={`${xLabel}, ${yLabel}: ${valueFormatter(value)}`}
                    >
                      {showValues && valueFormatter(value)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center mt-4 gap-2">
          <span className="text-xs text-muted-foreground">
            {valueFormatter(minValue)}
          </span>
          <div className="flex h-4 w-48 rounded overflow-hidden">
            <div className="flex-1" style={{ backgroundColor: colorScale.min }} />
            <div className="flex-1" style={{ backgroundColor: colorScale.mid }} />
            <div className="flex-1" style={{ backgroundColor: colorScale.max }} />
          </div>
          <span className="text-xs text-muted-foreground">
            {valueFormatter(maxValue)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Helper function to interpolate between two HSL colors
function interpolateColor(color1: string, color2: string, ratio: number): string {
  // Simple implementation - in production, use a proper color library
  return ratio < 0.5 ? color1 : color2
}
