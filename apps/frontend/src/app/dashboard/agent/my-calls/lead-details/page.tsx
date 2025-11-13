"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AgentSidebar } from "../../components/AgentSidebar"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

type LeadRow = {
  id: number | string
  extension: string | null
  destination: string | null
  source: string | null
  start_time: string | null
  end_time: string | null
  call_duration: number | null
  remarks: string | null
  recording_url?: string | null
  recording_filename?: string | null
}

const LeadDetailsPage = () => {
  const [items, setItems] = React.useState<LeadRow[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const [dest, setDest] = React.useState("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const toUtc = (iso?: string | null) => {
    if (!iso) return "-"
    try {
      const d = new Date(iso)
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(d.getUTCDate()).padStart(2, "0")
      const hh = String(d.getUTCHours()).padStart(2, "0")
      const mi = String(d.getUTCMinutes()).padStart(2, "0")
      const ss = String(d.getUTCSeconds()).padStart(2, "0")
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
    } catch {
      return iso || "-"
    }
  }
  const fmtDur = (n?: number | null) => (n ?? null) !== null ? `${n} Sec` : "-"

  const handlePlayRecording = (url: string) => {
    if (!url) return
    const audio = new Audio(url)
    audio.play().catch(err => console.error('Error playing recording:', err))
  }

  const handleDownloadRecording = (url: string, filename: string) => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'recording.mp3'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchLeads = React.useCallback(async (p: number) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ 
        page: String(p), 
        pageSize: String(pageSize),
        remarks: 'Lead' // Add filter for remarks
      })
      if (dest) qs.set("destination", dest)
      if (from) qs.set("from", from)
      if (to) qs.set("to", to)
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const url = `${API_BASE}/api/calls?${qs.toString()}`
      console.log('Fetching from URL:', url) // Debug log
      const res = await fetch(url, { 
        headers, 
        credentials,
        mode: 'cors'
      })
      if (res.ok) {
        const data = await res.json()
        console.log('API Response:', data) // Debug log
        let rows: any[] = data?.items || []
        
        // Ensure we only keep rows where remarks is exactly 'Lead'
        rows = rows.filter(row => row.remarks === 'Lead')
        console.log('Filtered Rows:', rows) // Debug log
        setItems(rows.map(r => ({
          id: r.id,
          extension: r.extension ?? null,
          destination: r.destination ?? null,
          source: r.source ?? null,
          start_time: r.start_time ?? null,
          end_time: r.end_time ?? null,
          call_duration: r.call_duration ?? null,
          remarks: r.remarks ?? null,
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
  }, [pageSize, dest, from, to])

  React.useEffect(() => { fetchLeads(page) }, [fetchLeads, page])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const onSearch = () => {
    setPage(1)
    fetchLeads(1)
  }
  const onReset = () => {
    setDest("")
    setFrom("")
    setTo("")
    setPage(1)
    fetchLeads(1)
  }

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
                  <BreadcrumbPage>Lead Details</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="p-6">
           
            <div className="mb-4 w-full overflow-x-auto">
              <div className="flex items-center gap-4 min-w-max whitespace-nowrap">
                <Input className="w-56" placeholder="Destination Number" value={dest} onChange={(e) => setDest(e.target.value)} />
                <Input className="w-44" type="date" placeholder="From Date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input className="w-44" type="date" placeholder="To Date" value={to} onChange={(e) => setTo(e.target.value)} />
                <Button onClick={onSearch}>Search</Button>
               
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Extension</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                  
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Call Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remarks</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recording</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>
                        {loading ? "Loading…" : "No records"}
                      </td>
                    </tr>
                  )}
                  {items.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} className="hover:bg-accent/50">
                      <td className="px-4 py-3">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3">{row.extension || "-"}</td>
                      <td className="px-4 py-3">{row.destination || "-"}</td>
                     
                      <td className="px-4 py-3">{toUtc(row.start_time)}</td>
                      <td className="px-4 py-3">{toUtc(row.end_time)}</td>
                      <td className="px-4 py-3">{fmtDur(row.call_duration)}</td>
                      <td className="px-4 py-3">{row.remarks || "-"}</td>
                      <td className="px-4 py-3 flex gap-2">
                        {row.recording_url ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handlePlayRecording(row.recording_url!)}
                              disabled={!row.recording_url}
                            >
                              Play
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDownloadRecording(
                                row.recording_url!, 
                                row.recording_filename || `recording-${row.id}.mp3`
                              )}
                              disabled={!row.recording_url}
                            >
                              Download
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No recording</span>
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
  )
}

export default LeadDetailsPage

