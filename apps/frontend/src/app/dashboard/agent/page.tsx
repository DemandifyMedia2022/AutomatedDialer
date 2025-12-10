"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AgentSidebar } from "./components/AgentSidebar"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { ArrowDownRight, ArrowUpRight, PhoneCall, PhoneIncoming, Voicemail, UsersRound, AlertCircle, Phone, Zap, Hand, TrendingUp, Calendar, BarChart3, Trophy, Medal, Star } from "lucide-react"
import { WorldMap } from "./components/WorldMap"
import { DispositionChart } from "./components/DispositionChart"
import { PeriodSwitcher } from "./components/PeriodSwitcher"
import AIAssistant from "@/components/ai-assistant"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useFollowUpNotifications } from "@/hooks/useFollowUpNotifications"

type MetricResponse = {
  callsDialed: number
  answered: number
  voicemail: number
  unanswered: number
  conversations: number
  connectRate: number
  conversationRate: number
  dispositions: { name: string; count: number }[]
  leaderboard: { name: string; count: number; avatar?: string }[]
}

type DispositionData = {
  daily: { name: string; count: number }[]
  monthly: { name: string; count: number }[]
}

type LeaderboardData = {
  daily: { name: string; count: number }[]
  monthly: { name: string; count: number }[]
}

