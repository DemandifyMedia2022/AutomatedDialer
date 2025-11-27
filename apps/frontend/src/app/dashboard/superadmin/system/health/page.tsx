'use client'

import { Activity, Database, Globe, Cpu, Server } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SystemStatusCard } from '../../components/cards/SystemStatusCard'
import { SystemHealthChart } from '../../components/charts/SystemHealthChart'
import { useSystemHealth, useSystemHealthHistory } from '../../hooks/useSystemHealth'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

export default function SystemHealthPage() {
  const { data: health, isLoading: healthLoading, error: healthError } = useSystemHealth(30000)
  const { data: history, isLoading: historyLoading } = useSystemHealthHistory(24)

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/superadmin">Super Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>System Health</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {healthError && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">
              Failed to load system health data
            </Card>
          )}

          {/* Component Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {healthLoading ? (
              <>
                <Skeleton className="h-[180px]" />
                <Skeleton className="h-[180px]" />
                <Skeleton className="h-[180px]" />
                <Skeleton className="h-[180px]" />
              </>
            ) : health ? (
              <>
                <SystemStatusCard
                  title="Frontend"
                  status={health.frontend.status}
                  icon={Globe}
                  responseTime={health.frontend.responseTime}
                  lastCheck={health.frontend.lastCheck}
                />
                <SystemStatusCard
                  title="Backend API"
                  status={health.backend.status}
                  icon={Server}
                  responseTime={health.backend.responseTime}
                  uptime={health.uptime.day}
                  lastCheck={health.backend.lastCheck}
                />
                <SystemStatusCard
                  title="Database"
                  status={health.database.status}
                  icon={Database}
                  responseTime={health.database.responseTime}
                  uptime={health.uptime.day}
                  lastCheck={health.database.lastCheck}
                />
                <SystemStatusCard
                  title="Agentic Service"
                  status={health.agentic.status}
                  icon={Cpu}
                  responseTime={health.agentic.responseTime}
                  lastCheck={health.agentic.lastCheck}
                />
              </>
            ) : null}
          </div>

          {/* Detailed Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Response Time Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Response Time Metrics
                </CardTitle>
                <CardDescription>Average response times for system components</CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : health ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium">Backend API</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {health.backend.responseTime || 0}
                        </span>
                        <span className="text-sm text-muted-foreground">ms</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Database</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {health.database.responseTime || 0}
                        </span>
                        <span className="text-sm text-muted-foreground">ms</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-sm font-medium">Frontend</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {health.frontend.responseTime || 0}
                        </span>
                        <span className="text-sm text-muted-foreground">ms</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Database Connection Pool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Connection Pool
                </CardTitle>
                <CardDescription>Current connection pool statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : health?.poolStats ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Connections</span>
                      <span className="text-2xl font-bold">{health.poolStats.active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Idle Connections</span>
                      <span className="text-2xl font-bold">{health.poolStats.idle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Pool Size</span>
                      <span className="text-2xl font-bold">{health.poolStats.total}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pool Utilization</span>
                        <span className="font-medium">
                          {health.poolStats.total > 0
                            ? Math.round((health.poolStats.active / health.poolStats.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Uptime Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Uptime Statistics</CardTitle>
              <CardDescription>System availability over different time periods</CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : health?.uptime ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                    <p className="text-3xl font-bold">{health.uptime.day.toFixed(2)}%</p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${health.uptime.day}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Last 7 Days</p>
                    <p className="text-3xl font-bold">{health.uptime.week.toFixed(2)}%</p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${health.uptime.week}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                    <p className="text-3xl font-bold">{health.uptime.month.toFixed(2)}%</p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${health.uptime.month}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Historical Charts */}
          <SystemHealthChart
            data={history?.snapshots || []}
            isLoading={historyLoading}
            hours={24}
          />
        </div>
    </>
  )
}
