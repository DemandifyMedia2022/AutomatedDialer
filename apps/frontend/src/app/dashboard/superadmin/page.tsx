'use client'

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Users, Activity, Phone, AlertTriangle, Server, Database, Globe, Cpu } from 'lucide-react'
import { MetricCard } from './components/cards/MetricCard'
import { SystemStatusCard } from './components/cards/SystemStatusCard'
import { AlertCard } from './components/cards/AlertCard'
import { useOverviewMetrics } from './hooks/useOverviewMetrics'
import { useSystemHealth } from './hooks/useSystemHealth'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function Page() {
  // Enable WebSocket for real-time updates on overview page
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics(30000, true)
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealth(30000, true)
  const { events, isConnected } = useActivityFeed({ autoConnect: true })

  // Get critical alerts from system health
  const criticalAlerts = systemHealth ? [
    systemHealth.frontend.status === 'down' && {
      title: 'Frontend Service Down',
      message: systemHealth.frontend.message || 'The frontend application is not responding',
      severity: 'critical' as const,
      timestamp: new Date(),
    },
    systemHealth.backend.status === 'down' && {
      title: 'Backend Service Down',
      message: systemHealth.backend.message || 'The backend API is not responding',
      severity: 'critical' as const,
      timestamp: new Date(),
    },
    systemHealth.database.status === 'down' && {
      title: 'Database Connection Failed',
      message: systemHealth.database.message || 'Cannot connect to the database',
      severity: 'critical' as const,
      timestamp: new Date(),
    },
    systemHealth.agentic.status === 'down' && {
      title: 'Agentic Service Down',
      message: systemHealth.agentic.message || 'The agentic dialing service is not responding',
      severity: 'critical' as const,
      timestamp: new Date(),
    },
    systemHealth.backend.status === 'degraded' && {
      title: 'Backend Performance Degraded',
      message: `Response time: ${systemHealth.backend.responseTime}ms (threshold exceeded)`,
      severity: 'warning' as const,
      timestamp: new Date(),
    },
    systemHealth.database.status === 'degraded' && {
      title: 'Database Performance Degraded',
      message: `Response time: ${systemHealth.database.responseTime}ms (threshold exceeded)`,
      severity: 'warning' as const,
      timestamp: new Date(),
    },
  ].filter(Boolean) : []

  // Get recent critical/error events from activity feed
  const recentCriticalEvents = events
    .filter(event => event.severity === 'critical' || event.severity === 'error')
    .slice(0, 3)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Super Admin Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Critical Alerts Section */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Critical Alerts
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {criticalAlerts.map((alert: any, index) => (
                <AlertCard
                  key={index}
                  title={alert.title}
                  message={alert.message}
                  severity={alert.severity}
                  timestamp={alert.timestamp}
                />
              ))}
            </div>
          </div>
        )}

        {/* System Health Status Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-3">System Health</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SystemStatusCard
              title="Frontend"
              status={systemHealth?.frontend.status || 'down'}
              icon={Globe}
              responseTime={systemHealth?.frontend.responseTime}
              uptime={systemHealth?.uptime.day}
              lastCheck={systemHealth?.frontend.lastCheck}
            />
            <SystemStatusCard
              title="Backend API"
              status={systemHealth?.backend.status || 'down'}
              icon={Server}
              responseTime={systemHealth?.backend.responseTime}
              uptime={systemHealth?.uptime.day}
              lastCheck={systemHealth?.backend.lastCheck}
            />
            <SystemStatusCard
              title="Database"
              status={systemHealth?.database.status || 'down'}
              icon={Database}
              responseTime={systemHealth?.database.responseTime}
              uptime={systemHealth?.uptime.day}
              lastCheck={systemHealth?.database.lastCheck}
            />
            <SystemStatusCard
              title="Agentic Service"
              status={systemHealth?.agentic.status || 'down'}
              icon={Cpu}
              responseTime={systemHealth?.agentic.responseTime}
              uptime={systemHealth?.uptime.day}
              lastCheck={systemHealth?.agentic.lastCheck}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={metricsLoading ? '...' : metrics?.totalUsers || 0}
              icon={Users}
              description="All registered users"
            />
            <MetricCard
              title="Active Users"
              value={metricsLoading ? '...' : metrics?.activeUsers || 0}
              icon={Activity}
              description="Users active in last 24h"
            />
            <MetricCard
              title="Calls Today"
              value={metricsLoading ? '...' : metrics?.totalCallsToday || 0}
              icon={Phone}
              description="Total calls placed today"
            />
            <MetricCard
              title="Active Campaigns"
              value={metricsLoading ? '...' : metrics?.activeCampaigns || 0}
              icon={Activity}
              description="Currently running campaigns"
            />
          </div>
        </div>

        {/* Recent Activity Feed Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Recent Activity
              {isConnected && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Live
                </Badge>
              )}
            </h2>
            <Link 
              href="/dashboard/superadmin/developer/activity-feed"
              className="text-sm text-primary hover:underline"
            >
              View All →
            </Link>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Latest Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isConnected ? 'No recent activity' : 'Connecting to activity feed...'}
                </p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              event.severity === 'critical' || event.severity === 'error'
                                ? 'destructive'
                                : event.severity === 'warning'
                                ? 'outline'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {event.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Critical Events from Activity Feed */}
        {recentCriticalEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Recent Critical Events
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recentCriticalEvents.map((event) => (
                <AlertCard
                  key={event.id}
                  title={`${event.type.toUpperCase()} Event`}
                  message={event.message}
                  severity={event.severity}
                  timestamp={new Date(event.timestamp)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