export default function Page() {
  const { user } = useAuth()
  const router = useRouter()
  useFollowUpNotifications() // Initialize login notifications only on the dashboard

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MetricResponse | null>(null)
  const [dispositionData, setDispositionData] = useState<DispositionData | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [dialingDialogOpen, setDialingDialogOpen] = useState(false)
  const [dispositionView, setDispositionView] = useState<'daily' | 'monthly'>('daily')
  const [leaderboardView, setLeaderboardView] = useState<'daily' | 'monthly'>('daily')

  // Format agent name from user email (same logic as sidebar)
  const agentName = user?.email
    ? user.email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
    : "Agent"


  const fetchDispositionData = async () => {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }

      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/agent/dispositions/daily`, { headers, credentials }),
        fetch(`${API_BASE}/api/analytics/agent/dispositions/monthly`, { headers, credentials })
      ])

      const dailyData = dailyRes.ok ? await dailyRes.json() : { daily: [] }
      const monthlyData = monthlyRes.ok ? await monthlyRes.json() : { monthly: [] }

      setDispositionData({
        daily: dailyData.daily || [],
        monthly: monthlyData.monthly || []
      })
    } catch (error) {
      console.error('Error fetching disposition data:', error)
      // Fallback demo data
      setDispositionData({
        daily: [
          { name: "ANSWERED", count: 45 },
          { name: "NO ANSWER", count: 32 },
          { name: "VOICEMAIL", count: 18 },
          { name: "BUSY", count: 5 }
        ],
        monthly: [
          { name: "ANSWERED", count: 1240 },
          { name: "NO ANSWER", count: 890 },
          { name: "VOICEMAIL", count: 420 },
          { name: "BUSY", count: 150 }
        ]
      })
    }
  }

  const fetchLeaderboardData = async () => {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }

      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/leaderboard/daily`, { headers, credentials }),
        fetch(`${API_BASE}/api/analytics/leaderboard/monthly`, { headers, credentials })
      ])

      const dailyData = dailyRes.ok ? await dailyRes.json() : { daily: [] }
      const monthlyData = monthlyRes.ok ? await monthlyRes.json() : { monthly: [] }

      setLeaderboardData({
        daily: dailyData.daily || [],
        monthly: monthlyData.monthly || []
      })
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      // Fallback demo data
      setLeaderboardData({
        daily: [
          { name: "Alex Johnson", count: 12 },
          { name: "Priya Singh", count: 9 },
          { name: "Rahul Mehta", count: 8 },
          { name: "Sara Lee", count: 6 }
        ],
        monthly: [
          { name: "Alex Johnson", count: 245 },
          { name: "Priya Singh", count: 198 },
          { name: "Rahul Mehta", count: 176 },
          { name: "Sara Lee", count: 154 }
        ]
      })
    }
  }

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }

      // Get today's date range (start of day to end of day)
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const res = await fetch(`${API_BASE}/api/analytics/agent?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`, { headers, credentials })
      if (res.ok) {
        const json = await res.json()
        setData((prev) => ({ ...(prev || json), ...json }))
        setError(null)
      } else {
        throw new Error(String(res.status))
      }
    } catch (err) {
      // Fallback demo data
      const fallback: MetricResponse = {
        callsDialed: 1240,
        answered: 420,
        voicemail: 210,
        unanswered: 610,
        conversations: 310,
        connectRate: Math.round((420 / 1240) * 100),
        conversationRate: Math.round((310 / 1240) * 100),
        dispositions: [
          { name: "Answered", count: 420 },
          { name: "Voicemail", count: 210 },
          { name: "No Answer", count: 540 },
          { name: "Busy", count: 60 },
          { name: "Failed", count: 10 },
        ],
        leaderboard: [
          { name: "Alex Johnson", count: 52 },
          { name: "Priya Singh", count: 49 },
          { name: "Rahul Mehta", count: 45 },
          { name: "Sara Lee", count: 42 },
        ],
      }
      setData(fallback)
      setError("Using demo data - API unavailable")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    fetchDispositionData()
    fetchLeaderboardData()
  }, [])

  return (
    <SidebarProvider>
      <AgentSidebar />
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
                  <BreadcrumbPage>Agent</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <AIAssistant />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
          {/* Greeting Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Hello, {agentName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's your performance overview for today
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="default"
                className="gap-2"
                onClick={() => setDialingDialogOpen(true)}
              >
                <Phone className="h-4 w-4" />
                Start Dialing
              </Button>
            </div>
          </div>

          {error && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-amber-900 dark:text-amber-200">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Connect Rate"
              value={(data?.connectRate ?? 0) + "%"}
              icon={<ArrowUpRight className="h-5 w-5" />}
              tone="emerald"
              loading={loading}
            />

            <StatCard
              title="Calls Dialed"
              value={String(data?.callsDialed ?? 0)}
              icon={<PhoneCall className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />

            <StatCard
              title="Answered Calls"
              value={String(data?.answered ?? 0)}
              icon={<PhoneIncoming className="h-5 w-5" />}
              tone="violet"
              loading={loading}
            />

            <StatCard
              title="Conversation Rate"
              value={(data?.conversationRate ?? 0) + "%"}
              icon={<UsersRound className="h-5 w-5" />}
              tone="amber"
              loading={loading}
            />

            <StatCard
              title="Voicemail Dropped"
              value={String(data?.voicemail ?? 0)}
              icon={<Voicemail className="h-5 w-5" />}
              tone="fuchsia"
              loading={loading}
            />

            <StatCard
              title="Unanswered Calls"
              value={String(data?.unanswered ?? 0)}
              icon={<ArrowDownRight className="h-5 w-5" />}
              tone="rose"
              loading={loading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Call Disposition Analytics</CardTitle>
                  <PeriodSwitcher value={dispositionView} onChange={setDispositionView} />
                </div>
              </CardHeader>
              <CardContent>
                {loading && !dispositionData ? (
                  <div className="w-full h-[300px] flex items-center justify-center">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                ) : (
                  <DispositionChart view={dispositionView} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Leaderboard</CardTitle>
                  <PeriodSwitcher value={leaderboardView} onChange={setLeaderboardView} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loading && !leaderboardData ? (
                    <>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                      ))}
                    </>
                  ) : (leaderboardData?.[leaderboardView] ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
                        <div className="relative bg-background border rounded-full p-4 shadow-sm">
                          <Trophy className="h-10 w-10 text-yellow-500" />
                          <div className="absolute -top-1 -right-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                          </div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">No Champions Yet</h3>
                      <p className="text-sm text-muted-foreground max-w-[200px]">
                        Start dialing to climb the ranks and earn your spot on the leaderboard!
                      </p>
                    </div>
                  ) : (
                    (leaderboardData?.[leaderboardView] ?? []).map((row, idx) => (
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
                          {row.count} {leaderboardView === 'daily' ? 'today' : 'this month'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            <WorldMap />
          </div>
        </div>
      </SidebarInset>

      {/* Dialing Method Dialog */}
      <Dialog open={dialingDialogOpen} onOpenChange={setDialingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Dialing Method</DialogTitle>
            <DialogDescription>
              Select how you want to start dialing
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              size="lg"
              className="h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-transform"
              onClick={() => {
                setDialingDialogOpen(false)
                router.push('/dashboard/agent/dialer/manual')
              }}
            >
              <Hand className="h-8 w-8" />
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">Manual Dialing</span>
                <span className="text-xs font-normal opacity-80">Dial numbers manually with full control</span>
              </div>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-transform"
              onClick={() => {
                setDialingDialogOpen(false)
                router.push('/dashboard/agent/dialer/automated')
              }}
            >
              <Zap className="h-8 w-8" />
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">Automated Dialing</span>
                <span className="text-xs font-normal opacity-80">Let the system dial automatically</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0)
      return
    }

    const duration = 800 // 0.8 second animation
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

