import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

export type SystemStatus = 'healthy' | 'degraded' | 'down'

interface SystemStatusCardProps {
  title: string
  status: SystemStatus
  icon?: LucideIcon
  responseTime?: number
  uptime?: number
  lastCheck?: Date
  className?: string
}

const statusConfig = {
  healthy: {
    label: 'Healthy',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  down: {
    label: 'Down',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
}

export function SystemStatusCard({
  title,
  status,
  icon: Icon,
  responseTime,
  uptime,
  lastCheck,
  className,
}: SystemStatusCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className={cn('rounded-full p-1', config.bgColor)}>
            <StatusIcon className={cn('h-4 w-4', config.color)} />
          </div>
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
        </div>
        
        <div className="mt-3 space-y-1">
          {responseTime !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Response Time</span>
              <span className="font-medium">{responseTime}ms</span>
            </div>
          )}
          {uptime !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium">{uptime.toFixed(2)}%</span>
            </div>
          )}
          {lastCheck && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Last Check</span>
              <span className="font-medium">
                {new Date(lastCheck).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
