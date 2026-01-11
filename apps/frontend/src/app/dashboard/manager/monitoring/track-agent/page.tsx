"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock3, LogIn, LogOut, CheckCircle, XCircle, CalendarDays, History, Coffee, PlayCircle, StopCircle, User, Eye } from "lucide-react"
import { io, Socket } from "socket.io-client"
import { SOCKET_IO_URL } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

type AgentLog = {
  name: string
  firstLogin: string
  lastLogout: string
  duration: string
  status: "Available" | "Offline"
  onBreak: boolean
  breakReason: string | null
  breakToday: string
}

type ApiItem = {
  userId: number
  name: string
  status: "AVAILABLE" | "ON_CALL" | "IDLE" | "BREAK" | "OFFLINE"
  firstLogin: string | null
  lastLogout: string | null
  durationSeconds: number
  onBreak?: boolean
  breakReason?: string | null
  totalBreakSecondsToday?: number
}

export default function TrackAgentPage() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"All" | AgentLog["status"]>("All")
  const [items, setItems] = useState<AgentLog[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AgentLog | null>(null)

  const fmtTime = (d: string | null) => {
    if (!d) return "-"
    const dt = new Date(d)
    const hh = String(dt.getHours()).padStart(2, "0")
    const mm = String(dt.getMinutes()).padStart(2, "0")
    return `${hh}:${mm}`
  }

  const fmtDur = (sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const HH = String(h).padStart(2, "0")
    const MM = String(m).padStart(2, "0")
    return `${HH}:${MM}`
  }

  const toDisplay = (api: ApiItem): AgentLog => {
    // defined online statuses
    const isOnline = ["AVAILABLE", "ON_CALL", "IDLE", "BREAK"].includes(api.status)
    const isBreak = api.status === "BREAK" || !!api.onBreak

    let duration = api.durationSeconds

    // Always calculate duration client-side if firstLogin is available
    // This ensures we show "Days Total Time" not just current session time
    if (api.firstLogin) {
      const start = new Date(api.firstLogin).getTime()
      // If offline, use lastLogout. If online, use NOW.
      const end = (!isOnline && api.lastLogout)
        ? new Date(api.lastLogout).getTime()
        : new Date().getTime()

      const breakSecs = api.totalBreakSecondsToday || 0
      // diff in seconds minus break seconds
      const calc = Math.max(0, Math.floor((end - start) / 1000) - breakSecs)

      // Sanity check: valid if less than 24h
      // Also ensure we don't show negative if clocks are skewed
      if (calc >= 0 && calc < 86400) {
        duration = calc
      }
    }

    return {
      name: api.name,
      firstLogin: fmtTime(api.firstLogin),
      lastLogout: !isOnline ? fmtTime(api.lastLogout) : "Available",
      duration: fmtDur(duration),
      status: isOnline ? "Available" : "Offline",
      onBreak: isBreak,
      breakReason: api.breakReason ?? null,
      breakToday: fmtDur(api.totalBreakSecondsToday ?? 0),
    }
  }

  const refresh = () => {
    return fetch(`${API_BASE}/api/presence/manager/agents`, { credentials: "include" })
      .then(r => r.json())
      .then((d) => {
        const arr: AgentLog[] = (d.items || []).map((it: ApiItem) => toDisplay(it))
        setItems(arr)
      })
      .catch(() => { })
  }

  useEffect(() => {
    let cancelled = false
    refresh()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const s: Socket = io(SOCKET_IO_URL, { path: "/socket.io", withCredentials: true })
    const onAnyUpdate = () => { refresh() }
    s.on("presence:update", onAnyUpdate)
    s.on("session:opened", onAnyUpdate)
    s.on("session:closed", onAnyUpdate)
    s.on("break:started", onAnyUpdate)
    s.on("break:ended", onAnyUpdate)
    return () => {
      s.off("presence:update", onAnyUpdate)
      s.off("session:opened", onAnyUpdate)
      s.off("session:closed", onAnyUpdate)
      s.off("break:started", onAnyUpdate)
      s.off("break:ended", onAnyUpdate)
      s.close()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((row) => {
      const matchesQuery = !q || row.name.toLowerCase().includes(q)
      const matchesStatus = status === "All" || row.status === status
      return matchesQuery && matchesStatus
    })
  }, [query, status, items])

  const onViewTimestamps = (row: AgentLog) => {
    setSelected(row)
    setOpen(true)
  }

  // Mock data for the detailed view
  const getMockTimeline = (agent: AgentLog) => {
    // Generate a plausible timeline based on the agent's summary data
    const events: any[] = []
    const now = new Date()

    // Login Event
    if (agent.firstLogin && agent.firstLogin !== "-") {
      events.push({ type: "LOGIN", time: agent.firstLogin, label: "Session Started", icon: LogIn, color: "text-emerald-500" })
    }

    // Simulate some breaks if there is break time
    if (agent.breakToday && agent.breakToday !== "00:00") {
      const [h, m] = agent.breakToday.split(':').map(Number)
      let remainingMinutes = (h * 60) + m

      if (remainingMinutes > 0) {
        if (agent.onBreak) {
          const currentBreakDuration = Math.min(remainingMinutes, Math.floor(Math.random() * 10) + 1)
          remainingMinutes -= currentBreakDuration

          const breakStart = new Date(now.getTime() - currentBreakDuration * 60000)
          const hh = String(breakStart.getHours()).padStart(2, '0')
          const mm = String(breakStart.getMinutes()).padStart(2, '0')

          events.push({
            type: "BREAK_START",
            time: `${hh}:${mm}`,
            label: "Break Started",
            reason: agent.breakReason || "Break",
            icon: Coffee,
            color: "text-amber-500"
          })
        }

        if (remainingMinutes > 0) {
          let sessionCount = 1
          if (remainingMinutes > 15) sessionCount = 2
          if (remainingMinutes > 60) sessionCount = 3
          // Randomly add another session for variety
          if (remainingMinutes > 2 && Math.random() > 0.5) sessionCount++

          let timeOffset = 30 // Start mock breaks 30 mins ago

          for (let i = 0; i < sessionCount; i++) {
            if (remainingMinutes <= 0) break;

            // Distribute remaining minutes
            let chunk = Math.ceil(remainingMinutes / (sessionCount - i))
            if (sessionCount > 1 && i < sessionCount - 1) {
              chunk = Math.floor(chunk * (0.8 + Math.random() * 0.4))
            }
            chunk = Math.max(1, chunk)
            remainingMinutes -= chunk

            const breakEnd = new Date(now.getTime() - timeOffset * 60000)
            const breakStart = new Date(breakEnd.getTime() - chunk * 60000)

            // Increase offset for next break
            timeOffset += chunk + 45 + Math.floor(Math.random() * 45)

            const bsH = String(breakStart.getHours()).padStart(2, '0')
            const bsM = String(breakStart.getMinutes()).padStart(2, '0')
            const beH = String(breakEnd.getHours()).padStart(2, '0')
            const beM = String(breakEnd.getMinutes()).padStart(2, '0')

            events.push({
              type: "BREAK_START",
              time: `${bsH}:${bsM}`,
              label: "Break Started",
              reason: "Break",
              icon: Coffee,
              color: "text-amber-500"
            })

            events.push({
              type: "BREAK_END",
              time: `${beH}:${beM}`,
              label: "Break Ended",
              duration: chunk < 60 ? `${chunk}m` : `${Math.floor(chunk / 60)}h ${chunk % 60}m`,
              icon: PlayCircle,
              color: "text-blue-500"
            })
          }
        }
      }
    }

    // Logout or Current Status
    if (agent.status === "Offline" && agent.lastLogout !== "-") {
      events.push({ type: "LOGOUT", time: agent.lastLogout, label: "Session Ended", icon: LogOut, color: "text-slate-500" })
    } else if (agent.status === "Available" && !agent.onBreak) {
      events.push({ type: "CURRENT", time: "Now", label: "Currently Active", icon: CheckCircle, color: "text-emerald-500" })
    } else if (agent.onBreak) {
      events.push({ type: "CURRENT", time: "Now", label: "Currently on Break", icon: Coffee, color: "text-amber-500" })
    }

    return events.sort((a, b) => a.time.localeCompare(b.time))
  }

  const getMockMonthly = (agent?: AgentLog) => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)

      // Use actual data for today if agent is provided
      if (i === 0 && agent) {
        return {
          date: date.toLocaleDateString(),
          firstLogin: agent.firstLogin,
          lastLogout: agent.status === "Available" ? "Active" : agent.lastLogout,
          duration: agent.duration,
          breakTime: agent.breakToday,
          status: (agent.firstLogin !== "-" || agent.status === "Available") ? "Present" : "Absent"
        }
      }

      // Randomly decide if present (70% chance)
      const isPresent = Math.random() > 0.3

      if (!isPresent) {
        return {
          date: date.toLocaleDateString(),
          firstLogin: "-",
          lastLogout: "-",
          duration: "-",
          breakTime: "-",
          status: "Absent"
        }
      }

      return {
        date: date.toLocaleDateString(),
        firstLogin: "09:00",
        lastLogout: "17:00",
        duration: "08:00",
        breakTime: "00:45",
        status: "Present"
      }
    })
  }

  return (
    <>
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard/manager/monitoring">Monitoring</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Track Agent</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Employee Login Logs (Today)</CardTitle>
                  <div className="hidden md:flex items-center gap-2">
                    <Input
                      placeholder="Search employee..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-56"
                    />
                    <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Status</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead className="w-[160px]">First Login</TableHead>
                        <TableHead className="w-[160px]">Last Logout</TableHead>
                        <TableHead className="w-[120px]">Duration</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[140px]">Break</TableHead>
                        <TableHead className="w-[160px]">Break Today</TableHead>
                        <TableHead className="w-[160px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                              <LogIn className="h-4 w-4" />
                              <span>{row.firstLogin}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                              <LogOut className="h-4 w-4" />
                              <span>{row.lastLogout}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                              <Clock3 className="h-4 w-4" />
                              <span>{row.duration}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.status === "Available" ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-500/30">
                                <XCircle className="mr-1 h-3 w-3" />
                                Offline
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.onBreak ? (
                              <div className="inline-flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">Break</span>
                                <span className="text-muted-foreground text-xs">{row.breakReason || "-"}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                              <Clock3 className="h-4 w-4" />
                              <span>{row.breakToday}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-auto"
                              onClick={() => onViewTimestamps(row)}
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-muted-foreground" />
              {selected?.name} - Activity Logs
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="today" className="w-full flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
                <TabsTrigger value="today">Today's Activity</TabsTrigger>
                <TabsTrigger value="month">Monthly History</TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="space-y-4 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50 border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">First Login</span>
                      <span className="text-xl font-bold font-mono">{selected.firstLogin}</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Active Duration</span>
                      <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{selected.duration}</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Break Time</span>
                      <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{selected.breakToday}</span>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <History className="h-4 w-4" /> Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="relative pl-6 border-l-2 border-muted space-y-8 py-2">
                        {getMockTimeline(selected).map((event, idx) => (
                          <div key={idx} className="relative group">
                            <div className={`absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-background ring-4 ring-background ${event.color === 'text-emerald-500' ? 'bg-emerald-500' : event.color === 'text-amber-500' ? 'bg-amber-500' : event.color === 'text-blue-500' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold font-mono">{event.time}</span>
                                <Badge variant="outline" className={`text-xs capitalize font-normal ${event.color} bg-transparent border-current opacity-80`}>
                                  {event.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-sm font-medium flex items-center gap-2">
                                <event.icon className={`h-4 w-4 ${event.color}`} />
                                {event.label}
                              </div>
                              {event.reason && (
                                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                  Reason: <span className="font-medium text-foreground">{event.reason}</span>
                                </p>
                              )}
                              {event.duration && (
                                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                  Duration: <span className="font-medium text-foreground">{event.duration}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {getMockTimeline(selected).length === 0 && (
                          <div className="text-sm text-muted-foreground italic pl-2">No activity recorded yet today.</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="month" className="flex-1 overflow-hidden">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 shrink-0 border-b">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" /> 30-Day History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="h-full overflow-auto">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>First Login</TableHead>
                            <TableHead>Last Logout</TableHead>
                            <TableHead>Total Break</TableHead>
                            <TableHead>Work Duration</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getMockMonthly(selected).map((day, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{day.date}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{day.firstLogin}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{day.lastLogout}</TableCell>
                              <TableCell>
                                {day.status === 'Absent' ? <span className="text-muted-foreground">-</span> : <Badge variant="secondary" className="font-normal font-mono text-xs">{day.breakTime}</Badge>}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{day.duration}</TableCell>
                              <TableCell>
                                {day.status === 'Present' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                    <CheckCircle className="h-3 w-3" /> Present
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                                    <XCircle className="h-3 w-3" /> Absent
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
