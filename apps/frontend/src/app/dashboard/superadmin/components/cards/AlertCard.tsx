import { LucideIcon, AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

interface AlertCardProps {
  title: string
  message: string
  severity: AlertSeverity
  icon?: LucideIcon
  timestamp?: Date
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  error: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  critical: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
}

export function AlertCard({
  title,
  message,
  severity,
  icon,
  timestamp,
  action,
  className,
}: AlertCardProps) {
  const config = severityConfig[severity]
  const Icon = icon || config.icon

  return (
    <Card className={cn('border-l-4', config.borderColor, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={cn('rounded-full p-1 mt-0.5', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'mt-3 text-xs font-medium hover:underline',
              config.color
            )}
          >
            {action.label} →
          </button>
        )}
      </CardContent>
    </Card>
  )
}
