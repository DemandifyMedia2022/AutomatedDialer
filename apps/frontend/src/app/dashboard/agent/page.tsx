"use client"

import React, { useEffect, useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { API_BASE } from "@/lib/api"
import { ArrowDownRight, ArrowUpRight, PhoneCall, PhoneIncoming, Voicemail, UsersRound } from "lucide-react"

type Filters = {
  from: string
  to: string
  team?: string
  campaign?: string
}

type MetricResponse = {
  callsDialed: number
  answered: number
  voicemail: number
  unanswered: number
  conversations: number
  connectRate: number
  conversationRate: number
  dispositions: { name: string; count: number }[]
  leaderboard: { name: string; successRate: number }[]
}

export default function Page() {
  const today = new Date()
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [filters, setFilters] = useState<Filters>({ from: fmt(weekAgo), to: fmt(today), team: "", campaign: "" })
  const [teams, setTeams] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<MetricResponse | null>(null)

  useEffect(() => {
    let ignore = false
    async function loadFilters() {
      try {
        const [tRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/team-members`).catch(() => null),
          fetch(`${API_BASE}/campaigns`).catch(() => null),
        ])
        const t = tRes && tRes.ok ? (await tRes.json()) as { name: string }[] : []
        const c = cRes && cRes.ok ? (await cRes.json()) as { name: string }[] : []
        if (!ignore) {
          setTeams(t.length ? t.map(x => x.name) : ["Team A", "Team B", "Team C"]) 
          setCampaigns(c.length ? c.map(x => x.name) : ["Q4 Blast", "Follow-up", "Nurture"]) 
        }
      } catch {
        if (!ignore) {
          setTeams(["Team A", "Team B", "Team C"]) 
          setCampaigns(["Q4 Blast", "Follow-up", "Nurture"]) 
        }
      }
    }
    loadFilters()
    return () => { ignore = true }
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filters.from) qs.set("from", filters.from)
      if (filters.to) qs.set("to", filters.to)
      if (filters.team) qs.set("team", String(filters.team))
      if (filters.campaign) qs.set("campaign", String(filters.campaign))
      const res = await fetch(`${API_BASE}/analytics/agent?` + qs.toString())
      if (res.ok) {
        const json = await res.json()
        setData(json as MetricResponse)
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
          { name: "Alex Johnson", successRate: 38 },
          { name: "Priya Singh", successRate: 35 },
          { name: "Rahul Mehta", successRate: 32 },
          { name: "Sara Lee", successRate: 29 },
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

  const totals = useMemo(() => {
    if (!data) return { total: 0 }
    const total = data.dispositions.reduce((a, b) => a + b.count, 0)
    return { total }
  }, [data])

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
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          
            <CardContent className="pt-6">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input type="date" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input type="date" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Team Member</label>
                  <select
                    className="border h-9 rounded-md bg-transparent px-3 py-1 text-sm"
                    value={filters.team}
                    onChange={(e) => setFilters(f => ({ ...f, team: e.target.value }))}
                  >
                    <option value="">All</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Campaign</label>
                  <select
                    className="border h-9 rounded-md bg-transparent px-3 py-1 text-sm"
                    value={filters.campaign}
                    onChange={(e) => setFilters(f => ({ ...f, campaign: e.target.value }))}
                  >
                    <option value="">All</option>
                    {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={fetchMetrics} disabled={loading} className="w-full">Search</Button>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => setFilters({ from: fmt(weekAgo), to: fmt(today), team: "", campaign: "" })} className="w-full">Reset</Button>
                </div>
              </div>
            </CardContent>
        

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Call Disposition Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.dispositions ?? []).map((d) => {
                    const pct = totals.total ? Math.round((d.count / totals.total) * 100) : 0
                    return (
                      <div key={d.name} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
                        <div className="text-sm text-muted-foreground">{d.name}</div>
                        <div className="h-2 rounded bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">{pct}% • {d.count}</div>
                      </div>
                    )
                  })}
                  {!data && (
                    <div className="text-sm text-muted-foreground">Loading analytics…</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.leaderboard ?? []).map((row, idx) => (
                    <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-accent text-xs grid place-items-center">{idx + 1}</div>
                        <div className="text-sm">{row.name}</div>
                      </div>
                      <div className="text-sm font-medium tabular-nums">{row.successRate}%</div>
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
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    fuchsia: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  }[tone]
  return (
    <Card className="p-0">
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