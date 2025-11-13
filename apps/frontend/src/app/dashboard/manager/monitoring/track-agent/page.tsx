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

type AgentLog = {
  name: string
  firstLogin: string
  lastLogout: string
  duration: string
  status: "Available" | "Offline"
}

type ApiItem = {
  userId: number
  name: string
  status: "AVAILABLE" | "ON_CALL" | "IDLE" | "BREAK" | "OFFLINE"
  firstLogin: string | null
  lastLogout: string | null
  durationSeconds: number
}

export default function TrackAgentPage() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"All" | AgentLog["status"]>("All")
  const [items, setItems] = useState<AgentLog[]>([])

  const fmtTime = (d: string | null) => {
    if (!d) return "-"
    const dt = new Date(d)
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const fmtDur = (sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const mm = String(h > 0 ? (m + h * 60) : m).padStart(2, "0")
    const ss = String(s % 60).padStart(2, "0")
    return `${mm}:${ss}`
  }

  const toDisplay = (api: ApiItem): AgentLog => {
    const isAvailable = api.status === "AVAILABLE"
    return {
      name: api.name,
      firstLogin: fmtTime(api.firstLogin),
      lastLogout: api.status === "OFFLINE" ? fmtTime(api.lastLogout) : "Available",
      duration: fmtDur(api.durationSeconds),
      status: isAvailable ? "Available" : "Offline",
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
    // placeholder
    console.log("view timestamps", row)
  }

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
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="Available">Available</option>
                    <option value="Offline">Offline</option>
                  </select>
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
                            <Badge className="bg-green-600 hover:bg-green-700">Available</Badge>
                          ) : (
                            <Badge className="bg-red-600 hover:bg-red-700">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
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
  )
}

