/**
 * Chart theme configuration for Recharts
 */

export const chartColors = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  error: 'hsl(0, 84%, 60%)',
  info: 'hsl(199, 89%, 48%)',
  muted: 'hsl(var(--muted-foreground))',
  
  // Chart palette
  chart1: 'hsl(221, 83%, 53%)',
  chart2: 'hsl(142, 76%, 36%)',
  chart3: 'hsl(38, 92%, 50%)',
  chart4: 'hsl(280, 65%, 60%)',
  chart5: 'hsl(340, 82%, 52%)',
  chart6: 'hsl(199, 89%, 48%)',
}

export const chartTheme = {
  colors: chartColors,
  
  // Default styles for chart elements
  axis: {
    stroke: 'hsl(var(--border))',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
  },
  
  grid: {
    stroke: 'hsl(var(--border))',
    strokeDasharray: '3 3',
    opacity: 0.3,
  },
  
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '12px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
    labelStyle: {
      color: 'hsl(var(--popover-foreground))',
      fontWeight: 600,
      marginBottom: '4px',
    },
    itemStyle: {
      color: 'hsl(var(--muted-foreground))',
    },
  },
  
  legend: {
    iconType: 'circle' as const,
    wrapperStyle: {
      fontSize: '12px',
      fontFamily: 'var(--font-sans)',
    },
  },
}

/**
 * Get a color from the chart palette by index
 */
export function getChartColor(index: number): string {
  const colors = [
    chartColors.chart1,
    chartColors.chart2,
    chartColors.chart3,
    chartColors.chart4,
    chartColors.chart5,
    chartColors.chart6,
  ]
  return colors[index % colors.length]
}

/**
 * Format large numbers for chart display
 */
export function formatChartNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Format percentage for chart display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Format duration in milliseconds for chart display
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms}ms`
}
