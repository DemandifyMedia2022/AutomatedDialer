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
import { Users, PhoneCall, PhoneIncoming, Timer, Trophy, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { io, Socket } from "socket.io-client"

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
          <linearGradient id="chart-area-default" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect x={paddingX} y={paddingY} width={innerW} height={innerH} fill="transparent" />
        {/* horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line key={i} x1={paddingX} x2={paddingX + innerW} y1={paddingY + innerH * p} y2={paddingY + innerH * p} stroke="#e5e7eb" strokeDasharray="4 4" />
        ))}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {/* area fill below curve */}
        <path d={`${pathD} L ${paddingX + innerW} ${paddingY + innerH} L ${paddingX} ${paddingY + innerH} Z`} fill="url(#chart-area-default)" />
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
            <text key={`x-${i}`} x={paddingX + i * step} y={height - 4} textAnchor="middle" fontSize="11" fill="#6b7280">{d.label}</text>
          )
        })}
        {hover && (
          <g transform={`translate(${Math.min(hover.x + 8, width - 120)}, ${Math.max(hover.y - 36, 8)})`}>
            <rect rx="6" ry="6" width="110" height="40" fill="white" opacity="0.95" stroke="#e5e7eb" />
            <text x="8" y="16" fontSize="12" fill="#111827">{hover.label}</text>
            <text x="8" y="30" fontSize="12" fill="#6b7280">{hover.value}</text>
          </g>
        )}
      </svg>
    </div>
  )
}

export default function Page() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  const [summary, setSummary] = useState<{ totalAgents: number; online: number; available: number; onCall: number; idle: number; onBreak: number; offline: number } | null>(null)
  const [leaders, setLeaders] = useState<{ name: string; count: number }[]>([])
  const [series, setSeries] = useState<{ label: string; value: number }[]>([])
  const [range, setRange] = useState<'daily' | 'monthly'>('daily')

  const loadSummary = () => {
    return fetch(`${API_BASE}/api/presence/manager/summary`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d?.success) setSummary(d) })
      .catch(() => { })
  }

  useEffect(() => {
    loadSummary()
    const s: Socket = io(API_BASE, { withCredentials: true })
    const onAny = () => loadSummary()
    s.on('presence:update', onAny)
    s.on('session:opened', onAny)
    s.on('session:closed', onAny)
    s.on('break:started', onAny)
    s.on('break:ended', onAny)
    const poll = setInterval(loadSummary, 10000)
    return () => { s.off('presence:update', onAny); s.off('session:opened', onAny); s.off('session:closed', onAny); s.off('break:started', onAny); s.off('break:ended', onAny); s.close(); clearInterval(poll) }
  }, [])

  // Leaderboard: pull agents and sort by durationSeconds (today)
  const loadLeaders = () => {
    return fetch(`${API_BASE}/api/presence/manager/agents`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const items = (d?.items || []) as { name: string; durationSeconds: number }[]
        const top = items
          .slice()
          .sort((a, b) => b.durationSeconds - a.durationSeconds)
          .slice(0, 10)
          .map((it) => ({ name: it.name, count: Math.floor(it.durationSeconds / 60) }))
        setLeaders(top)
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
    return () => { s.off('presence:update', onAny); s.off('session:opened', onAny); s.off('session:closed', onAny); s.off('break:started', onAny); s.off('break:ended', onAny); s.close(); clearInterval(poll) }
  }, [summary])

  const metrics = useMemo(() => ({
    activeAgents: summary?.available ?? 0,
    avgCallsDialed: 56,
    avgCallsAnswered: 38,
    avgCampaignTime: '12m',
  }), [summary])

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
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Active Agents</CardTitle>
                    <CardDescription>Currently Available</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">{metrics.activeAgents}</div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 border-blue-500/20">
                    <PhoneCall className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Avg Calls Dialed/Agent</CardTitle>
                    <CardDescription>Today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">56</div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 border-violet-500/20">
                    <PhoneIncoming className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Avg Calls Answered</CardTitle>
                    <CardDescription>Today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">38</div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-amber-500/10 text-amber-700 border-amber-500/20">
                    <Timer className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Avg Campaign Time</CardTitle>
                    <CardDescription>Minutes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">12m</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-3 transition-shadow hover:shadow-sm">

              <CardContent>
                <Tabs defaultValue="daily">
                  <TabsList onClick={(e) => { }}
                    onChange={() => { }}
                  >
                    <TabsTrigger value="daily" onClick={() => setRange('daily')}>Daily</TabsTrigger>
                    <TabsTrigger value="monthly" onClick={() => setRange('monthly')}>Monthly</TabsTrigger>
                  </TabsList>
                  <TabsContent value="daily">
                    <AreaChart data={series} />
                  </TabsContent>
                  <TabsContent value="monthly">
                    <AreaChart data={series} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 border-blue-500/20">
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
                    <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`} alt={row.name} />
                          <AvatarFallback>{row.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="truncate text-sm">{row.name}</div>
                        {idx < 3 && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border bg-primary/5 text-primary border-primary/20">#{idx + 1}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium tabular-nums px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">{row.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <CardTitle className="font-medium text-base">Playbook</CardTitle>
                <CardDescription>Guided workflows for agents</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create standardized calling sequences, scripts, and dispositions to improve outcomes.</p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href="/dashboard/manager/playbook/upload">Add Playbook <Plus className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <CardTitle className="font-medium text-base">Campaign</CardTitle>
                <CardDescription>Manage campaign targets and pacing</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Set up new campaigns with audience, schedules, and success metrics to track performance.</p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href="/dashboard/manager/administration/campaigns">Add Campaign <Plus className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}