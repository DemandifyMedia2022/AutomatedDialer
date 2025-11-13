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
import { Clock3, LogIn, LogOut } from "lucide-react"
import { io, Socket } from "socket.io-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
    const isAvailable = api.status === "AVAILABLE"
    return {
      name: api.name,
      firstLogin: fmtTime(api.firstLogin),
      lastLogout: api.status === "OFFLINE" ? fmtTime(api.lastLogout) : "Available",
      duration: fmtDur(api.durationSeconds),
      status: isAvailable ? "Available" : "Offline",
      onBreak: !!api.onBreak,
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
      .catch(() => {})
  }

  useEffect(() => {
    let cancelled = false
    refresh()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const s: Socket = io(API_BASE, { path: "/socket.io", withCredentials: true })
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
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200">Offline</span>
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
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/80"
                            onClick={() => onViewTimestamps(row)}
                          >
                            View Timestamps
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agent Timestamps</DialogTitle>
        </DialogHeader>
        {selected ? (
          <div className="space-y-2 text-sm">
            <div className="font-medium">{selected.name}</div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">First Login</span>
              <span>{selected.firstLogin}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Logout</span>
              <span>{selected.lastLogout}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration (HH:MM)</span>
              <span>{selected.duration}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  )
}

