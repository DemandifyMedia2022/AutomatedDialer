"use client"

import React from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useAgentPresence } from "@/hooks/useAgentPresence"
import { io, Socket } from 'socket.io-client'
import Script from "next/script"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Headphones, Mic, Users, CheckCircle, XCircle } from "lucide-react"

type Me = { id: number; role: string; username: string | null; email: string | null }
type LiveCall = {
  userId: number
  username: string | null
  callId: number
  status: string
  startTime: number | null
  source?: string | null
  destination?: string | null
  did?: string | null
  direction?: string | null
  action?: string | null
}
type AgentRow = { userId: number; name: string; extension?: string | null; status: string; durationSeconds: number; lastStatusTs?: string | null }

function pad(n: number) { return n < 10 ? `0${n}` : String(n) }
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
function formatTime(ms?: number | null) {
  if (!ms) return '—'
  try {
    const d = new Date(ms)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return '—' }
}

function StatusBadge({ status }: { status: string }) {
  const cls = useMemo(() => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border"
    const s = String(status || '').toUpperCase()
    // Match Track Agent pills: mint for Active/Available, soft red for Offline
    if (s === 'ON_CALL' || s === 'CONNECTED' || s === 'AVAILABLE') {
      return `${base} bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30`
    }
    if (s === 'OFFLINE') {
      return `${base} bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-500/30`
    }
    if (s === 'BREAK') {
      return `${base} bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-500/30`
    }
    if (s === 'IDLE') {
      return `${base} bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-500/30`
    }
    if (s === 'DIALING') {
      return `${base} bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30`
    }
    if (s === 'RINGING') {
      return `${base} bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-500/30`
    }
    if (s === 'CONNECTING') {
      return `${base} bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-500/30`
    }
    return `${base} bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-500/30`
  }, [status])

  const label = useMemo(() => {
    const raw = String(status || '').replace(/_/g, ' ').toLowerCase()
    return raw.replace(/\b\w/g, (c) => c.toUpperCase())
  }, [status])

  const isOnline = useMemo(() => {
    const s = String(status || '').toUpperCase()
    return s === 'ON_CALL' || s === 'CONNECTED' || s === 'AVAILABLE'
  }, [status])

  const isOffline = useMemo(() => {
    return String(status || '').toUpperCase() === 'OFFLINE'
  }, [status])

  return (
    <span className={cls}>
      {isOnline && <CheckCircle className="mr-1 h-3 w-3" />}
      {isOffline && <XCircle className="mr-1 h-3 w-3" />}
      {label}
    </span>
  )
}

