"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { Phone, PhoneOff, Mic, MicOff, Trash2, Search, Pause, UserPlus, Grid2X2, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"

declare global {
  interface Window {
    JsSIP?: any
  }
}

const API_PREFIX = `${API_BASE}/api`

export default function ManualDialerPage() {
  const [ext, setExt] = useState("")
  const [pwd, setPwd] = useState("")
  const [number, setNumber] = useState("")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPopup, setShowPopup] = useState(false)

  // Notes state (local only UI)
  const [notes, setNotes] = useState<Array<{ id: string; text: string; phone?: string; at: string }>>([
    { id: "n1", text: "Discussed pricing and next steps. Client interested in enterprise plan.", phone: "+15551234567", at: "2024-01-20 14:30" },
    { id: "n2", text: "Follow up needed on proposal delivery.", phone: "+15559876543", at: "2024-01-19 10:15" },
  ])
  const [newNote, setNewNote] = useState("")

  // Draggable in-call popup position
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 420, y: 160 })
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)

  const uaRef = useRef<any>(null)
  const sessionRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callStartRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const hasAnsweredRef = useRef<boolean>(false)
  const uploadedOnceRef = useRef<boolean>(false)
  const dialStartRef = useRef<number | null>(null)

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null) // also used for ringback
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const lastRemoteStreamRef = useRef<MediaStream | null>(null)
  const localMicStreamRef = useRef<MediaStream | null>(null)
  const lastDialDestinationRef = useRef<string | null>(null)

  // Ringback tone helpers
  const ringGainRef = useRef<GainNode | null>(null)
  const ringOsc1Ref = useRef<OscillatorNode | null>(null)
  const ringOsc2Ref = useRef<OscillatorNode | null>(null)
  const ringTimerRef = useRef<number | null>(null)
  // Busy tone helpers
  const busyGainRef = useRef<GainNode | null>(null)
  const busyOsc1Ref = useRef<OscillatorNode | null>(null)
  const busyOsc2Ref = useRef<OscillatorNode | null>(null)
  const busyTimerRef = useRef<number | null>(null)

  const lastDialedNumber = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("lastDialedNumber")
  }, [])

  function isBusyCause(cause: any, code?: number, reason?: string): boolean {
    const c = String(cause || '').toLowerCase()
    const r = String(reason || '').toLowerCase()
    return c.includes('busy') || c.includes('486') || code === 486 || code === 603 || r.includes('busy') || r.includes('decline')
  }

  useEffect(() => {
    if (lastDialedNumber && !number) setNumber(lastDialedNumber)
  }, [lastDialedNumber, number])

  // Auto-fetch agent SIP credentials from backend and auto-login
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
        if (!res.ok) {
          throw new Error('Failed to get SIP credentials. Ensure an extension is assigned to your account.')
        }
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
      if (sessionRef.current) {
        try { sessionRef.current.terminate(); } catch {}
      }
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch {}
      }
    } finally {
      sessionRef.current = null
      uaRef.current = null
    }
  }, [])

  useEffect(() => () => teardownUA(), [teardownUA])

  const attachRemoteAudio = useCallback((pc: RTCPeerConnection) => {
    const safePlay = async () => {
      try {
        await remoteAudioRef.current?.play()
      } catch (e: any) {
        setError((prev) => prev || `Audio play blocked: ${e?.message || 'permission or autoplay'}`)
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        lastRemoteStreamRef.current = stream
        safePlay()
      }
    }

    // Fallback: build stream from receivers
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
        try {
          const pc: RTCPeerConnection = (session as any).connection
          if (pc) attachRemoteAudio(pc)
        } catch {}
      })

      session.on("progress", () => { setStatus("Ringing"); startRingback() })
      session.on("accepted", async () => {
        stopRingback()
        setStatus("In Call")
        callStartRef.current = Date.now()
        hasAnsweredRef.current = true
        if (timerRef.current) window.clearInterval(timerRef.current)
        timerRef.current = window.setInterval(() => {
          setStatus((s) => (s.startsWith("In Call") ? `In Call ${elapsed()}` : s))
        }, 1000)
        // Start recording once call is accepted
        try { await startRecording() } catch {}
        // Ensure popup is visible and centered on screen when call is active
        setShowPopup(true)
        try {
          const w = window.innerWidth
          const h = window.innerHeight
          const px = Math.max(8, Math.floor(w / 2 - 180))
          const py = Math.max(60, Math.floor(h / 2 - 120))
          setPopupPos({ x: px, y: py })
        } catch {}
      })
      session.on("failed", async (e: any) => {
        stopRingback()
        setStatus("Call Failed")
        setError(e?.cause || "Call failed")
        clearTimer()
        setShowPopup(false)
        if (!uploadedOnceRef.current) {
          uploadedOnceRef.current = true
          const code = Number(e?.response?.status_code || 0)
          const reason = e?.response?.reason_phrase || String(e?.cause || '')
          const isBusy = isBusyCause(e?.cause, code, reason)
          if (isBusy) {
            try { await startBusyTone(); setTimeout(() => stopBusyTone(), 3000) } catch {}
          }
          // Do NOT send disposition; let backend infer BUSY/NO ANSWER from hints
          await stopRecordingAndUpload({ sip_status: code || undefined, sip_reason: reason || undefined, hangup_cause: isBusy ? 'busy' : undefined })
        }
      })
      session.on("ended", async () => {
        stopRingback()
        setStatus("Call Ended")
        clearTimer()
        setShowPopup(false)
        if (!uploadedOnceRef.current) {
          uploadedOnceRef.current = true
          // Do NOT send disposition; backend will infer ANSWERED vs NO ANSWER from timings
          await stopRecordingAndUpload({})
        }
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

  const onLogin = async (_e?: React.FormEvent) => {}

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
      // US ringback approx: 440Hz + 480Hz with 2s on, 4s off
      osc1.frequency.value = 440
      osc2.frequency.value = 480
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0
      osc1.start()
      osc2.start()
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

  // Play a local busy tone to the agent on reject/busy
  const startBusyTone = async () => {
    try {
      await ensureAudioCtx()
      const ctx = audioCtxRef.current
      if (!ctx) return
      stopBusyTone()
      const gain = ctx.createGain()
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      // NA busy tone approx: 480Hz + 620Hz, 0.5s on / 0.5s off
      osc1.frequency.value = 480
      osc2.frequency.value = 620
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0
      osc1.start()
      osc2.start()
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

  const placeCall = async () => {
    setError(null)
    if (!uaRef.current) return setError("UA not ready")
    if (!number) return setError("Enter a number")

    const eventHandlers = {}

    const options = {
      eventHandlers,
      mediaConstraints: { audio: true, video: false },
      pcConfig: { rtcpMuxPolicy: "require" },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    }

    try {
      // reset per-call state
      hasAnsweredRef.current = false
      uploadedOnceRef.current = false
      dialStartRef.current = Date.now()
      await ensureAudioCtx()
      lastDialDestinationRef.current = number || null
      // Show popup immediately when dialing and center it
      setShowPopup(true)
      try {
        const w = window.innerWidth
        const h = window.innerHeight
        const px = Math.max(8, Math.floor(w / 2 - 180))
        const py = Math.max(60, Math.floor(h / 2 - 120))
        setPopupPos({ x: px, y: py })
      } catch {}
      uaRef.current.call(numberToSipUri(number, ext), options)
      localStorage.setItem("lastDialedNumber", number)
    } catch (e: any) {
      setError(e?.message || "Call start error")
    }
  }

  const hangup = async () => {
    try { sessionRef.current?.terminate() } catch {}
    stopRingback()
    setShowPopup(false)
    if (!uploadedOnceRef.current) {
      uploadedOnceRef.current = true
      await stopRecordingAndUpload({})
    }
  }

  const logout = () => {
    setError(null)
    setStatus("Idle")
    setNumber("")
    setIsMuted(false)
    hasAnsweredRef.current = false
    uploadedOnceRef.current = false
    teardownUA()
  }

  const toggleMute = () => {
    const sess = sessionRef.current
    if (!sess) return
    try {
      if (isMuted) { sess.unmute({ audio: true }); setIsMuted(false) }
      else { sess.mute({ audio: true }); setIsMuted(true) }
    } catch {}
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
      // Build a mixed stream of local mic + remote audio if available
      const dest = ctx.createMediaStreamDestination()
      mixDestRef.current = dest

      const addStream = (ms: MediaStream | null) => {
        if (!ms) return
        try {
          const src = ctx.createMediaStreamSource(ms)
          src.connect(dest)
        } catch {}
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
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_PREFIX}/auth/me`, { method: 'GET', headers, credentials })
      if (!res.ok) return null
      const data = await res.json().catch(() => null) as any
      const name: string | null = data?.user?.username || null
      return name
    } catch {
      return null
    }
  }

  async function stopRecordingAndUpload(extra: { sip_status?: number; sip_reason?: string; hangup_cause?: string } = {}) {
    try {
      const rec = mediaRecorderRef.current
      if (rec && rec.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve()
          try { rec.stop() } catch { resolve() }
        })
      }
    } catch {}

    const blob = recordedChunksRef.current.length ? new Blob(recordedChunksRef.current, { type: 'audio/webm' }) : null
    mediaRecorderRef.current = null
    recordedChunksRef.current = []

    // Prepare metadata
    const now = new Date()
    const start_time = new Date((dialStartRef.current || sessionRef.current?._created || Date.now()))
    const answer_time = hasAnsweredRef.current && callStartRef.current ? new Date(callStartRef.current) : null
    const end_time = now
    const call_duration = answer_time ? Math.max(0, Math.floor((end_time.getTime() - answer_time.getTime()) / 1000)) : null

    const form = new FormData()
    // Only append non-empty optional fields to satisfy backend validation
    const loggedName = await fetchLoggedUsername()
    if (loggedName) form.append('username', loggedName)
    else if (ext) form.append('username', ext) // fallback to extension
    form.append('unique_id', String(sessionRef.current?.id || cryptoRandom()))
    form.append('start_time', start_time.toISOString())
    if (answer_time) form.append('answer_time', answer_time.toISOString())
    form.append('end_time', end_time.toISOString())
    if (call_duration !== null) form.append('call_duration', String(call_duration))
    // billed_duration same as call_duration for now
    if (call_duration !== null) form.append('billed_duration', String(call_duration))
    form.append('source', 'web')
    if (ext) form.append('extension', ext)
    // Determine destination from current state, last dialed, or JsSIP session
    const sess = sessionRef.current
    const sipUser = (() => {
      try {
        return (
          sess?.remote_identity?.uri?.user ||
          sess?.request?.to?.uri?.user ||
          sess?.remote_identity?._uri?._user ||
          null
        )
      } catch { return null }
    })()
    const destination = (number || lastDialDestinationRef.current || sipUser || '').toString()
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
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies()
        if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_PREFIX}/calls`, { method: 'POST', body: form, headers, credentials })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn('Upload call record failed', res.status, text)
      }
    } catch (e) {
      console.warn('Failed to upload call record', e)
    }
  }

  function cryptoRandom() {
    try { return (crypto as any).randomUUID?.() || String(Math.random()).slice(2) } catch { return String(Math.random()).slice(2) }
  }

  const sendDTMF = (digit: string) => {
    try { sessionRef.current?.sendDTMF(digit) } catch {}
  }

  const onDigit = (digit: string) => {
    if (status.startsWith("In Call")) {
      sendDTMF(digit)
    } else {
      setNumber((prev) => (prev + digit).slice(0, 32))
    }
  }

  const backspace = () => setNumber((prev) => prev.slice(0, -1))

  // Drag handlers
  const onPopupMouseDown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    window.addEventListener("mousemove", onPopupMouseMove)
    window.addEventListener("mouseup", onPopupMouseUp)
  }

  const onPopupMouseMove = (e: MouseEvent) => {
    if (!dragOffsetRef.current) return
    const nx = e.clientX - dragOffsetRef.current.x
    const ny = e.clientY - dragOffsetRef.current.y
    setPopupPos({ x: Math.max(8, nx), y: Math.max(60, ny) })
  }

  const onPopupMouseUp = () => {
    dragOffsetRef.current = null
    window.removeEventListener("mousemove", onPopupMouseMove)
    window.removeEventListener("mouseup", onPopupMouseUp)
  }

  const addNote = () => {
    if (!newNote.trim()) return
    setNotes((n) => [{ id: cryptoRandom(), text: newNote.trim(), phone: number || lastDialedNumber || undefined, at: new Date().toISOString().slice(0,16).replace('T',' ') }, ...n])
    setNewNote("")
  }

  const removeNote = (id: string) => setNotes((n) => n.filter((x) => x.id !== id))

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
                  <BreadcrumbLink href="/dashboard/agent">Dialer</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Manual</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${status.includes("Registered") ? "bg-emerald-100 text-emerald-800" : status.includes("Connected") ? "bg-blue-100 text-blue-800" : status.includes("Call") ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}>{status}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Script src="/js/jssip.min.js" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />

          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Dialer */}
            <Card className="p-5 lg:col-span-1">
              <div className="mb-2 text-base font-semibold">Dialer</div>
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <Input className="mt-1 text-lg tracking-widest" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Enter phone number" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) => (
                  <Button key={d} variant="outline" className="h-14 text-lg font-medium" onClick={() => onDigit(d)}>
                    {d}
                  </Button>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-3">
                {status.startsWith("In Call") ? (
                  <Button onClick={hangup} variant="destructive" className="gap-2 flex-1">
                    <PhoneOff className="h-4 w-4" /> End Call
                  </Button>
                ) : (
                  <Button onClick={placeCall} className="gap-2 flex-1" disabled={!number || !uaRef.current || !status.includes("Registered") }>
                    <PhoneCall className="h-4 w-4" /> Call
                  </Button>
                )}
                <Button variant="outline" onClick={() => setNumber("")}>Clear</Button>
              </div>

              <div className="mt-4 text-xs text-center text-emerald-600 font-medium min-h-5">
                {status.startsWith("In Call") ? `${elapsed() || "00:00"}` : null}
              </div>

              <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">History</div>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-pink-600" /> John Smith</div><span className="text-blue-600">82%</span></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-pink-600" /> Jane Doe</div><span className="text-blue-600">65%</span></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-pink-600" /> Bob Johnson</div><span className="text-blue-600">45%</span></div>
              </div>
            </Card>

            {/* Right column: Notes + Documents */}
            <div className="lg:col-span-2 space-y-4">
              {/* Notes */}
              <Card className="p-0">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="font-semibold">Notes</div>
                  <div className="text-xs text-muted-foreground">{notes.length} notes</div>
                </div>
                <Separator />
                <Tabs defaultValue="all" className="px-5 py-4">
                  <TabsList>
                    <TabsTrigger value="all">All Notes</TabsTrigger>
                    <TabsTrigger value="new">+ New Note</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <ScrollArea className="h-[220px] pr-3">
                      <div className="space-y-3">
                        {notes.map((n) => (
                          <Card key={n.id} className="p-3 flex items-start justify-between">
                            <div>
                              <div className="text-sm">{n.text}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{n.phone ? `${n.phone} · ` : ""}{n.at}</div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => removeNote(n.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="new" className="mt-4">
                    <div className="space-y-3">
                      <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write a quick note..." className="min-h-[120px]" />
                      <div className="text-right">
                        <Button onClick={addNote}>Save Note</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Documents */}
              <Card className="p-0">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="font-semibold">Shared Documents from Playbook</div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input placeholder="Search documents..." className="pl-8 w-64" />
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="p-5 space-y-3">
                  {[
                    { title: "Sales Pitch Deck Template", preview: "Introduction Welcome to our solution that helps businesses scale efficiently...", shared: "1 person(s)", date: "2024-01-15" },
                    { title: "Onboarding Process Guide", preview: "Step 1: Initial Consultation Schedule a call with the client to understand...", shared: "1 person(s)", date: "2024-02-01" },
                  ].map((d, i) => (
                    <Card key={i} className="p-4">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{d.preview}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Shared with: {d.shared} · {d.date}</div>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Draggable In-Call Popup */}
          {showPopup && (
            <div
              className="fixed z-50 w-[360px] rounded-lg border bg-white shadow-xl"
              style={{ left: popupPos.x, top: popupPos.y }}
            >
              <div className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-emerald-50 border-b cursor-move" onMouseDown={onPopupMouseDown}>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Call Active
                </div>
                <div className="text-xs text-muted-foreground">Drag to move</div>
              </div>
              <div className="px-4 pt-3 pb-4">
                <div className="text-center font-semibold tracking-wide">{number || lastDialedNumber || "Unknown"}</div>
                <div className="mt-1 text-center text-xs text-muted-foreground">{elapsed() || "00:00"}</div>
                <div className="mt-4 grid grid-cols-5 gap-3 place-items-center">
                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10" onClick={toggleMute}>
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10" onClick={() => sendDTMF("5")}>{/* keypad demo */}
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" className="rounded-full h-12 w-12" onClick={hangup}>
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function numberToSipUri(num: string, _ext: string) {
  if (num.startsWith("sip:")) return num
  return num
}
