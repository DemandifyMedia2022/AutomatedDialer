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
import { Download, RefreshCcw, ChevronDownIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CallRow = {
  id: number | string
  extension: string | null
  destination: string | null
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
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [direction, setDirection] = React.useState('all')

  const fetchMine = React.useCallback(async (p: number) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(p), pageSize: String(pageSize) })
      const toIso = (d: string, endOfDay = false) => {
        try {
          if (!d) return ''
          return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`
        } catch { return d }
      }
      if (fromDate) qs.set('from', toIso(fromDate))
      if (toDate) qs.set('to', toIso(toDate, true))
      if (query) {
        qs.set('destination', query)
        qs.set('extension', query)
      }
      const effStatus = status === 'all' ? '' : status
      const effDirection = direction === 'all' ? '' : direction
      if (effStatus) qs.set('status', effStatus)
      if (effDirection) qs.set('direction', effDirection)
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
  }, [pageSize, fromDate, toDate, query, status, direction])

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

  const badgeFor = (d?: string | null) => {
    const v = (d || '').toUpperCase()
    const cls = v === 'ANSWERED'
      ? 'bg-green-100 text-green-700'
      : v === 'NO ANSWER'
      ? 'bg-gray-100 text-gray-700'
      : v === 'BUSY'
      ? 'bg-amber-100 text-amber-700'
      : v === 'FAILED' || v === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-slate-100 text-slate-700'
    const label = v ? v.charAt(0) + v.slice(1).toLowerCase() : '-'
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  }

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

  const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
    <>
      <style jsx>{`
        @keyframes wave { 0%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} 100%{transform:scaleY(0.4)} }
      `}</style>
      <div className="flex items-end gap-0.5 h-4">
        {[0,1,2,3,4].map(i => (
          <span key={i} style={{ animation: active ? `wave 1.1s ${0.1*i}s infinite ease-in-out` : undefined, transform: active ? undefined : 'scaleY(0.6)' }} className="w-0.5 bg-primary/70 rounded-sm origin-bottom" />
        ))}
      </div>
    </>
  )

  const CompactAudio: React.FC<{ src: string; name: string | number }> = ({ src, name }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null)
    const [playing, setPlaying] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [dur, setDur] = React.useState(0)
    const toggle = () => {
      const a = audioRef.current
      if (!a) return
      if (a.paused) { a.play(); } else { a.pause(); }
    }
    React.useEffect(() => {
      const a = audioRef.current
      if (!a) return
      const onPlay = () => setPlaying(true)
      const onPause = () => setPlaying(false)
      const onTime = () => { setProgress(a.currentTime); setDur(a.duration || 0) }
      a.addEventListener('play', onPlay)
      a.addEventListener('pause', onPause)
      a.addEventListener('timeupdate', onTime)
      a.addEventListener('loadedmetadata', onTime)
      return () => {
        a.removeEventListener('play', onPlay)
        a.removeEventListener('pause', onPause)
        a.removeEventListener('timeupdate', onTime)
        a.removeEventListener('loadedmetadata', onTime)
      }
    }, [])
    const pct = dur ? Math.min(100, (progress/dur)*100) : 0
    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
      const a = audioRef.current
      if (!a || !dur) return
      const rect = (e.target as HTMLDivElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      a.currentTime = ratio * dur
    }
    return (
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-transparent hover:bg-accent/50 focus:outline-none focus:ring-0">
          <span className="sr-only">Play/Pause</span>
          {playing ? '❚❚' : '►'}
        </button>
        <div className="hidden sm:block"><WaveBars active={playing} /></div>
        <div className="w-28 text-xs tabular-nums text-muted-foreground">{Math.floor(progress)}s/{Math.max(0, Math.floor(dur))}s</div>
        <div className="relative h-1 w-28 bg-muted rounded" onClick={seek}>
          <div className="absolute inset-y-0 left-0 bg-primary rounded" style={{ width: `${pct}%` }} />
        </div>
        <audio ref={audioRef} src={src} preload="none" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadRecording(src, name)} aria-label="Download">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
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
                  <BreadcrumbPage>Call History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0"> 
          
          <div className="p-6">
            <div className="mb-4 rounded-md border bg-muted/20 p-3 relative">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center pr-12">
                <div className="flex flex-col gap-1">
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
                          if (f) setFromDate(f.toISOString().slice(0,10))
                          if (t) setToDate(t.toISOString().slice(0,10))
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Input className="h-9 w-full sm:w-[360px]" placeholder="Search phone or extension" value={query} onChange={e => setQuery(e.target.value)} />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Select Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ANSWERED">Answered</SelectItem>
                    <SelectItem value="NO ANSWER">No answer</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Select Call Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="h-9" onClick={() => { setPage(1); fetchMine(1) }}>Search</Button>
                <div className="flex items-center justify-end absolute right-3 top-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setPage(1); fetchMine(1) }} aria-label="Refresh">
                          <RefreshCcw className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Extension</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination Number</th>
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
                  {Object.entries(items.reduce((acc: Record<string, CallRow[]>, row) => {
                    const d = toUtc(row.start_time).slice(0,10)
                    acc[d] = acc[d] || []
                    acc[d].push(row)
                    return acc
                  }, {})).map(([day, list]) => (
                    <React.Fragment key={day}>
                      <tr className="bg-muted/20">
                        <td className="px-4 py-2 text-xs font-medium text-muted-foreground" colSpan={8}>{day}</td>
                      </tr>
                      {list.map((row, i) => (
                        <tr key={String(row.id)} className="hover:bg-accent/50 even:bg-muted/5">
                          <td className="px-4 py-3">{i + 1}</td>
                          <td className="px-4 py-3">{row.extension || '-'}</td>
                          <td className="px-4 py-3">{row.destination || '-'}</td>
                          <td className="px-4 py-3">{toUtc(row.start_time)}</td>
                          <td className="px-4 py-3">{toUtc(row.end_time)}</td>
                          <td className="px-4 py-3">{fmtDur(row.call_duration)}</td>
                          <td className="px-4 py-3">{badgeFor(row.disposition)}</td>
                          <td className="px-4 py-3">
                            {row.recording_url ? (
                              <CompactAudio src={row.recording_url} name={row.id} />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
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