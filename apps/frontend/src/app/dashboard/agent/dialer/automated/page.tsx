"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadCloud, Play, Pause, SkipForward, PhoneOff } from "lucide-react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"

declare global {
  interface Window {
    JsSIP?: any
    XLSX?: any
  }
}

const API_PREFIX = `${API_BASE}/api`

export default function AutomatedDialerPage() {
  // SIP/Auth State
  const [ext, setExt] = useState("")
  const [pwd, setPwd] = useState("")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Auto dial state
  const [queue, setQueue] = useState<string[]>([]) // numbers to dial
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [autoRun, setAutoRun] = useState(false)
  const [delayMs, setDelayMs] = useState<number>(3000)

  // Refs to avoid stale closures in session event handlers
  const autoRunRef = useRef<boolean>(false)
  const currentIndexRef = useRef<number>(0)
  const queueRef = useRef<string[]>([])
  const delayMsRef = useRef<number>(3000)

  useEffect(() => { autoRunRef.current = autoRun }, [autoRun])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { delayMsRef.current = delayMs }, [delayMs])

  // Refs (copied/adapted from manual dialer)
  const uaRef = useRef<any>(null)
  const sessionRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callStartRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const hasAnsweredRef = useRef<boolean>(false)
  const uploadedOnceRef = useRef<boolean>(false)
  const dialStartRef = useRef<number | null>(null)
  const lastDialDestinationRef = useRef<string | null>(null)

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const lastRemoteStreamRef = useRef<MediaStream | null>(null)
  const localMicStreamRef = useRef<MediaStream | null>(null)

  // Tones
  const ringGainRef = useRef<GainNode | null>(null)
  const ringOsc1Ref = useRef<OscillatorNode | null>(null)
  const ringOsc2Ref = useRef<OscillatorNode | null>(null)
  const ringTimerRef = useRef<number | null>(null)
  const busyGainRef = useRef<GainNode | null>(null)
  const busyOsc1Ref = useRef<OscillatorNode | null>(null)
  const busyOsc2Ref = useRef<OscillatorNode | null>(null)
  const busyTimerRef = useRef<number | null>(null)

  // Helpers
  function isBusyCause(cause: any, code?: number, reason?: string): boolean {
    const c = String(cause || '').toLowerCase()
    const r = String(reason || '').toLowerCase()
    return c.includes('busy') || c.includes('486') || code === 486 || code === 603 || r.includes('busy') || r.includes('decline')
  }

  // Auto-login to SIP when JsSIP loads
  useEffect(() => {
    if (!isLoaded) return
    let aborted = false
    const run = async () => {
      try {
        setError(null)
        const headers: Record<string, string> = {}
        if (!USE_AUTH_COOKIE) {
          const t = getToken()
          if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_PREFIX}/agents/me/credentials`, {
          method: 'GET',
          credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
          headers,
        })
        if (!res.ok) throw new Error('Failed to get SIP credentials. Ensure an extension is assigned to your account.')
        const data = await res.json() as { success: true; extensionId: string; password: string }
        if (aborted) return
        setExt(data.extensionId)
        setPwd(data.password)
        await startUA(data.extensionId, data.password)
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Auto login failed')
      }
    }
    run()
    return () => { aborted = true }
  }, [isLoaded])

  const teardownUA = useCallback(() => {
    try {
      if (sessionRef.current) { try { sessionRef.current.terminate() } catch {} }
      if (uaRef.current) { try { uaRef.current.stop() } catch {} }
    } finally {
      sessionRef.current = null
      uaRef.current = null
    }
  }, [])
  useEffect(() => () => teardownUA(), [teardownUA])

  const attachRemoteAudio = useCallback((pc: RTCPeerConnection) => {
    const safePlay = async () => { try { await remoteAudioRef.current?.play() } catch (e: any) { setError((p) => p || `Audio play blocked: ${e?.message || 'permission or autoplay'}`) } }
    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        lastRemoteStreamRef.current = stream
        safePlay()
      }
    }
    const setFromReceivers = () => {
      try {
        const tracks = pc.getReceivers().map((r) => r.track).filter(Boolean) as MediaStreamTrack[]
        if (tracks.length && remoteAudioRef.current) {
          const stream = new MediaStream(tracks)
          remoteAudioRef.current.srcObject = stream
          lastRemoteStreamRef.current = stream
          safePlay()
        }
      } catch {}
    }
    setFromReceivers()
    pc.addEventListener('connectionstatechange', setFromReceivers)
  }, [])

  const fetchSipConfig = useCallback(async () => {
    const res = await fetch(`${API_PREFIX}/sip/config`)
    if (!res.ok) throw new Error(`Failed to load SIP config: ${res.status}`)
    return (await res.json()) as { wssUrl: string; domain: string; stunServer?: string }
  }, [])

  const startUA = useCallback(async (extension: string, password: string) => {
    setError(null)
    if (!window.JsSIP) throw new Error("JsSIP not loaded")
    const { wssUrl, domain, stunServer } = await fetchSipConfig()
    const socket = new window.JsSIP.WebSocketInterface(wssUrl)
    const configuration = {
      uri: `sip:${extension}@${domain}`,
      password,
      sockets: [socket],
      register: true,
      session_timers: true,
      session_timers_refresh_method: "UPDATE",
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      iceServers: stunServer ? [{ urls: stunServer }] : undefined,
    }
    window.JsSIP.debug.enable("JsSIP:*")
    const ua = new window.JsSIP.UA(configuration)
    ua.on("connected", () => setStatus("Connected"))
    ua.on("disconnected", () => setStatus("Disconnected"))
    ua.on("registered", () => setStatus("Registered"))
    ua.on("unregistered", () => setStatus("Unregistered"))
    ua.on("registrationFailed", (e: any) => setError(`Registration failed: ${e?.cause || "unknown"}`))

    ua.on("newRTCSession", (data: any) => {
      const session = data.session
      sessionRef.current = session

      session.on("peerconnection", (e: any) => {
        const pc: RTCPeerConnection = e.peerconnection
        attachRemoteAudio(pc)
      })

      session.on("confirmed", () => {
        try { const pc: RTCPeerConnection = (session as any).connection; if (pc) attachRemoteAudio(pc) } catch {}
      })

      session.on("progress", () => { setStatus("Ringing"); startRingback() })
      session.on("accepted", async () => {
        stopRingback()
        setStatus("In Call")
        callStartRef.current = Date.now()
        hasAnsweredRef.current = true
        if (timerRef.current) window.clearInterval(timerRef.current)
        timerRef.current = window.setInterval(() => { setStatus((s) => (s.startsWith("In Call") ? `In Call ${elapsed()}` : s)) }, 1000)
        try { await startRecording() } catch {}
      })
      session.on("failed", async (e: any) => {
        stopRingback()
        setStatus("Call Failed")
        setError(e?.cause || "Call failed")
        clearTimer()
        if (!uploadedOnceRef.current) {
          uploadedOnceRef.current = true
          const code = Number(e?.response?.status_code || 0)
          const reason = e?.response?.reason_phrase || String(e?.cause || '')
          const isBusy = isBusyCause(e?.cause, code, reason)
          if (isBusy) { try { await startBusyTone(); setTimeout(() => stopBusyTone(), 3000) } catch {} }
          await stopRecordingAndUpload({ sip_status: code || undefined, sip_reason: reason || undefined, hangup_cause: isBusy ? 'busy' : undefined })
        }
        scheduleNext()
      })
      session.on("ended", async () => {
        stopRingback()
        setStatus("Call Ended")
        clearTimer()
        if (!uploadedOnceRef.current) {
          uploadedOnceRef.current = true
          await stopRecordingAndUpload({})
        }
        scheduleNext()
      })
    })

    ua.start()
    uaRef.current = ua
  }, [attachRemoteAudio, fetchSipConfig])

  const clearTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    callStartRef.current = null
  }

  const elapsed = () => {
    if (!callStartRef.current) return ""
    const diff = Math.floor((Date.now() - callStartRef.current) / 1000)
    const mm = String(Math.floor(diff / 60)).padStart(2, "0")
    const ss = String(diff % 60).padStart(2, "0")
    return `${mm}:${ss}`
  }

  const ensureAudioCtx = async () => {
    if (!audioCtxRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    try { await audioCtxRef.current?.resume() } catch {}
  }

  const startRingback = async () => {
    try {
      await ensureAudioCtx()
      const ctx = audioCtxRef.current
      if (!ctx) return
      stopRingback()
      const gain = ctx.createGain()
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      osc1.frequency.value = 440
      osc2.frequency.value = 480
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0
      osc1.start(); osc2.start()
      ringGainRef.current = gain
      ringOsc1Ref.current = osc1
      ringOsc2Ref.current = osc2
      let on = false
      const tick = () => {
        on = !on
        if (ringGainRef.current) ringGainRef.current.gain.value = on ? 0.1 : 0
        const next = on ? 2000 : 4000
        ringTimerRef.current = window.setTimeout(tick, next)
      }
      tick()
    } catch {}
  }

  const stopRingback = () => {
    if (ringTimerRef.current) { window.clearTimeout(ringTimerRef.current); ringTimerRef.current = null }
    try { ringOsc1Ref.current?.stop() } catch {}
    try { ringOsc2Ref.current?.stop() } catch {}
    try { ringOsc1Ref.current?.disconnect() } catch {}
    try { ringOsc2Ref.current?.disconnect() } catch {}
    try { ringGainRef.current?.disconnect() } catch {}
    ringOsc1Ref.current = null
    ringOsc2Ref.current = null
    ringGainRef.current = null
  }

  const startBusyTone = async () => {
    try {
      await ensureAudioCtx()
      const ctx = audioCtxRef.current
      if (!ctx) return
      stopBusyTone()
      const gain = ctx.createGain()
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      osc1.frequency.value = 480
      osc2.frequency.value = 620
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0
      osc1.start(); osc2.start()
      busyGainRef.current = gain
      busyOsc1Ref.current = osc1
      busyOsc2Ref.current = osc2
      let on = false
      const tick = () => {
        on = !on
        if (busyGainRef.current) busyGainRef.current.gain.value = on ? 0.15 : 0
        busyTimerRef.current = window.setTimeout(tick, 500)
      }
      tick()
    } catch {}
  }

  const stopBusyTone = () => {
    if (busyTimerRef.current) { window.clearTimeout(busyTimerRef.current); busyTimerRef.current = null }
    try { busyOsc1Ref.current?.stop() } catch {}
    try { busyOsc2Ref.current?.stop() } catch {}
    try { busyOsc1Ref.current?.disconnect() } catch {}
    try { busyOsc2Ref.current?.disconnect() } catch {}
    try { busyGainRef.current?.disconnect() } catch {}
    busyOsc1Ref.current = null
    busyOsc2Ref.current = null
    busyGainRef.current = null
  }

  async function getLocalMicStream() {
    try {
      if (!localMicStreamRef.current) {
        localMicStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      }
      return localMicStreamRef.current
    } catch { return null }
  }

  async function startRecording() {
    try {
      await ensureAudioCtx()
      const ctx = audioCtxRef.current!
      const dest = ctx.createMediaStreamDestination()
      mixDestRef.current = dest
      const addStream = (ms: MediaStream | null) => {
        if (!ms) return
        try { const src = ctx.createMediaStreamSource(ms); src.connect(dest) } catch {}
      }
      addStream(lastRemoteStreamRef.current)
      addStream(await getLocalMicStream())
      const mime = 'audio/webm'
      recordedChunksRef.current = []
      const rec = new MediaRecorder(dest.stream, { mimeType: mime })
      rec.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunksRef.current.push(e.data) }
      rec.start(250)
      mediaRecorderRef.current = rec
    } catch {}
  }

  async function fetchLoggedUsername(): Promise<string | null> {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) { credentials = 'include' } else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
      const res = await fetch(`${API_PREFIX}/auth/me`, { method: 'GET', headers, credentials })
      if (!res.ok) return null
      const data = await res.json().catch(() => null) as any
      return data?.user?.username || null
    } catch { return null }
  }

  async function stopRecordingAndUpload(extra: { sip_status?: number; sip_reason?: string; hangup_cause?: string } = {}) {
    try {
      const rec = mediaRecorderRef.current
      if (rec && rec.state !== 'inactive') {
        await new Promise<void>((resolve) => { rec.onstop = () => resolve(); try { rec.stop() } catch { resolve() } })
      }
    } catch {}
    const blob = recordedChunksRef.current.length ? new Blob(recordedChunksRef.current, { type: 'audio/webm' }) : null
    mediaRecorderRef.current = null
    recordedChunksRef.current = []

    const now = new Date()
    const start_time = new Date((dialStartRef.current || sessionRef.current?._created || Date.now()))
    const answer_time = hasAnsweredRef.current && callStartRef.current ? new Date(callStartRef.current) : null
    const end_time = now
    const call_duration = answer_time ? Math.max(0, Math.floor((end_time.getTime() - answer_time.getTime()) / 1000)) : null

    const form = new FormData()
    const loggedName = await fetchLoggedUsername()
    if (loggedName) form.append('username', loggedName)
    else if (ext) form.append('username', ext)
    form.append('unique_id', String(sessionRef.current?.id || cryptoRandom()))
    form.append('start_time', start_time.toISOString())
    if (answer_time) form.append('answer_time', answer_time.toISOString())
    form.append('end_time', end_time.toISOString())
    if (call_duration !== null) form.append('call_duration', String(call_duration))
    if (call_duration !== null) form.append('billed_duration', String(call_duration))
    form.append('source', 'web')
    if (ext) form.append('extension', ext)
    const sess = sessionRef.current
    const sipUser = (() => { try { return (sess?.remote_identity?.uri?.user || sess?.request?.to?.uri?.user || sess?.remote_identity?._uri?._user || null) } catch { return null } })()
    const destination = (lastDialDestinationRef.current || sipUser || '').toString()
    if (destination) form.append('destination', destination)
    form.append('direction', 'outbound')
    if (typeof extra.sip_status === 'number') form.append('sip_status', String(extra.sip_status))
    if (extra.sip_reason) form.append('sip_reason', extra.sip_reason)
    if (extra.hangup_cause) form.append('hangup_cause', extra.hangup_cause)
    form.append('platform', 'web')
    if (blob) form.append('recording', blob, `call_${Date.now()}.webm`)

    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) { credentials = 'include'; const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf }
      else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
      const res = await fetch(`${API_PREFIX}/calls`, { method: 'POST', body: form, headers, credentials })
      if (!res.ok) { const text = await res.text().catch(() => ''); console.warn('Upload call record failed', res.status, text) }
    } catch (e) { console.warn('Failed to upload call record', e) }
  }

  function cryptoRandom() { try { return (crypto as any).randomUUID?.() || String(Math.random()).slice(2) } catch { return String(Math.random()).slice(2) } }

  // Dial logic
  const placeCallTo = async (num: string) => {
    setError(null)
    if (!uaRef.current) { setError("UA not ready"); return }
    if (!num) { setError("Empty number"); return }
    const options = {
      eventHandlers: {},
      mediaConstraints: { audio: true, video: false },
      pcConfig: { rtcpMuxPolicy: "require" },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    }
    try {
      hasAnsweredRef.current = false
      uploadedOnceRef.current = false
      dialStartRef.current = Date.now()
      await ensureAudioCtx()
      lastDialDestinationRef.current = num || null
      uaRef.current.call(numberToSipUri(num, ext), options)
    } catch (e: any) {
      setError(e?.message || "Call start error")
    }
  }

  const hangup = async () => {
    try { sessionRef.current?.terminate() } catch {}
    stopRingback()
    if (!uploadedOnceRef.current) { uploadedOnceRef.current = true; await stopRecordingAndUpload({}) }
  }

  const scheduleNext = () => {
    if (!autoRunRef.current) return
    const nextIdx = currentIndexRef.current + 1
    const list = queueRef.current
    if (nextIdx >= list.length) {
      setAutoRun(false)
      autoRunRef.current = false
      setStatus("Completed")
      return
    }
    const delay = Math.max(0, delayMsRef.current)
    window.setTimeout(() => {
      setCurrentIndex(nextIdx)
      currentIndexRef.current = nextIdx
      placeCallTo(list[nextIdx])
    }, delay)
  }

  const startAuto = async () => {
    if (!queue.length) { setError("Upload a list first"); return }
    if (!status.includes("Registered")) { setError("SIP not registered yet") ; return }
    setAutoRun(true)
    autoRunRef.current = true
    const list = queueRef.current
    const idx = currentIndexRef.current < list.length ? currentIndexRef.current : 0
    setCurrentIndex(idx)
    currentIndexRef.current = idx
    await placeCallTo(list[idx])
  }

  const pauseAuto = () => { setAutoRun(false) }
  const skipNext = () => {
    const list = queueRef.current
    const nextIdx = Math.min(list.length, currentIndexRef.current + 1)
    setCurrentIndex(nextIdx)
    currentIndexRef.current = nextIdx
    if (nextIdx < list.length) placeCallTo(list[nextIdx])
  }

  // File parsing (CSV/XLSX)
  const parseCsvText = (text: string): string[] => {
    // naive line split, take first column of each non-empty row
    return text
      .split(/\r?\n/)
      .map(l => l.split(/[;,\t]/)[0]?.trim())
      .filter(Boolean)
  }

  const onFile = async (file: File) => {
    try {
      setError(null)
      const name = file.name.toLowerCase()
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text()
        const numbers = normalizeNumbers(parseCsvText(text))
        setQueue(numbers); queueRef.current = numbers; setCurrentIndex(0); currentIndexRef.current = 0
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        if (!window.XLSX) throw new Error('XLSX parser not loaded')
        const data = new Uint8Array(await file.arrayBuffer())
        const wb = window.XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = window.XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        const nums = normalizeNumbers(rows.map(r => String(r?.[0] ?? '').trim()))
        setQueue(nums); queueRef.current = nums; setCurrentIndex(0); currentIndexRef.current = 0
      } else {
        setError('Unsupported file. Use CSV or Excel')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to parse file')
    }
  }

  const normalizeNumbers = (list: string[]) => {
    const cleaned = list
      .map(s => s.replace(/[^0-9+]/g, '').replace(/^00/, '+'))
      .map(s => s.trim())
      .filter(Boolean)
    // de-duplicate preserving order
    const seen = new Set<string>()
    const out: string[] = []
    for (const n of cleaned) { if (!seen.has(n)) { seen.add(n); out.push(n) } }
    return out
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
                  <BreadcrumbLink href="/dashboard/agent/dialer">Dialer</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Automated</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${status.includes("Registered") ? "bg-emerald-100 text-emerald-800" : status.includes("Connected") ? "bg-blue-100 text-blue-800" : status.includes("Call") ? "bg-purple-100 text-purple-800" : autoRun ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"}`}>{status}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Script src="/js/jssip.min.js" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />
          <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />

          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5 md:col-span-2">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Label htmlFor="file">Upload CSV/XLSX</Label>
                  <Input id="file" type="file" accept=".csv,.xlsx,.xls,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
                  <Button variant="outline" className="gap-2" onClick={() => { setQueue([]); setCurrentIndex(0); setAutoRun(false) }}>
                    <UploadCloud className="h-4 w-4" /> Clear
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="min-w-24">Delay (ms)</Label>
                  <Input type="number" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value || 0))} className="w-40" />
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={startAuto} disabled={!queue.length || autoRun || !status.includes("Registered") } className="gap-2">
                    <Play className="h-4 w-4" /> Start
                  </Button>
                  <Button onClick={pauseAuto} variant="outline" disabled={!autoRun} className="gap-2">
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                  <Button onClick={skipNext} variant="outline" disabled={!queue.length || currentIndex >= queue.length - 1} className="gap-2">
                    <SkipForward className="h-4 w-4" /> Skip
                  </Button>
                  <Button onClick={hangup} variant="destructive" disabled={!sessionRef.current} className="gap-2">
                    <PhoneOff className="h-4 w-4" /> Hang Up
                  </Button>
                </div>

                <audio ref={remoteAudioRef} autoPlay playsInline controls className="mt-2 w-full" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-sm text-muted-foreground mb-2">Queue</div>
              <div className="text-xs text-muted-foreground mb-2">{queue.length} numbers • Index {Math.min(currentIndex + 1, queue.length)} / {queue.length}</div>
              <div className="max-h-80 overflow-auto border rounded">
                {queue.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No numbers loaded</div>
                ) : (
                  <ul className="text-sm">
                    {queue.map((n, i) => (
                      <li key={`${n}-${i}`} className={`px-3 py-2 border-b last:border-b-0 ${i === currentIndex ? 'bg-accent/50 font-medium' : ''}`}>{i + 1}. {n}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function numberToSipUri(num: string, _ext: string) {
  if (num.startsWith("sip:")) return num
  return num
}

