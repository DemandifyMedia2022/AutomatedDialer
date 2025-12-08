"use client"
import { ManagerSidebar } from "./components/ManagerSidebar"
import AIAssistant from "@/components/ai-assistant"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, PhoneCall, PhoneIncoming, Timer, Trophy, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { io, Socket } from "socket.io-client"

type CallRow = {
  id: number | string
  extension?: string | null
  username?: string | null
  destination?: string | null
  start_time?: string
  call_duration?: number | null
  disposition?: string | null
  recording_url?: string | null
  unique_id?: string | null
}

function AreaChart({ data, maxXTicks = 6 }: { data: { label: string; value: number }[]; maxXTicks?: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number } | null>(null)
  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const width = 640
  const height = 240
  const paddingX = 24
  const paddingY = 16
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW
  const pts = data.map((d, i) => {
    const x = paddingX + i * step
    const y = paddingY + (1 - d.value / max) * innerH
    return { x, y }
  })
  // Build a smooth curved path using Catmull-Rom to Bezier conversion
  const pathD = (() => {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
    const d: string[] = []
    d.push(`M ${pts[0].x} ${pts[0].y}`)
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      d.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`)
    }
    return d.join(' ')
  })()
  return (
    <div className="mt-2 h-60 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="chart-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="blue-200" stopOpacity="0.5" />
            <stop offset="100%" stopColor="blue" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect x={paddingX} y={paddingY} width={innerW} height={innerH} fill="transparent" />
        {/* horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line key={i} x1={paddingX} x2={paddingX + innerW} y1={paddingY + innerH * p} y2={paddingY + innerH * p} stroke="blue-900" strokeDasharray="4 4" className="transition-colors duration-300" />
        ))}
        <path d={pathD} fill="none" stroke="blue-700" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="transition-all duration-300" />
        {/* area fill below curve */}
        <path d={`${pathD} L ${paddingX + innerW} ${paddingY + innerH} L ${paddingX} ${paddingY + innerH} Z`} fill="url(#chart-area-gradient)" className="transition-all duration-300" />
        {/* hover hit-area only (no visible dots) */}
        {pts.map((p, i) => (
          <rect key={i} x={p.x - step / 2} width={step} y={paddingY} height={innerH} fill="transparent"
            onMouseEnter={() => setHover({ x: p.x, y: p.y, label: data[i].label, value: data[i].value })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {/* x-axis labels */}
        {data.map((d, i) => {
          const tickEvery = Math.max(1, Math.ceil(data.length / maxXTicks))
          if (i % tickEvery !== 0 && i !== data.length - 1) return null
          return (
            <text key={`x-${i}`} x={paddingX + i * step} y={height - 4} textAnchor="middle" fontSize="11" className="fill-muted-foreground">{d.label}</text>
          )
        })}
        {hover && (
          <g transform={`translate(${Math.min(hover.x + 8, width - 120)}, ${Math.max(hover.y - 36, 8)})`}>
            <rect rx="8" ry="8" width="110" height="44" className="fill-background stroke-border shadow-lg" strokeWidth="1" />
            <text x="8" y="18" fontSize="12" className="fill-foreground font-medium">{hover.label}</text>
            <text x="8" y="34" fontSize="13" className="fill-foreground font-semibold">{hover.value} calls</text>
          </g>
        )}
      </svg>
    </div>
  )
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0)
      return
    }

    const duration = 800
    const steps = 50
    const increment = value / steps
    const stepDuration = duration / steps
    
    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(increment * currentStep))
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [value])

  return <span className="inline-block tabular-nums">{displayValue}{suffix}</span>
}

function MetricCard({ 
  title, 
  description, 
  value, 
  icon, 
  tone 
}: { 
  title: string
  description: string
  value: string | number
  icon: React.ReactNode
  tone: "emerald" | "blue" | "violet" | "amber"
}) {
  const toneBg = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30",
  }[tone]

  // Parse numeric value and suffix
  const numericMatch = typeof value === 'string' ? value.match(/^(\d+)(.*)$/) : null
  const numericValue = numericMatch ? parseInt(numericMatch[1]) : (typeof value === 'number' ? value : 0)
  const suffix = numericMatch ? numericMatch[2] : (typeof value === 'string' && !numericMatch ? value : '')
  
  return (
    <Card className="transition-shadow hover:shadow-md duration-200">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={`grid size-10 place-items-center rounded-full border ${toneBg}`}>
            {icon}
          </div>
          <div>
            <CardTitle className="font-medium text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">
          {numericMatch || typeof value === 'number' ? (
            <AnimatedNumber value={numericValue} suffix={suffix} />
          ) : (
            value
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  const [summary, setSummary] = useState<{ totalAgents: number; online: number; available: number; onCall: number; idle: number; onBreak: number; offline: number } | null>(null)
  const [leaders, setLeaders] = useState<{ name: string; count: number }[]>([])
  const [series, setSeries] = useState<{ label: string; value: number }[]>([])
  const [range, setRange] = useState<'daily' | 'monthly'>('daily')
  const [isConnected, setIsConnected] = useState(false)
  const [managerMetrics, setManagerMetrics] = useState<{ avgCallsDialed: number; avgCallsAnswered: number; totalCallsDialed: number; totalCallsAnswered: number; avgCampaignTime: number } | null>(null)

  const loadSummary = () => {
    return fetch(`${API_BASE}/api/presence/manager/summary`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d?.success) setSummary(d) })
      .catch(() => { })
  }

  // Load manager analytics with daily filtering
  const loadManagerMetrics = () => {
    const getTodayDateRange = () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      return { startOfDay, endOfDay }
    }

    const { startOfDay, endOfDay } = getTodayDateRange()
    const dateParams = `from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`

    // Fetch total calls data for today
    return fetch(`${API_BASE}/api/calls?${dateParams}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.success && d?.items) {
          const calls: CallRow[] = d.items
          const totalCallsDialed = calls.length
          const totalCallsAnswered = calls.filter(call => call.disposition === 'ANSWERED').length
          
          // Calculate average campaign time (in minutes) from answered calls
          const answeredCalls = calls.filter(call => call.disposition === 'ANSWERED' && call.call_duration)
          const totalCallDuration = answeredCalls.reduce((sum, call) => sum + (call.call_duration || 0), 0)
          const avgCampaignTime = answeredCalls.length > 0 ? Math.round(totalCallDuration / answeredCalls.length / 60) : 0
          
          const activeAgents = summary?.available || 1
          
          const avgCallsDialed = activeAgents > 0 ? Math.round(totalCallsDialed / activeAgents) : 0
          const avgCallsAnswered = activeAgents > 0 ? Math.round(totalCallsAnswered / activeAgents) : 0
          
          setManagerMetrics({
            avgCallsDialed,
            avgCallsAnswered,
            totalCallsDialed,
            totalCallsAnswered,
            avgCampaignTime
          })
        }
      })
      .catch(() => {
        // Fallback values
        setManagerMetrics({
          avgCallsDialed: 0,
          avgCallsAnswered: 0,
          totalCallsDialed: 0,
          totalCallsAnswered: 0,
          avgCampaignTime: 0
        })
      })
  }

  useEffect(() => {
    loadSummary()
    const s: Socket = io(API_BASE, { withCredentials: true })
    
    s.on('connect', () => setIsConnected(true))
    s.on('disconnect', () => setIsConnected(false))
    
    const onAny = () => loadSummary()
    s.on('presence:update', onAny)
    s.on('session:opened', onAny)
    s.on('session:closed', onAny)
    s.on('break:started', onAny)
    s.on('break:ended', onAny)
    const poll = setInterval(loadSummary, 10000)
    return () => { 
      s.off('connect')
      s.off('disconnect')
      s.off('presence:update', onAny)
      s.off('session:opened', onAny)
      s.off('session:closed', onAny)
      s.off('break:started', onAny)
      s.off('break:ended', onAny)
      s.close()
      clearInterval(poll)
    }
  }, [])

  // Leaderboard: pull from analytics leaderboard API with daily filtering
  const loadLeaders = () => {
    const getTodayDateRange = () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      return { startOfDay, endOfDay }
    }

    const { startOfDay, endOfDay } = getTodayDateRange()
    const dateParams = `from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`

    return fetch(`${API_BASE}/api/analytics/leaderboard?${dateParams}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const items = (d?.items || []) as { name: string; count: number }[]
        setLeaders(items)
      }).catch(() => { })
  }

  useEffect(() => {
    loadLeaders()
    const s: Socket = io(API_BASE, { withCredentials: true })
    
    const onAny = () => loadLeaders()
    s.on('presence:update', onAny)
    s.on('session:opened', onAny)
    s.on('session:closed', onAny)
    s.on('break:started', onAny)
    s.on('break:ended', onAny)
    const poll = setInterval(loadLeaders, 10000)
    return () => { 
      s.off('presence:update', onAny)
      s.off('session:opened', onAny)
      s.off('session:closed', onAny)
      s.off('break:started', onAny)
      s.off('break:ended', onAny)
      s.close()
      clearInterval(poll)
    }
  }, [summary])

  const metrics = useMemo(() => ({
    activeAgents: summary?.available ?? 0,
    avgCallsDialed: managerMetrics?.avgCallsDialed ?? 0,
    avgCallsAnswered: managerMetrics?.avgCallsAnswered ?? 0,
    avgCampaignTime: managerMetrics?.avgCampaignTime ?? 0,
  }), [summary, managerMetrics])

  // Load manager metrics when summary is available
  useEffect(() => {
    if (summary) {
      loadManagerMetrics()
    }
  }, [summary])

  // Set up real-time updates for manager metrics
  useEffect(() => {
    const interval = setInterval(() => {
      if (summary) {
        loadManagerMetrics()
      }
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [summary])

  // Fetch calls series for selected range
  const loadSeries = () => {
    return fetch(`${API_BASE}/api/presence/manager/calls-series?range=${range}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d?.success) return
        const raw: { label: string; value: number }[] = d.series || []
        const windowSize = range === 'daily' ? 12 : 12
        let lastNonZero = -1
        for (let i = raw.length - 1; i >= 0; i--) { if (raw[i].value > 0) { lastNonZero = i; break } }
        const end = lastNonZero === -1 ? raw.length : lastNonZero + 1
        const start = Math.max(0, end - windowSize)
        const trimmed = raw.slice(start, end)
        setSeries(trimmed)
      })
      .catch(() => { })
  }
  useEffect(() => { loadSeries() }, [range])

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Manager</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto ">
              <AIAssistant userRole="manager" />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Live Status Indicator */}
          {isConnected && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </Badge>
              <span className="text-xs text-muted-foreground">Real-time updates active</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Active Agents"
              description="Currently Available"
              value={metrics.activeAgents}
              icon={<Users className="size-4" />}
              tone="emerald"
            />
            <MetricCard
              title="Avg Calls Dialed/Agent"
              description="Today"
              value={metrics.avgCallsDialed}
              icon={<PhoneCall className="size-4" />}
              tone="blue"
            />
            <MetricCard
              title="Avg Calls Answered"
              description="Today"
              value={metrics.avgCallsAnswered}
              icon={<PhoneIncoming className="size-4" />}
              tone="violet"
            />
            <MetricCard
              title="Avg Campaign Time"
              description="Minutes"
              value={`${metrics.avgCampaignTime}m`}
              icon={<Timer className="size-4" />}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-3 transition-shadow hover:shadow-md duration-200">
              <CardHeader>
                <CardTitle className="font-medium text-base">Calls Trend</CardTitle>
                <CardDescription>Call volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="daily" className="w-full">
                  <TabsList>
                    <TabsTrigger value="daily" onClick={() => setRange('daily')}>Daily</TabsTrigger>
                    <TabsTrigger value="monthly" onClick={() => setRange('monthly')}>Monthly</TabsTrigger>
                  </TabsList>
                  <TabsContent value="daily" className="transition-opacity duration-300">
                    <AreaChart data={series} />
                  </TabsContent>
                  <TabsContent value="monthly" className="transition-opacity duration-300">
                    <AreaChart data={series} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30">
                    <Trophy className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Leader Board</CardTitle>
                    <CardDescription>Top performers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaders.map((row, idx) => (
                    <div 
                      key={row.name} 
                      className="grid grid-cols-[1fr_auto] items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`} alt={row.name} />
                          <AvatarFallback className="text-xs font-semibold">{row.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{row.name}</div>
                          {idx < 3 && (
                            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 font-semibold">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums px-2.5 py-1 rounded-full bg-green-500/10 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 dark:border-green-500/30">
                        {row.count} leads
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Playbook</CardTitle>
                    <CardDescription>Guided workflows for agents</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create standardized calling sequences, scripts, and dispositions to improve outcomes.</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/dashboard/manager/playbook/upload">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Playbook
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Campaign</CardTitle>
                    <CardDescription>Manage campaign targets and pacing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Set up new campaigns with audience, schedules, and success metrics to track performance.</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/dashboard/manager/administration/campaigns">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Campaign
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}