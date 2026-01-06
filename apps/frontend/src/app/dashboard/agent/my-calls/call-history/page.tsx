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
import { Download, RefreshCcw, ChevronDownIcon, Play, Pause, ArrowUpDown, ArrowUp, ArrowDown, Search, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type CallRow = {
  id: number | string
  extension: string | null
  username?: string | null
  destination: string | null
  start_time: string
  end_time: string | null
  call_duration: number | null
  disposition: string | null
  recording_url?: string | null
}

type SortField = 'start_time' | 'call_duration' | 'disposition' | 'destination'
type SortDirection = 'asc' | 'desc' | null

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
  const [transcriptCallId, setTranscriptCallId] = React.useState<number | string | null>(null)
  const [transcript, setTranscript] = React.useState<any | null>(null)
  const [transcriptLoading, setTranscriptLoading] = React.useState(false)
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)
  const [sortField, setSortField] = React.useState<SortField>('start_time')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')

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
      const fStr = fromDate || (range?.from ? new Date(range.from).toISOString().slice(0, 10) : '')
      const tStr = toDate || (range?.to ? new Date(range.to).toISOString().slice(0, 10) : (range?.from ? new Date(range.from).toISOString().slice(0, 10) : ''))
      if (fStr) qs.set('from', toIso(fStr))
      if (tStr) qs.set('to', toIso(tStr, true))
      if (query) {
        qs.set('destination', query)
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
      const res = await fetch(`${API_BASE}/api/calls/mine?${qs.toString()}`, { headers, credentials })
      if (res.ok) {
        const data = await res.json()
        const rows: any[] = data?.items || []
        setItems(rows.map(r => ({
          id: r.id,
          extension: r.extension ?? null,
          username: r.username ?? null,
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
  }, [pageSize, query, status, direction, fromDate, toDate, range])

  const fetchTranscript = React.useCallback(async (callId: number | string) => {
    setTranscriptLoading(true)
    setTranscriptError(null)
    setTranscript(null)
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/transcription/call/${callId}`, { headers, credentials })
      if (!res.ok) {
        if (res.status === 404) {
          setTranscript({ metadata: null, segments: [] })
        } else {
          throw new Error(String(res.status))
        }
      } else {
        const data = await res.json().catch(() => null) as any
        setTranscript(data?.data ?? null)
      }
    } catch {
      setTranscriptError('Failed to load transcript')
    } finally {
      setTranscriptLoading(false)
    }
  }, [])

  const downloadTranscriptText = React.useCallback(() => {
    if (!transcript) return
    let text = ''
    // Prefer segment-based, speaker-labelled export when available
    if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
      text = transcript.segments.map((s: any, idx: number) => {
        const rawSpeaker = typeof s.speaker === 'string' ? s.speaker.toLowerCase() : ''
        let speakerLabel: 'Agent' | 'Prospect'
        if (rawSpeaker === 'agent') {
          speakerLabel = 'Agent'
        } else if (rawSpeaker === 'prospect' || rawSpeaker === 'customer') {
          speakerLabel = 'Prospect'
        } else {
          speakerLabel = idx % 2 === 0 ? 'Agent' : 'Prospect'
        }
        const body = typeof s.text === 'string' ? s.text : ''
        return `${speakerLabel}: ${body}`.trim()
      }).join('\n')
    } else if (transcript.metadata?.full_transcript) {
      text = String(transcript.metadata.full_transcript ?? '')
    }

    text = text.trim()
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript_${transcriptCallId ?? 'call'}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [transcript, transcriptCallId])

  const downloadRecording = React.useCallback(async (url: string, id: string | number) => {
    if (!url) return
    try {
      const res = await fetch(`${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`, { credentials: USE_AUTH_COOKIE ? 'include' : 'omit' })
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
  const toAbsUrl = (url: string) => url && !url.startsWith('http')
    ? `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
    : url
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

  const exportToCsv = React.useCallback(() => {
    if (!items.length) return

    const escapeCsv = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }

    const headers = ['#', 'User', 'Extension', 'Destination', 'Start Time (UTC)', 'End Time (UTC)', 'Duration (sec)', 'Disposition', 'Recording URL']
    const rows = items.map((row, idx) => [
      idx + 1,
      row.username || '-',
      row.extension || '-',
      row.destination || '-',
      toUtc(row.start_time),
      toUtc(row.end_time),
      row.call_duration ?? '',
      row.disposition || '-',
      row.recording_url ? toAbsUrl(row.recording_url) : '',
    ])

    const csvContent = [headers, ...rows]
      .map(cols => cols.map(escapeCsv).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.download = `call-history-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [items, toAbsUrl, toUtc])

  React.useEffect(() => { fetchMine(page) }, [fetchMine, page])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortField('start_time')
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedItems = React.useMemo(() => {
    if (!sortDirection) return items

    const sorted = [...items].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'start_time') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      } else if (sortField === 'call_duration') {
        aVal = aVal ?? 0
        bVal = bVal ?? 0
      } else if (sortField === 'disposition' || sortField === 'destination') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [items, sortField, sortDirection])

  const badgeFor = (d?: string | null) => {
    const v = (d || '').toUpperCase()
    const variant = v === 'ANSWERED'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30'
      : v === 'NO ANSWER'
        ? 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20 dark:bg-gray-500/15 dark:border-gray-500/30'
        : v === 'BUSY'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30'
          : v === 'FAILED' || v === 'REJECTED' || v === 'CALL FAILED'
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30'
            : v === 'VOICEMAIL'
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30'
              : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20 dark:bg-slate-500/15 dark:border-slate-500/30'
    const label = v ? v.charAt(0) + v.slice(1).toLowerCase() : '-'
    return <Badge className={`rounded-full border ${variant}`}>{label}</Badge>
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
    if (sortDirection === 'asc') return <ArrowUp className="ml-1 h-3.5 w-3.5" />
    if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3.5 w-3.5" />
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
  }

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
    const pct = dur ? Math.min(100, (progress / dur) * 100) : 0
    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
      const a = audioRef.current
      if (!a || !dur) return
      const rect = (e.target as HTMLDivElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      a.currentTime = ratio * dur
    }
    return (
      <div className="flex items-center gap-4 w-full max-w-md">
        <button
          onClick={toggle}
          className="text-foreground hover:bg-accent/50 rounded p-1.5 transition-colors focus:outline-none"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <Play className="h-4 w-4 ml-0.5" strokeWidth={2.5} />
          )}
        </button>

        <div className="flex-1 min-w-0 flex items-center">
          <div className="hidden sm:block">
            <WaveBars active={playing} />
          </div>
        </div>

        <div className="text-xs tabular-nums text-muted-foreground w-10 text-right">
          {Math.floor(progress)}s
        </div>

        <audio ref={audioRef} src={toAbsUrl(src)} preload="none" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-muted-foreground hover:bg-accent/50 rounded p-1.5 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadRecording(src, name);
                }}
                aria-label="Download"
              >
                <Download className="h-4 w-4" strokeWidth={2.5} />
              </button>
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

        <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mt-2">Call History</h1>
              <p className="text-muted-foreground mt-1">
                View and manage your call records
              </p>
            </div>
          </div>

          {/* Filters Card */}
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {range?.from && range?.to
                            ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                            : 'Select date'}
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
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Phone or extension"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="ANSWERED">Answered</SelectItem>
                        <SelectItem value="NO ANSWER">No answer</SelectItem>
                        <SelectItem value="BUSY">Busy</SelectItem>
                        <SelectItem value="Call failed">Failed</SelectItem>
                        <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Call Type</label>
                    <Select value={direction} onValueChange={setDirection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Call Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { setPage(1); fetchMine(1) }}
                          disabled={loading}
                        >
                          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={exportToCsv}
                    disabled={!items.length || loading}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => { setPage(1); fetchMine(1) }}
                    disabled={loading}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="rounded-lg border-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>
                        <button
                          className="flex items-center hover:text-foreground transition-colors"
                          onClick={() => handleSort('destination')}
                        >
                          Destination
                          <SortIcon field="destination" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center hover:text-foreground transition-colors"
                          onClick={() => handleSort('start_time')}
                        >
                          Start Time (UTC)
                          <SortIcon field="start_time" />
                        </button>
                      </TableHead>
                      <TableHead>End Time (UTC)</TableHead>
                      <TableHead>
                        <button
                          className="flex items-center hover:text-foreground transition-colors"
                          onClick={() => handleSort('call_duration')}
                        >
                          Duration
                          <SortIcon field="call_duration" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center hover:text-foreground transition-colors"
                          onClick={() => handleSort('disposition')}
                        >
                          Status
                          <SortIcon field="disposition" />
                        </button>
                      </TableHead>
                      <TableHead>Recording</TableHead>
                      <TableHead>Transcript</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && items.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : sortedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <p className="text-sm">No call records found</p>
                            <p className="text-xs mt-1">Try adjusting your filters</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(sortedItems.reduce((acc: Record<string, CallRow[]>, row) => {
                        const d = toUtc(row.start_time).slice(0, 10)
                        acc[d] = acc[d] || []
                        acc[d].push(row)
                        return acc
                      }, {})).map(([day, list]) => (
                        <React.Fragment key={day}>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="font-medium text-xs py-2">
                              {day}
                            </TableCell>
                          </TableRow>
                          {list.map((row, i) => (
                            <TableRow key={String(row.id)} className="group">
                              <TableCell className="font-medium">{i + 1}</TableCell>
                              <TableCell className="font-medium">{row.username || '-'}</TableCell>
                              <TableCell className="font-mono text-xs">{row.destination || '-'}</TableCell>
                              <TableCell className="text-xs">{toUtc(row.start_time)}</TableCell>
                              <TableCell className="text-xs">{toUtc(row.end_time)}</TableCell>
                              <TableCell className="text-xs">{fmtDur(row.call_duration)}</TableCell>
                              <TableCell>{badgeFor(row.disposition)}</TableCell>
                              <TableCell>
                                {row.recording_url ? (
                                  <CompactAudio src={row.recording_url} name={row.id} />
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTranscriptCallId(row.id)
                                    fetchTranscript(row.id)
                                  }}
                                  disabled={transcriptCallId === row.id && transcriptLoading}
                                >
                                  {transcriptCallId === row.id && transcriptLoading ? 'Loading…' : 'View'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pageCount, 7) }).map((_, i) => {
                  let pageNum: number
                  if (pageCount <= 7) {
                    pageNum = i + 1
                  } else if (page <= 4) {
                    pageNum = i + 1
                  } else if (page >= pageCount - 3) {
                    pageNum = pageCount - 6 + i
                  } else {
                    pageNum = page - 3 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(pageCount, page + 1))}
                disabled={page === pageCount || loading}
              >
                Next
              </Button>
            </div>
          )}

          {/* Transcript Dialog */}
          <Dialog
            open={transcriptCallId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setTranscriptCallId(null)
                setTranscript(null)
                setTranscriptError(null)
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Call Transcript</DialogTitle>
              </DialogHeader>

              <div className="min-h-[120px] max-h-[60vh] overflow-y-auto">
                {transcriptLoading && (
                  <div>Loading transcript…</div>
                )}
                {!transcriptLoading && transcriptError && (
                  <div className="text-sm text-red-500">{transcriptError}</div>
                )}
                {!transcriptLoading && !transcriptError && transcript && (
                  <div className="space-y-3">
                    {Array.isArray(transcript.segments) && transcript.segments.length > 0 && (
                      <div className="space-y-2">
                        {transcript.segments.map((s: any, idx: number) => {
                          const rawSpeaker = typeof s.speaker === 'string' ? s.speaker.toLowerCase() : ''
                          let speaker: 'agent' | 'prospect'
                          if (rawSpeaker === 'agent') {
                            speaker = 'agent'
                          } else if (rawSpeaker === 'prospect' || rawSpeaker === 'customer') {
                            speaker = 'prospect'
                          } else {
                            speaker = idx % 2 === 0 ? 'agent' : 'prospect'
                          }
                          const isAgent = speaker === 'agent'

                          return (
                            <div key={idx} className={isAgent ? 'flex justify-end' : 'flex justify-start'}>
                              <div className={
                                isAgent
                                  ? 'max-w-[80%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground'
                                  : 'max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground'
                              }>
                                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-80">
                                  {isAgent ? 'Agent' : 'Prospect'}
                                </div>
                                <div className="whitespace-pre-wrap break-words">{s.text}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {(!transcript.segments || transcript.segments.length === 0) && transcript.metadata?.full_transcript && (
                      <p className="whitespace-pre-wrap break-words">{transcript.metadata.full_transcript}</p>
                    )}
                    {(!transcript.metadata?.full_transcript && (!transcript.segments || transcript.segments.length === 0)) && (
                      <span>No transcript available yet.</span>
                    )}
                  </div>
                )}
                {!transcriptLoading && !transcriptError && !transcript && (
                  <div className="text-sm text-muted-foreground">No transcript available yet.</div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                {!transcriptLoading && !transcriptError && transcript && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTranscriptText}
                  >
                    Download
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default CallHistory;