function StatCard({ title, value, icon, tone, loading }: { title: string; value: string; icon: React.ReactNode; tone: "emerald" | "blue" | "violet" | "amber" | "fuchsia" | "rose"; loading?: boolean }) {
  const toneBg = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/20 dark:bg-fuchsia-500/15 dark:border-fuchsia-500/30",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30",
  }[tone]

  // Parse numeric value and suffix
  const numericMatch = value.match(/^(\d+)(.*)$/)
  const numericValue = numericMatch ? parseInt(numericMatch[1]) : 0
  const suffix = numericMatch ? numericMatch[2] : value

  return (
    <Card className="p-0 border shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{title}</div>
            {loading ? (
              <div className="text-2xl font-semibold tabular-nums text-muted-foreground/50">--</div>
            ) : (
              <div className="text-2xl font-semibold tabular-nums">
                {numericMatch ? <AnimatedNumber value={numericValue} suffix={suffix} /> : value}
              </div>
            )}
          </div>
          <div className={`grid size-10 place-items-center rounded-full border ${toneBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DispositionRadar({ dispositions }: { dispositions: { name: string; count: number }[] }) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const items = dispositions && dispositions.length ? dispositions : []
  const max = items.reduce((m, i) => Math.max(m, i.count), 1)
  const points = ((() => {
    const n = items.length || 5
    const radius = 120
    const cx = 140
    const cy = 140
    return items.map((it, idx) => {
      const angle = (Math.PI * 2 * idx) / n - Math.PI / 2
      const r = (it.count / max) * radius
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      return `${x},${y}`
    }).join(" ")
  })())
  const ring = (r: number) => (
    <circle key={r} cx={140} cy={140} r={r} className="fill-none stroke-muted/50 dark:stroke-muted/30" strokeDasharray={4} />
  )
  const total = dispositions.reduce((a, b) => a + b.count, 0)
  return (
    <div className="w-full flex items-center justify-center">
      <svg viewBox="0 0 330 320" className="w-full max-w-sm h-full">
        {[30, 60, 90, 120].map(r => ring(r))}
        <g className="fill-blue-500/30 dark:fill-blue-500/20 stroke-blue-500/50 dark:stroke-blue-500/40 transition-all duration-300">
          {points && <polygon points={points} style={{ transition: 'all 300ms ease-in-out' }} />}
        </g>
        {dispositions.map((it, idx) => {
          const n = dispositions.length || 1
          const angle = (Math.PI * 2 * idx) / n - Math.PI / 2
          const r = max ? (it.count / max) * 120 : 0
          const x = 140 + r * Math.cos(angle)
          const y = 140 + r * Math.sin(angle)
          const pct = total ? Math.round((it.count / total) * 100) : 0
          const isHovered = hoveredIndex === idx
          return (
            <g key={it.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    className="fill-primary stroke-background cursor-help transition-all duration-200"
                    strokeWidth={2}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </TooltipTrigger>
                <TooltipContent sideOffset={8} className="bg-background border shadow-lg">
                  <div className="text-xs space-y-1">
                    <div className="font-semibold">{it.name}</div>
                    <div className="tabular-nums text-muted-foreground">{pct}% • {it.count} calls</div>
                  </div>
                </TooltipContent>
              </Tooltip>
              {(() => {
                const labelRadius = 135
                const lx = 140 + labelRadius * Math.cos(angle)
                const ly = 140 + labelRadius * Math.sin(angle)
                return (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle"}
                    dominantBaseline="middle"
                    className={`text-[10px] fill-foreground/70 dark:fill-foreground/60 select-none pointer-events-none font-medium transition-all duration-200 ${isHovered ? 'fill-foreground' : ''}`}
                  >
                    {it.name}
                  </text>
                )
              })()}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