export default function LiveCallsPage() {
  const { status, secondsSinceChange } = useAgentPresence()
  const [me, setMe] = useState<Me | null>(null)
  const [items, setItems] = useState<LiveCall[]>([])
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [didMap, setDidMap] = useState<Record<string, string>>({})
  const sref = useRef<Socket | null>(null)
  const timerRef = useRef<any>(null)
  const uaRef = useRef<any>(null)
  const sessionRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const [sipConfig, setSipConfig] = useState<{ wssUrl: string; domain: string; stunServer?: string } | null>(null)
  const [sipReady, setSipReady] = useState(false)
  const [sipError, setSipError] = useState<string | null>(null)
  const [monitorMsg, setMonitorMsg] = useState<string | null>(null)
  const [monitorErr, setMonitorErr] = useState<string | null>(null)
  const [monitoring, setMonitoring] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || API_BASE
    fetch(`${BACKEND}/api/profile/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (mounted && j?.user) setMe(j.user) })
      .catch(() => { })
    // Initial live calls
    fetch(`${BACKEND}/api/live-calls`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (mounted && Array.isArray(j?.items)) setItems(j.items) })
      .catch(() => { })

    // Initial agents snapshot
    fetch(`${BACKEND}/api/presence/manager/agents`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (mounted && Array.isArray(j?.items)) setAgents(j.items) })
      .catch(() => { })

    // Load extension->DID mappings for fallback
    fetch(`${BACKEND}/api/extension-dids/dids`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!mounted) return
        const map: Record<string, string> = {}
        const arr = Array.isArray(j?.items) ? j.items : []
        for (const it of arr) {
          const ext = String(it.extensionId || it.extension_id || '').trim()
          const did = String(it.did || '').trim()
          if (ext && did) map[ext] = did
        }
        setDidMap(map)
      })
      .catch(() => { })

    // Subscribe to socket updates
    try {
      const s = io(BACKEND, {
        withCredentials: USE_AUTH_COOKIE,
        transports: ['websocket'],
        auth: USE_AUTH_COOKIE ? undefined : { token: getToken() || undefined },
      })
      sref.current = s
      s.on('live:calls:update', (arr: LiveCall[]) => { if (Array.isArray(arr)) setItems(arr) })
      s.on('presence:update', () => {
        fetch(`${BACKEND}/api/presence/manager/agents`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .then(j => { if (mounted && Array.isArray(j?.items)) setAgents(j.items) })
          .catch(() => { })
      })
      s.on('extension:did:update', (p: any) => {
        try {
          const ext = String(p?.extensionId || '').trim()
          const did = String(p?.did || '').trim()
          if (!ext) return
          setDidMap(prev => ({ ...prev, [ext]: did }))
        } catch { }
      })
    } catch { }

    // Local duration ticker for rows with startTime
    timerRef.current = setInterval(() => { setItems(prev => [...prev]) }, 1000)
    // Fallback polling: refresh live calls snapshot periodically in case socket updates are missed
    const poll = setInterval(() => {
      fetch(`${BACKEND}/api/live-calls`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(j => { if (mounted && Array.isArray(j?.items)) setItems(j.items) })
        .catch(() => { })
    }, 5000)
    return () => { mounted = false; try { clearInterval(poll) } catch { }; }
  }, [])

  const fetchSipConfig = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/sip/config`)
    if (!res.ok) throw new Error(`Failed to load SIP config: ${res.status}`)
    return (await res.json()) as { wssUrl: string; domain: string; stunServer?: string }
  }, [])

  const startUA = useCallback(async (extension: string, password: string) => {
    setSipError(null)
    const JsSIP: any = (window as any).JsSIP
    if (!JsSIP) throw new Error("JsSIP not loaded")
    const cfg = sipConfig || await fetchSipConfig().catch((e) => { throw e })
    if (!sipConfig) setSipConfig(cfg)
    const socket = new JsSIP.WebSocketInterface(cfg.wssUrl)
    const configuration: any = {
      uri: `sip:${extension}@${cfg.domain}`,
      password,
      sockets: [socket],
      register: true,
      session_timers: true,
      session_timers_refresh_method: "UPDATE",
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      iceServers: cfg.stunServer ? [{ urls: cfg.stunServer }] : undefined,
    }
    try { JsSIP.debug.enable("JsSIP:*") } catch { }
    const ua = new JsSIP.UA(configuration)
    ua.on("registered", () => setSipReady(true))
    ua.on("unregistered", () => setSipReady(false))
    ua.on("registrationFailed", (e: any) => setSipError(`Registration failed: ${e?.cause || 'unknown'}`))
    ua.on("newRTCSession", (data: any) => {
      const session = data.session
      sessionRef.current = session
      session.on("peerconnection", (e: any) => {
        const pc: RTCPeerConnection = e.peerconnection
        pc.ontrack = (event) => {
          const [stream] = event.streams
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream
            remoteAudioRef.current.play().catch(() => { })
          }
        }
      })
      session.on("accepted", () => {
        setMonitoring(true)
        setMonitorErr(null)
        setMonitorMsg("Monitoring active")
        setTimeout(() => setMonitorMsg(null), 2500)
      })
      session.on("failed", () => {
        setMonitoring(false)
        setMonitorErr("Monitor call failed")
        setTimeout(() => setMonitorErr(null), 3000)
      })
      session.on("ended", () => {
        setMonitoring(false)
        setMonitorMsg("Monitoring ended")
        setTimeout(() => setMonitorMsg(null), 2500)
      })
      session.on("confirmed", () => {
        try {
          const pc: RTCPeerConnection = (session as any).connection
          if (pc) {
            pc.ontrack = (event: RTCTrackEvent) => {
              const [stream] = event.streams
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream
                remoteAudioRef.current.play().catch(() => { })
              }
            }
          }
        } catch { }
      })
    })
    ua.start()
    uaRef.current = ua
  }, [fetchSipConfig, sipConfig])

  useEffect(() => {
    let aborted = false
    const init = async () => {
      try {
        // fetch agent (admin) SIP credentials
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = 'omit'
        if (USE_AUTH_COOKIE) {
          credentials = 'include'
          const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf
        } else {
          const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/agents/me/credentials`, { method: 'GET', headers, credentials })
        if (!res.ok) throw new Error('Failed to get SIP credentials')
        const data = await res.json() as { extensionId: string; password: string }
        if (aborted) return
        await startUA(data.extensionId, data.password)
      } catch (e: any) {
        setSipError(e?.message || 'SIP init failed')
      }
    }
    init()
    return () => { aborted = true }
  }, [startUA])

  const monitorCall = useCallback(async (extension?: string | null, mode?: 'listen' | 'whisper' | 'barge') => {
    if (!extension) return
    if (!uaRef.current) { setSipError('UA not ready'); return }
    const cfg = sipConfig || await fetchSipConfig().catch(() => null)
    if (!cfg) { setSipError('SIP config missing'); return }
    const prefix = mode === 'whisper' ? '*223' : mode === 'barge' ? '*224' : '*222'
    const targetUser = `${prefix}${extension}`
    try {
      const options: any = {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      }
      // Avoid overlapping sessions
      try { sessionRef.current?.terminate() } catch { }
      setMonitoring(true)
      setMonitorErr(null)
      setMonitorMsg(`Dialing ${targetUser}…`)
      uaRef.current.call(`sip:${targetUser}@${cfg.domain}`, options)
    } catch (e) {
      setSipError('Monitor call failed')
    }
  }, [fetchSipConfig, sipConfig])

  const stopMonitor = useCallback(() => {
    try { sessionRef.current?.terminate() } catch { }
    setMonitoring(false)
    setMonitorMsg("Monitoring ended")
    setTimeout(() => setMonitorMsg(null), 2000)
  }, [])

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
                  <BreadcrumbPage>Live Calls</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Live Calls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 px-4 py-3 text-sm">
                <span className="font-medium">Note:</span> Admin must be logged in with an extension (Dialer) to use Listen, Whisper, and Barge features.
              </div>
              {sipError && (
                <div className="rounded-md border bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 px-4 py-3 text-sm">
                  {sipError}
                </div>
              )}
              {monitorMsg && (
                <div className="rounded-md border bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 px-4 py-3 text-sm">
                  {monitorMsg}
                </div>
              )}
              {monitorErr && (
                <div className="rounded-md border bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 px-4 py-3 text-sm">
                  {monitorErr}
                </div>
              )}
              <audio ref={remoteAudioRef} autoPlay className="hidden" />

              {monitoring && (
                <div className="flex items-center justify-end">
                  <Button variant="destructive" onClick={stopMonitor}>Stop Monitor</Button>
                </div>
              )}

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead className="w-[160px]">Agent</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead className="w-[140px]">TFN/DID</TableHead>
                      <TableHead className="w-[110px]">Direction</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[120px] text-center">Start Time</TableHead>
                      <TableHead className="w-[120px] text-center">Duration</TableHead>
                      <TableHead className="w-[160px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 && agents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No active calls</TableCell>
                      </TableRow>
                    )}
                    {/* Merge live calls phases over agents: show all agents; if a live call exists for a user, override status/duration */}
                    {(agents.length > 0 ? agents : []).map((a, idx) => {
                      const lc = items.find(x => x.userId === a.userId)
                      const dispStatus = lc ? String(lc.status).toUpperCase() : String(a.status).toUpperCase()
                      const dur = lc && lc.startTime ? Math.max(0, Math.floor((Date.now() - lc.startTime) / 1000)) : (a.durationSeconds || 0)
                      const startTs = formatTime(lc?.startTime ?? null)
                      return (
                        <TableRow key={`agent-${a.userId}`}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{a.name}</TableCell>
                          <TableCell className="font-medium">{lc?.source || a.extension || '—'}</TableCell>
                          <TableCell>{lc?.destination || '—'}</TableCell>
                          <TableCell>{lc?.did || (a.extension ? (didMap[a.extension] || '—') : '—')}</TableCell>
                          <TableCell>{lc?.direction || 'OUT'}</TableCell>
                          <TableCell>
                            <StatusBadge status={dispStatus} />
                          </TableCell>
                          <TableCell className="text-center">{startTs}</TableCell>
                          <TableCell className="text-center tabular-nums">{formatDuration(dur)}</TableCell>
                          <TableCell className="text-center space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="outline" onClick={() => monitorCall(a.extension, 'listen')} disabled={!a.extension} aria-label="Listen">
                                    <Headphones className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Listen</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="outline" onClick={() => monitorCall(a.extension, 'whisper')} disabled={!a.extension} aria-label="Whisper">
                                    <Mic className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Whisper</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="outline" onClick={() => monitorCall(a.extension, 'barge')} disabled={!a.extension} aria-label="Barge">
                                    <Users className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Barge</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {/* If no agents list, but live calls exist (edge case), render live calls alone */}
                    {agents.length === 0 && items.map((c, idx) => (
                      <TableRow key={`${c.userId}-${c.callId}`}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{c.username || 'User ' + c.userId}</TableCell>
                        <TableCell className="font-medium">{c.source || '—'}</TableCell>
                        <TableCell>{c.destination || '—'}</TableCell>
                        <TableCell>{c.did || '—'}</TableCell>
                        <TableCell>{c.direction || '—'}</TableCell>
                        <TableCell>
                          <StatusBadge status={String(c.status).toUpperCase()} />
                        </TableCell>
                        <TableCell className="text-center">{formatTime(c.startTime)}</TableCell>
                        <TableCell className="text-center tabular-nums">{c.startTime ? formatDuration(Math.max(0, Math.floor((Date.now() - c.startTime) / 1000))) : '—'}</TableCell>
                        <TableCell className="text-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="outline" onClick={() => monitorCall(c.source, 'listen')} disabled={!c.source} aria-label="Listen">
                                  <Headphones className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Listen</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="outline" onClick={() => monitorCall(c.source, 'whisper')} disabled={!c.source} aria-label="Whisper">
                                  <Mic className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Whisper</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="outline" onClick={() => monitorCall(c.source, 'barge')} disabled={!c.source} aria-label="Barge">
                                  <Users className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Barge</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
      <Script src="/js/jssip.min.js" strategy="afterInteractive" />
    </SidebarProvider>
  )
}