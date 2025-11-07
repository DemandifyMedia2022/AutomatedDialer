"use client"

import React, { useEffect, useState } from "react"
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
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

import { ArrowDownRight, ArrowUpRight, PhoneCall, PhoneIncoming, Voicemail, UsersRound, Crown, Medal, Award } from "lucide-react"

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

export default function Page() {
  
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<MetricResponse | null>(null)
  

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/analytics/agent`, { headers, credentials })
      if (res.ok) {
        const json = await res.json()
        setData((prev) => ({ ...(prev || json), ...json }))
      } else {
        throw new Error(String(res.status))
      }
    } catch {
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let stop: (() => void) | null = null
    const apply = (j: Partial<MetricResponse>) => {
      setData((prev) => ({
        callsDialed: j.callsDialed ?? prev?.callsDialed ?? 0,
        answered: j.answered ?? prev?.answered ?? 0,
        voicemail: j.voicemail ?? prev?.voicemail ?? 0,
        unanswered: j.unanswered ?? prev?.unanswered ?? 0,
        conversations: j.conversations ?? prev?.conversations ?? 0,
        connectRate: j.connectRate ?? prev?.connectRate ?? 0,
        conversationRate: j.conversationRate ?? prev?.conversationRate ?? 0,
        dispositions: prev?.dispositions ?? [],
        leaderboard: prev?.leaderboard ?? [],
      }))
    }
    const fetchOnce = async () => {
      try {
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = 'omit'
        if (USE_AUTH_COOKIE) {
          credentials = 'include'
        } else {
          const t = getToken()
          if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/analytics/agent`, { headers, credentials })
        if (res.ok) {
          const j = await res.json()
          apply(j)
        }
      } catch {}
    }
    const start = async () => {
      await fetchOnce()
      if (USE_AUTH_COOKIE) {
        const es = new EventSource(`${API_BASE}/api/analytics/agent/stream`, { withCredentials: true })
        es.onmessage = (ev) => {
          try { apply(JSON.parse(ev.data)) } catch {}
        }
        es.onerror = () => {}
        stop = () => { try { es.close() } catch {} }
      } else {
        const id = window.setInterval(fetchOnce, 3000)
        stop = () => { window.clearInterval(id) }
      }
    }
    start()
    return () => { if (stop) stop() }
  }, [])

  useEffect(() => {
    let stop: (() => void) | null = null
    const apply = (items: { name: string; count: number }[]) => {
      setData((prev) => {
        const base: MetricResponse = prev || {
          callsDialed: 0,
          answered: 0,
          voicemail: 0,
          unanswered: 0,
          conversations: 0,
          connectRate: 0,
          conversationRate: 0,
          dispositions: [],
          leaderboard: [],
        }
        return { ...base, leaderboard: items }
      })
    }
    const fetchOnce = async () => {
      try {
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = 'omit'
        if (USE_AUTH_COOKIE) {
          credentials = 'include'
        } else {
          const t = getToken()
          if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/analytics/leaderboard`, { headers, credentials })
        if (res.ok) {
          const j = await res.json()
          const items = (j?.items || []) as { name: string; count: number }[]
          apply(items)
        }
      } catch {}
    }
    const start = async () => {
      await fetchOnce()
      if (USE_AUTH_COOKIE) {
        const es = new EventSource(`${API_BASE}/api/analytics/leaderboard/stream`, { withCredentials: true })
        es.onmessage = (ev) => {
          try {
            const j = JSON.parse(ev.data)
            const items = (j?.items || []) as { name: string; count: number }[]
            apply(items)
          } catch {}
        }
        es.onerror = () => {}
        stop = () => { try { es.close() } catch {} }
      } else {
        const id = window.setInterval(fetchOnce, 3000)
        stop = () => { window.clearInterval(id) }
      }
    }
    start()
    return () => { if (stop) stop() }
  }, [])

  useEffect(() => {
    let stop: (() => void) | null = null
    const apply = (items: { name: string; count: number }[]) => {
      setData((prev) => {
        const base: MetricResponse = prev || {
          callsDialed: 0,
          answered: 0,
          voicemail: 0,
          unanswered: 0,
          conversations: 0,
          connectRate: 0,
          conversationRate: 0,
          dispositions: [],
          leaderboard: [],
        }
        return { ...base, dispositions: items }
      })
    }
    const fetchOnce = async () => {
      try {
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = 'omit'
        if (USE_AUTH_COOKIE) {
          credentials = 'include'
        } else {
          const t = getToken()
          if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/analytics/agent/dispositions`, { headers, credentials })
        if (res.ok) {
          const j = await res.json()
          const items = (j?.items || []) as { name: string; count: number }[]
          apply(items)
        }
      } catch {}
    }
    const start = async () => {
      await fetchOnce()
      if (USE_AUTH_COOKIE) {
        const es = new EventSource(`${API_BASE}/api/analytics/agent/dispositions/stream`, { withCredentials: true })
        es.onmessage = (ev) => {
          try {
            const j = JSON.parse(ev.data)
            const items = (j?.items || []) as { name: string; count: number }[]
            apply(items)
          } catch {}
        }
        es.onerror = () => {}
        stop = () => { try { es.close() } catch {} }
      } else {
        const id = window.setInterval(fetchOnce, 3000)
        stop = () => { window.clearInterval(id) }
      }
    }
    start()
    return () => { if (stop) stop() }
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
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Connect Rate"
              value={(data?.connectRate ?? 0) + "%"}
              icon={<ArrowUpRight className="text-emerald-600" />}
              tone="emerald"
            />

            <StatCard
              title="Calls Dialed"
              value={String(data?.callsDialed ?? 0)}
              icon={<PhoneCall className="text-blue-600" />}
              tone="blue"
            />

            <StatCard
              title="Answered Calls"
              value={String(data?.answered ?? 0)}
              icon={<PhoneIncoming className="text-violet-600" />}
              tone="violet"
            />

            <StatCard
              title="Conversation Rate"
              value={(data?.conversationRate ?? 0) + "%"}
              icon={<UsersRound className="text-amber-600" />}
              tone="amber"
            />

            <StatCard
              title="Voicemail Dropped"
              value={String(data?.voicemail ?? 0)}
              icon={<Voicemail className="text-fuchsia-600" />}
              tone="fuchsia"
            />

            <StatCard
              title="Unanswered Calls"
              value={String(data?.unanswered ?? 0)}
              icon={<ArrowDownRight className="text-rose-600" />}
              tone="rose"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Call Disposition Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <DispositionRadar dispositions={data?.dispositions ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(data?.leaderboard ?? []).map((row, idx) => (
                    <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`} alt={row.name} />
                          <AvatarFallback>{row.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="truncate text-sm font-medium">{row.name}</div>
                        {idx < 3 && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border bg-primary/5 text-primary border-primary/20">#{idx + 1}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium tabular-nums px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">{row.count}</span>
                    </div>
                  ))}
                  {!data && (
                    <div className="text-sm text-muted-foreground">Loading leaderboard…</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function StatCard({ title, value, icon, tone }: { title: string; value: string; icon: React.ReactNode; tone: "emerald" | "blue" | "violet" | "amber" | "fuchsia" | "rose" }) {
  const toneBg = {
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    violet: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20",
    rose: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  }[tone]
  return (
    <Card className="p-0 border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
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
    <circle key={r} cx={140} cy={140} r={r} className="fill-none stroke-muted" strokeDasharray={4} />
  )
  const total = dispositions.reduce((a,b)=>a+b.count,0)
  return (
    <div className="w-full flex items-center justify-center">
      <svg viewBox="0 0 320 280" className="w-full max-w-sm">
        { [30, 60, 90, 120].map(r => ring(r)) }
        <g className="fill-blue-500/30 stroke-blue-500/50">
          {points && <polygon points={points} />}
        </g>
        {dispositions.map((it, idx) => {
          const n = dispositions.length || 1
          const angle = (Math.PI * 2 * idx) / n - Math.PI / 2
          const r = max ? (it.count / max) * 120 : 0
          const x = 140 + r * Math.cos(angle)
          const y = 140 + r * Math.sin(angle)
          const pct = total ? Math.round((it.count / total) * 100) : 0
          return (
            <g key={it.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <circle cx={x} cy={y} r={4} className="fill-primary stroke-background/70 cursor-help" />
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>
                  <div className="text-xs">
                    <div className="font-medium">{it.name}</div>
                    <div className="tabular-nums">{pct}% • {it.count}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
              {(() => {
                const labelRadius = 112
                const lx = 140 + labelRadius * Math.cos(angle)
                const ly = 140 + labelRadius * Math.sin(angle)
                return (
                  <text x={lx} y={ly} textAnchor={Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle"} dominantBaseline="middle" className="text-[10px] fill-muted-foreground select-none pointer-events-none">
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