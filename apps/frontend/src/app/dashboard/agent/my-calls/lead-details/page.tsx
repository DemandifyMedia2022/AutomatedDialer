"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Play, Pause, ChevronDownIcon, FileDown, Users, CheckCircle2, Activity } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AgentSidebar } from "../../components/AgentSidebar"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { type DateRange } from "react-day-picker"

type LeadRow = {
  id: number | string
  extension: string | null
  username?: string | null
  destination: string | null
  source: string | null
  start_time: string | null
  end_time: string | null
  call_duration: number | null
  remarks: string | null
  recording_url?: string | null
  recording_filename?: string | null
  f_qa_status?: string | null
}

const LeadDetailsPage = () => {
  const [items, setItems] = React.useState<LeadRow[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [qualifiedCount, setQualifiedCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const [dest, setDest] = React.useState("")
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")

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
  const toAbsUrl = (url: string) => url && !url.startsWith('http') ? `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}` : url
  const guessExt = (ct: string | null) => {
    if (!ct) return '.webm'
    const m: Record<string, string> = { 'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'video/webm': '.webm' }
    return m[ct] || '.webm'
  }
  const downloadRecording = React.useCallback(async (url: string, id: string | number) => {
    try {
      const res = await fetch(toAbsUrl(url), { credentials: USE_AUTH_COOKIE ? 'include' : 'omit' })
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

  const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
    <div className="flex items-end gap-[1.5px] h-4 w-24">
      {[0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.6, 0.8, 1, 0.8, 0.6, 0.4].map((height, i) => (
        <span
          key={i}
          style={{
            height: `${height * 100}%`,
            animation: active ? `wave 0.7s ${0.05 * i}s infinite ease-in-out` : 'none',
            animationFillMode: active ? 'both' : 'forwards',
          }}
          className="w-[1.5px] bg-foreground/70 rounded-sm origin-bottom"
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
          100% { transform: scaleY(0.4); }
        }
      `}</style>
    </div>
  )

  const CompactAudio: React.FC<{ src: string; name: string | number }> = ({ src, name }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null)
    const [playing, setPlaying] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [dur, setDur] = React.useState(0)
    const toggle = () => { const a = audioRef.current; if (!a) return; if (a.paused) a.play(); else a.pause() }
    React.useEffect(() => {
      const a = audioRef.current; if (!a) return
      const onPlay = () => setPlaying(true)
      const onPause = () => setPlaying(false)
      const onTime = () => { setProgress(a.currentTime); setDur(a.duration || 0) }
      a.addEventListener('play', onPlay)
      a.addEventListener('pause', onPause)
      a.addEventListener('timeupdate', onTime)
      a.addEventListener('loadedmetadata', onTime)
      return () => { a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onTime) }
    }, [])
    const pct = dur ? Math.min(100, (progress / dur) * 100) : 0
    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
      const a = audioRef.current; if (!a || !dur) return
      const rect = (e.target as HTMLDivElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      a.currentTime = ratio * dur
    }
    return (
      <div className="flex items-center gap-4 w-full max-w-md">
        <button onClick={toggle} className="text-foreground hover:bg-accent/50 rounded p-1.5 transition-colors focus:outline-none" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (<Pause className="h-4 w-4" strokeWidth={2.5} />) : (<Play className="h-4 w-4 ml-0.5" strokeWidth={2.5} />)}
        </button>
        <div className="flex-1 min-w-0 flex items-center">
          <div className="hidden sm:block"><WaveBars active={playing} /></div>
        </div>
        <div className="text-xs tabular-nums text-muted-foreground w-10 text-right">{Math.floor(progress)}s</div>
        <audio ref={audioRef} src={toAbsUrl(src)} preload="none" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:bg-accent/50 rounded p-1.5 transition-colors focus:outline-none" onClick={(e) => { e.stopPropagation(); downloadRecording(src, name) }} aria-label="Download">
                <Download className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
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
      const toIso = (d: string, endOfDay = false) => {
        try {
          if (!d) return ''
          return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`
        } catch { return d }
      }
      const fStr = fromDate || (range?.from ? new Date(range.from).toISOString().slice(0, 10) : '')
      const tStr = toDate || (range?.to ? new Date(range.to).toISOString().slice(0, 10) : (range?.from ? new Date(range.from).toISOString().slice(0, 10) : ''))
      if (fStr) qs.set('from', toIso(fStr))
      if (tStr) qs.set('to', toIso(tStr, true))
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const url = `${API_BASE}/api/calls/mine?${qs.toString()}`
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
        console.log('Sample QA Status:', rows[0]?.qa_status) // Debug QA status specifically

        // Log each row's QA status
        rows.forEach((row, index) => {
          console.log(`Row ${index}: ID=${row.id}, unique_id=${row.unique_id}, qa_status=${row.qa_status}`)
        })

        // Calculate qualified leads count
        const qualified = rows.filter(row =>
          row.f_qa_status && row.f_qa_status.toLowerCase() === 'qualified'
        ).length

        setItems(rows.map(r => {
          console.log('Processing row:', r) // Debug log
          return {
            id: r.id,
            extension: r.extension ?? null,
            username: r.username ?? null,
            destination: r.destination ?? null,
            source: r.source ?? null,
            start_time: r.start_time ?? null,
            end_time: r.end_time ?? null,
            call_duration: r.call_duration ?? null,
            remarks: r.remarks ?? null,
            // Use the recording URL from the API response
            recording_url: r.recording_url || r.recording || null,
            recording_filename: r.recording_filename || `recording-${r.id}.mp3`,
            f_qa_status: r.f_qa_status ?? null
          }
        }))
        setTotal(Number(data?.total || rows.length))
        setQualifiedCount(qualified)
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
  }, [pageSize, dest, fromDate, toDate, range])

  React.useEffect(() => { fetchLeads(page) }, [fetchLeads, page])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const onSearch = () => {
    setPage(1)
    fetchLeads(1)
  }
  const exportToCSV = React.useCallback(() => {
    const headers = ['ID', 'User', 'Destination', 'Start Time (UTC)', 'End Time (UTC)', 'Call Duration', 'Remarks', 'QA Status', 'Recording URL']
    const csvData = items.map((row, idx) => [
      (page - 1) * pageSize + idx + 1,
      row.username || '-',
      row.destination || '-',
      toUtc(row.start_time),
      toUtc(row.end_time),
      fmtDur(row.call_duration),
      row.remarks || '-',
      row.f_qa_status || '-',
      row.recording_url || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lead-details-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [items, page, pageSize])

  const onReset = () => {
    setDest("")
    setFromDate("")
    setToDate("")
    setRange({ from: new Date(), to: new Date() })
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full sm:w-[280px] justify-between font-normal">
                      {range?.from && range?.to
                        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                        : 'Select date'}
                      <ChevronDownIcon className="ml-2 size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={range}
                      captionLayout="dropdown"
                      onSelect={(r) => {
                        setRange(r)
                        const f = r?.from ? new Date(r.from) : undefined
                        const t = r?.to ? new Date(r.to) : r?.from ? new Date(r.from) : undefined
                        if (f) setFromDate(f.toISOString().slice(0, 10))
                        if (t) setToDate(t.toISOString().slice(0, 10))
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input className="w-56" placeholder="Destination Number" value={dest} onChange={(e) => setDest(e.target.value)} />
                <Button onClick={onSearch}>Search</Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={items.length === 0}
                  className="flex items-center gap-2 ml-auto"
                >
                  <FileDown className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground">Total leads in current view</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{qualifiedCount}</div>
                  <p className="text-xs text-muted-foreground">Leads marked as qualified</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Qualification Rate</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {total > 0 ? ((qualifiedCount / total) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Percentage of qualified leads</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>

                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Call Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remarks</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">QA Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recording</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-muted-foreground" colSpan={9}>
                        {loading ? "Loading…" : "No records"}
                      </td>
                    </tr>
                  )}
                  {items.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} className="hover:bg-accent/50">
                      <td className="px-4 py-3">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3">{row.username || "-"}</td>
                      <td className="px-4 py-3">{row.destination || "-"}</td>

                      <td className="px-4 py-3">{toUtc(row.start_time)}</td>
                      <td className="px-4 py-3">{toUtc(row.end_time)}</td>
                      <td className="px-4 py-3">{fmtDur(row.call_duration)}</td>
                      <td className="px-4 py-3">{row.remarks || "-"}</td>
                      <td className="px-4 py-3">
                        {row.f_qa_status ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.f_qa_status.toLowerCase() === 'qualified' ? 'bg-green-100 text-green-800' :
                              row.f_qa_status.toLowerCase() === 'disqualified' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {row.f_qa_status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.recording_url ? (
                          <CompactAudio src={row.recording_url} name={row.id} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
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

