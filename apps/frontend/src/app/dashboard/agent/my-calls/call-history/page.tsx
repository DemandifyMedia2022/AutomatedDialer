"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AgentSidebar } from "../../components/AgentSidebar";
import { API_BASE } from "@/lib/api";
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type CallRow = {
  id: number | string
  extension: string | null
  destination: string | null
  source: string | null
  start_time: string
  end_time: string | null
  call_duration: number | null
  disposition: string | null
  recording_url?: string | null
}

const CallHistory = () => {
  const [items, setItems] = React.useState<CallRow[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const fetchMine = React.useCallback(async (p: number) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(p), pageSize: String(pageSize) })
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/calls?${qs.toString()}`, { headers, credentials })
      if (res.ok) {
        const data = await res.json()
        const rows: any[] = data?.items || []
        setItems(rows.map(r => ({
          id: r.id,
          extension: r.extension ?? null,
          destination: r.destination ?? null,
          source: r.source ?? null,
          start_time: r.start_time,
          end_time: r.end_time ?? null,
          call_duration: r.call_duration ?? null,
          disposition: (r.disposition || '') as string,
          recording_url: r.recording_url ?? null,
        })).sort((a: CallRow, b: CallRow) => {
          const an = Number(a.id); const bn = Number(b.id)
          const aIsNum = !Number.isNaN(an); const bIsNum = !Number.isNaN(bn)
          if (aIsNum && bIsNum) return an - bn
          return String(a.id).localeCompare(String(b.id))
        }))
        setTotal(Number(data?.total || rows.length))
        setPage(Number(data?.page || p))
      } else {
        setItems([])
        setTotal(0)
      }
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  React.useEffect(() => { fetchMine(page) }, [fetchMine, page])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const filteredItems = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return items
    return items.filter((row) => {
      const ext = (row.extension || '').toLowerCase()
      const dest = (row.destination || '').toLowerCase()
      const src = (row.source || '').toLowerCase()
      const idStr = String(row.id || '').toLowerCase()
      return (
        ext.includes(term) ||
        dest.includes(term) ||
        src.includes(term) ||
        idStr.includes(term)
      )
    })
  }, [items, searchTerm])
  const toUtc = (iso?: string | null) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const hh = String(d.getUTCHours()).padStart(2, '0')
      const mi = String(d.getUTCMinutes()).padStart(2, '0')
      const ss = String(d.getUTCSeconds()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
    } catch { return iso }
  }
  const fmtDur = (n?: number | null) => (n ?? null) !== null ? `${n} Sec` : '-'

  const guessExt = (ct: string | null) => {
    if (!ct) return '.webm'
    const m: Record<string, string> = {
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'video/webm': '.webm',
    }
    return m[ct] || '.webm'
  }

  const downloadRecording = React.useCallback(async (url: string, id: string | number) => {
    try {
      const res = await fetch(url, { credentials: USE_AUTH_COOKIE ? 'include' : 'omit' })
      if (!res.ok) throw new Error(String(res.status))
      const ct = res.headers.get('content-type')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `recording_${id}${guessExt(ct)}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      // no-op
    }
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/agent">Agent</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/agent/my-calls">My Calls</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Call History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <Card className="w-full">
            <CardHeader>
           
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6 items-end">
                <div className="flex flex-col gap-1">
                  <Label>From Date</Label>
                  <Input type="date" placeholder="From Date" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>To Date</Label>
                  <Input type="date" placeholder="To Date" />
                </div>
                <div className="flex flex-col gap-1 lg:col-span-1">
                  <Label>Search</Label>
                  <Input
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Status</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="justify-between">
                        Select Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuItem>ANSWERED</DropdownMenuItem>
                      <DropdownMenuItem>NO ANSWER</DropdownMenuItem>
                      <DropdownMenuItem>BUSY</DropdownMenuItem>
                      <DropdownMenuItem>FAILED</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Call Type</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="justify-between">
                        Select Call Type
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Call Type</DropdownMenuLabel>
                      <DropdownMenuItem>Inbound</DropdownMenuItem>
                      <DropdownMenuItem>Outbound</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button>Search</Button>
                <Button variant="outline">Reset</Button>
              </div>

              <div className="mt-6 overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Extension</TableHead>
                      <TableHead>Destination Number</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Start Time (UTC)</TableHead>
                      <TableHead>End Time (UTC)</TableHead>
                      <TableHead>Call Duration</TableHead>
                      <TableHead>Call Disposition</TableHead>
                      <TableHead>Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                          {loading ? 'Loading…' : 'No records'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredItems.map((row) => (
                      <TableRow key={row.id} className="hover:bg-accent/50">
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.extension || '-'}</TableCell>
                        <TableCell>{row.destination || '-'}</TableCell>
                        <TableCell>{row.source || '-'}</TableCell>
                        <TableCell>{toUtc(row.start_time)}</TableCell>
                        <TableCell>{toUtc(row.end_time)}</TableCell>
                        <TableCell>{fmtDur(row.call_duration)}</TableCell>
                        <TableCell>{(row.disposition || '').toUpperCase() || '-'}</TableCell>
                        <TableCell>
                          {row.recording_url ? (
                            <div className="flex items-center gap-1" >
                              <audio src={row.recording_url || undefined} controls preload="none" className="h-8" />
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => downloadRecording(row.recording_url!, row.id)}
                              >
                                <Download className="h-4 w-4" /> 
                              </Button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-center gap-2">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <Button key={i} variant={page === i + 1 ? "default" : "outline"} size="sm" onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default CallHistory;