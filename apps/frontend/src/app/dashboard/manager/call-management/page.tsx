"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { API_BASE } from "@/lib/api";
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth";
import { Download, RefreshCcw, ChevronDownIcon, Play, Pause, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ManagerSidebar } from '../components/ManagerSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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

type SortField = 'start_time' | 'call_duration' | 'disposition' | 'username' | 'destination'
type SortDirection = 'asc' | 'desc'

const CallManagement = () => {
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
  const [sortField, setSortField] = React.useState<SortField>('start_time')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  const [transcriptCallId, setTranscriptCallId] = React.useState<number | string | null>(null)
  const [transcript, setTranscript] = React.useState<any | null>(null)
  const [transcriptLoading, setTranscriptLoading] = React.useState(false)
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)

  const fetchCalls = React.useCallback(async (p: number) => {
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
        qs.set('username', query)
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
  }, [pageSize, fromDate, toDate, query, status, direction])

  React.useEffect(() => { fetchCalls(page) }, [fetchCalls, page])

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
    if (transcript.metadata?.full_transcript) {
      text = String(transcript.metadata.full_transcript ?? '')
    } else if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
      text = transcript.segments.map((s: any, idx: number) => {
        const rawSpeaker = typeof s.speaker === 'string' ? s.speaker.toLowerCase() : ''
        let speakerLabel: 'Agent' | 'Prospect'
        if (rawSpeaker === 'agent' || rawSpeaker === 'prospect') {
          speakerLabel = rawSpeaker === 'agent' ? 'Agent' : 'Prospect'
        } else {
          speakerLabel = idx % 2 === 0 ? 'Agent' : 'Prospect'
        }
        const body = typeof s.text === 'string' ? s.text : ''
        return `${speakerLabel}: ${body}`.trim()
      }).join('\n')
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
  
  const fmtDur = (n?: number | null) => (n ?? null) !== null ? `${n}s` : '-'

  const badgeFor = (d?: string | null) => {
    const v = (d || '').toUpperCase()
    const variant = v === 'ANSWERED' ? 'default' : v === 'NO ANSWER' ? 'secondary' : v === 'BUSY' ? 'outline' : 'destructive'
    const cls = v === 'ANSWERED'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30'
      : v === 'NO ANSWER'
      ? 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20 dark:bg-gray-500/15 dark:border-gray-500/30'
      : v === 'BUSY'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30'
      : v === 'FAILED' || v === 'REJECTED'
      ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 dark:bg-red-500/15 dark:border-red-500/30'
      : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20 dark:bg-slate-500/15 dark:border-slate-500/30'
    const label = v ? v.charAt(0) + v.slice(1).toLowerCase() : '-'
    return <Badge variant={variant} className={cls}>{label}</Badge>
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedItems = React.useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]
      
      if (sortField === 'start_time') {
        aVal = new Date(a.start_time).getTime()
        bVal = new Date(b.start_time).getTime()
      } else if (sortField === 'call_duration') {
        aVal = a.call_duration ?? 0
        bVal = b.call_duration ?? 0
      } else if (sortField === 'disposition') {
        aVal = (a.disposition || '').toLowerCase()
        bVal = (b.disposition || '').toLowerCase()
      } else if (sortField === 'username') {
        aVal = (a.username || '').toLowerCase()
        bVal = (b.username || '').toLowerCase()
      } else if (sortField === 'destination') {
        aVal = (a.destination || '').toLowerCase()
        bVal = (b.destination || '').toLowerCase()
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [items, sortField, sortDirection])

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 inline opacity-40" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 inline" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 inline" />
  }

  const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
    <div className="flex items-end gap-[1px] h-3 w-12">
      {[0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.6, 0.8, 1, 0.8, 0.6, 0.4].map((height, i) => (
        <span 
          key={i} 
          style={{ 
            height: `${height * 100}%`,
            animation: active ? `wave 0.7s ${0.05 * i}s infinite ease-in-out` : 'none',
            animationFillMode: active ? 'both' : 'forwards',
          }} 
          className="w-[1px] bg-foreground/70 rounded-sm origin-bottom"
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
    
    return (
      <div className="flex items-center gap-2 w-full max-w-sm">
        <button 
          onClick={toggle} 
          className="text-foreground hover:bg-accent/50 rounded p-1 transition-colors focus:outline-none"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <Play className="h-3.5 w-3.5 ml-0.5" strokeWidth={2.5} />
          )}
        </button>
        
        <div className="flex-1 min-w-0 flex items-center">
          <div className="hidden lg:block">
            <WaveBars active={playing} />
          </div>
        </div>
        
        <div className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">
          {Math.floor(progress)}s
        </div>
        
        <audio ref={audioRef} src={src} preload="none" />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="text-muted-foreground hover:bg-accent/50 rounded p-1 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadRecording(src, name);
                }} 
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Call Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0"> 
          <div className="p-6">
            <div className="mb-4 rounded-md border bg-muted/20 p-3 relative">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center pr-12">
                <div className="flex flex-col gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full sm:w-[220px] md:w-[240px] justify-between font-normal">
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
                <Input 
                  className="h-9 w-full sm:w-[260px] md:w-[300px]" 
                  placeholder="Search phone, extension, or user" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-[130px] md:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ANSWERED">Answered</SelectItem>
                    <SelectItem value="NO ANSWER">No answer</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="h-9 w-[130px] md:w-[140px]">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Calls</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="h-9" onClick={() => { setPage(1); fetchCalls(1) }}>Search</Button>
                <div className="flex items-center justify-end absolute right-3 top-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9" 
                          onClick={() => { setPage(1); fetchCalls(1) }} 
                          aria-label="Refresh"
                        >
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
              <table className="min-w-full text-xs md:text-sm table-auto">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">ID</th>
                    <th 
                      className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('username')}
                    >
                      User <SortIcon field="username" />
                    </th>
                    <th 
                      className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('destination')}
                    >
                      Destination <SortIcon field="destination" />
                    </th>
                    <th 
                      className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('start_time')}
                    >
                      Start Time (UTC) <SortIcon field="start_time" />
                    </th>
                    <th 
                      className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('call_duration')}
                    >
                      Duration <SortIcon field="call_duration" />
                    </th>
                    <th 
                      className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('disposition')}
                    >
                      Status <SortIcon field="disposition" />
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recording</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                        {loading ? 'Loading…' : 'No records found'}
                      </td>
                    </tr>
                  )}
                  {sortedItems.map((row, idx) => (
                    <tr key={String(row.id)} className="hover:bg-accent/50 transition-colors">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{row.username || row.extension || '-'}</td>
                      <td className="px-3 py-2 max-w-[140px] md:max-w-[200px] truncate">{row.destination || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{toUtc(row.start_time)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDur(row.call_duration)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{badgeFor(row.disposition)}</td>
                      <td className="px-3 py-2">
                        {row.recording_url ? (
                          <CompactAudio src={row.recording_url} name={row.id} />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTranscriptCallId(row.id)
                            fetchTranscript(row.id)
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-center mt-4 gap-2">
              {Array.from({ length: pageCount }).map((_, i) => (
                <Button 
                  key={i} 
                  variant={page === i + 1 ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setPage(i + 1)} 
                  disabled={page === i + 1}
                >
                  {i + 1}
                </Button>
              ))}
            </div>

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
                    <div className="text-sm text-muted-foreground">Loading transcript…</div>
                  )}
                  {!transcriptLoading && transcriptError && (
                    <div className="text-xs md:text-sm text-red-500">{transcriptError}</div>
                  )}
                  {!transcriptLoading && !transcriptError && transcript && (
                    <div className="space-y-3">
                      {transcript.metadata?.full_transcript && (
                        <p className="whitespace-pre-wrap break-words text-sm">{transcript.metadata.full_transcript}</p>
                      )}
                      {!transcript.metadata?.full_transcript && Array.isArray(transcript.segments) && transcript.segments.length > 0 && (
                        <div className="space-y-2">
                          {transcript.segments.map((s: any, idx: number) => {
                            const rawSpeaker = typeof s.speaker === 'string' ? s.speaker.toLowerCase() : ''
                            let speaker: 'agent' | 'prospect'
                            if (rawSpeaker === 'agent' || rawSpeaker === 'prospect') {
                              speaker = rawSpeaker as 'agent' | 'prospect'
                            } else {
                              speaker = idx % 2 === 0 ? 'agent' : 'prospect'
                            }
                            const isAgent = speaker === 'agent'
                            return (
                              <div key={idx} className={isAgent ? 'flex justify-end' : 'flex justify-start'}>
                                <div className={
                                  isAgent
                                    ? 'max-w-[80%] rounded-lg px-3 py-2 text-xs md:text-sm bg-primary text-primary-foreground'
                                    : 'max-w-[80%] rounded-lg px-3 py-2 text-xs md:text-sm bg-muted text-foreground'
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
                      {!transcript.metadata?.full_transcript && (!transcript.segments || transcript.segments.length === 0) && (
                        <span className="text-sm text-muted-foreground">No transcript available yet.</span>
                      )}
                    </div>
                  )}
                  {!transcriptLoading && !transcriptError && !transcript && (
                    <div className="text-xs md:text-sm text-muted-foreground">No transcript available yet.</div>
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default CallManagement;
