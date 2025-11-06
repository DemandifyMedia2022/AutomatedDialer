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
        })))
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

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0"> 
          
          <div className="p-6">
           <h1 className="text-2xl font-bold mb-3">Call History</h1>
            <div className="flex justify-between items-center mb-4">
              
              <div className="flex space-x-2">
                <Input type="date" placeholder="From Date" />
                <Input type="date" placeholder="To Date" />
                <Input placeholder="Phone No." />
                <Input placeholder="Extension" />
                <select
                  className="border h-9 rounded-md bg-transparent px-3 py-1 text-sm"
                  defaultValue=""
                  aria-label="Status"
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  <option>ANSWERED</option>
                  <option>NO ANSWER</option>
                  <option>BUSY</option>
                  <option>FAILED</option>
                </select>
                <select
                  className="border h-9 rounded-md bg-transparent px-3 py-1 text-sm"
                  defaultValue=""
                  aria-label="Call Type"
                >
                  <option value="" disabled>
                    Select Call Type
                  </option>
                  <option>Inbound</option>
                  <option>Outbound</option>
                </select>
                <Button>Search</Button>
                <Button>Reset</Button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Extension</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination Number</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Call Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Call Disposition</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recording</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-muted-foreground" colSpan={8}>
                        {loading ? 'Loading…' : 'No records'}
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-accent/50">
                      <td className="px-4 py-3">{row.id}</td>
                      <td className="px-4 py-3">{row.extension || '-'}</td>
                      <td className="px-4 py-3">{row.destination || '-'}</td>
                      <td className="px-4 py-3">{row.source || '-'}</td>
                      <td className="px-4 py-3">{toUtc(row.start_time)}</td>
                      <td className="px-4 py-3">{toUtc(row.end_time)}</td>
                      <td className="px-4 py-3">{fmtDur(row.call_duration)}</td>
                      <td className="px-4 py-3">{(row.disposition || '').toUpperCase() || '-'}</td>
                      <td className="px-4 py-3">
                        {row.recording_url ? (
                          <div className="flex items-center gap-2">
                            <audio src={row.recording_url || undefined} controls preload="none" className="h-8" />
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => downloadRecording(row.recording_url!, row.id)}
                            >
                              <Download className="h-4 w-4" /> Download
                            </Button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4 gap-2">
              {Array.from({ length: pageCount }).map((_, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => setPage(i + 1)} disabled={page === i + 1}>
                  {i + 1}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default CallHistory;