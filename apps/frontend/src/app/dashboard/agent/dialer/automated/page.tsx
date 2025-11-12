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
import { UploadCloud, Play, Pause, SkipForward, PhoneOff, Trash2, Search, Mic, MicOff, Grid2X2, UserPlus } from "lucide-react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

declare global {
  interface Window {
    JsSIP?: any
    XLSX?: any
  }
}

const API_PREFIX = `${API_BASE}/api`

export default function AutomatedDialerPage() {
  const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
    <div className="flex items-end justify-between gap-[2px] h-8 w-full">
      {Array.from({ length: 80 }).map((_, i) => {
        const base = [0.3, 0.5, 0.7, 1, 0.8, 0.6, 0.7, 0.5, 0.8, 0.7, 0.5, 0.3]
        const height = base[i % base.length]
        return (
          <span
            key={i}
            style={{
              height: `${height * 100}%`,
              animation: active ? `wave 0.8s ${0.02 * (i % base.length)}s infinite ease-in-out` : 'none',
              animationFillMode: active ? 'both' : 'forwards',
            }}
            className="w-[2px] bg-foreground/60 rounded-sm origin-bottom"
          />
        )
      })}
      <style jsx>{`
        @keyframes wave { 0% { transform: scaleY(0.4); } 50% { transform: scaleY(1.2); } 100% { transform: scaleY(0.4); } }
      `}</style>
    </div>
  )
  // SIP/Auth State
  const [ext, setExt] = useState("")
  const [pwd, setPwd] = useState("")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Notes & Documents state
  const [notes, setNotes] = useState<Array<{ id: string; text: string; phone?: string; at: string }>>([])
  const [newNote, setNewNote] = useState("")
  const [docs, setDocs] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docQuery, setDocQuery] = useState("")
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 420, y: 160 })
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  // Disposition modal state
  const [showDisposition, setShowDisposition] = useState(false)
  const [disposition, setDisposition] = useState("")
  const [pendingUploadExtra, setPendingUploadExtra] = useState<any>(null)

  // Auto dial state
  type Prospect = { name?: string; designation?: string; company?: string; phone: string; raw?: any }
  const [queue, setQueue] = useState<Prospect[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [autoRun, setAutoRun] = useState(false)
  // Fixed delay (30s)
  const FIXED_DELAY_MS = 30000

  const currentPhone = useMemo(() => queue[currentIndex]?.phone || '', [queue, currentIndex])

  // Refs to avoid stale closures in session event handlers
  const autoRunRef = useRef<boolean>(false)
  const currentIndexRef = useRef<number>(0)
  const queueRef = useRef<Prospect[]>([])
  const queueHydratedRef = useRef<boolean>(false)
  // countdown & timers
  const delayMsRef = useRef<number>(30000)
  const nextTimeoutRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)
  const [nextIn, setNextIn] = useState<number>(0)
  const totalNextSecs = useMemo(() => Math.max(1, Math.ceil(FIXED_DELAY_MS / 1000)), [FIXED_DELAY_MS])

  useEffect(() => { autoRunRef.current = autoRun }, [autoRun])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { delayMsRef.current = FIXED_DELAY_MS }, [FIXED_DELAY_MS])

  // Persist queue across refreshes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auto_queue_v1') || localStorage.getItem('auto_queue')
      if (saved) {
        const parsed = JSON.parse(saved) as Prospect[]
        if (Array.isArray(parsed)) {
          setQueue(parsed)
          queueRef.current = parsed
          const savedIdx = Number(localStorage.getItem('auto_current_index') || '0')
          const idx = Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < parsed.length ? savedIdx : 0
          setCurrentIndex(idx)
          currentIndexRef.current = idx
        }
      }
      queueHydratedRef.current = true
    } catch {}
  }, [])

  useEffect(() => {
    if (!queueHydratedRef.current) return
    try {
      if (queue.length) {
        localStorage.setItem('auto_queue_v1', JSON.stringify(queue))
        localStorage.setItem('auto_current_index', String(currentIndexRef.current || 0))
      } else {
        localStorage.removeItem('auto_queue_v1')
        localStorage.removeItem('auto_current_index')
      }
    } catch {}
  }, [queue])

  // Dialog state for file upload
  const [uploadOpen, setUploadOpen] = useState(false)
  const [sheetName, setSheetName] = useState("")
  const [pendingFile, setPendingFile] = useState<File | null>(null)

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

  const fetchNotes = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) { credentials = 'include'; const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf }
      else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
      const qs = new URLSearchParams(); qs.set('limit','20'); if (currentPhone) qs.set('phone', currentPhone)
      const res = await fetch(`${API_PREFIX}/notes?${qs.toString()}`, { headers, credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => null) as any
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
      const mapped = items.map((n: any) => ({ id: String(n.id), text: String(n.body || ''), phone: n.phone_e164 || undefined, at: (n.created_at || new Date().toISOString()).slice(0,16).replace('T',' ') }))
      setNotes(mapped)
    } catch {}
  }, [currentPhone])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const addNote = async () => {
    if (!newNote.trim()) return
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) { credentials = 'include'; const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf }
      else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
      const payload = { title: newNote.trim().slice(0,80), body: newNote.trim(), phone_e164: currentPhone, tags_csv: '' }
      const res = await fetch(`${API_PREFIX}/notes`, { method: 'POST', headers, credentials, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to save note')
      const saved = await res.json()
      const mapped = { id: String(saved.id), text: String(saved.body || newNote.trim()), phone: saved.phone_e164 || currentPhone || undefined, at: (saved.created_at || new Date().toISOString()).slice(0,16).replace('T',' ') }
      setNotes((n) => [mapped, ...n]); setNewNote("")
    } catch {}
  }

  const removeNote = async (id: string) => {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) { credentials = 'include'; const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf }
      else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
      const res = await fetch(`${API_PREFIX}/notes/${encodeURIComponent(id)}`, { method: 'DELETE', headers, credentials })
      if (!res.ok) throw new Error('Failed to delete note')
      setNotes((n) => n.filter((x) => x.id !== id))
    } catch {}
  }

  const fetchDocs = useCallback(async () => {
    try {
      setDocsLoading(true)
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) { credentials = 'include' } else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
      const qs = new URLSearchParams({ page: '1', pageSize: '12' }); if (docQuery) qs.set('q', docQuery)
      const res = await fetch(`${API_PREFIX}/documents?${qs.toString()}`, { headers, credentials })
      if (!res.ok) { setDocs([]); return }
      const data = await res.json().catch(() => null) as any
      setDocs(Array.isArray(data?.items) ? data.items : [])
    } catch { setDocs([]) } finally { setDocsLoading(false) }
  }, [docQuery])

  useEffect(() => { fetchDocs() }, [fetchDocs])
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
        setShowPopup(true)
        try { const w = window.innerWidth; const h = window.innerHeight; const px = Math.max(8, Math.floor(w / 2 - 180)); const py = Math.max(60, Math.floor(h / 2 - 120)); setPopupPos({ x: px, y: py }) } catch {}
      })
      session.on("failed", async (e: any) => {
        stopRingback()
        setStatus("Call Failed")
        const causeStr = String(e?.cause || "")
        if (causeStr.toLowerCase() !== 'canceled') {
          setError(causeStr || "Call failed")
        } else {
          setError(null)
        }
        clearTimer()
        setShowPopup(false)
        if (!uploadedOnceRef.current) {
          const code = Number(e?.response?.status_code || 0)
          const reason = e?.response?.reason_phrase || String(e?.cause || '')
          const isBusy = isBusyCause(e?.cause, code, reason)
          if (isBusy) { try { await startBusyTone(); setTimeout(() => stopBusyTone(), 3000) } catch {} }
          setPendingUploadExtra({ sip_status: code || undefined, sip_reason: reason || undefined, hangup_cause: isBusy ? 'busy' : undefined })
          setShowDisposition(true)
        }
        scheduleNext()
      })
      session.on("ended", async () => {
        stopRingback()
        setStatus("Call Ended")
        clearTimer()
        setShowPopup(false)
        if (!uploadedOnceRef.current) {
          setPendingUploadExtra({})
          setShowDisposition(true)
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
    if (disposition) form.append('disposition', disposition)
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
      setShowPopup(true)
      try { const w = window.innerWidth; const h = window.innerHeight; const px = Math.max(8, Math.floor(w / 2 - 180)); const py = Math.max(60, Math.floor(h / 2 - 120)); setPopupPos({ x: px, y: py }) } catch {}
      uaRef.current.call(numberToSipUri(num, ext), options)
    } catch (e: any) {
      setError(e?.message || "Call start error")
    }
  }

  const hangup = async () => {
    try { sessionRef.current?.terminate() } catch {}
    stopRingback()
    setShowPopup(false)
    if (!uploadedOnceRef.current) { setPendingUploadExtra({}); setShowDisposition(true) }
  }

  const clearCountdown = () => {
    if (countdownRef.current) { window.clearInterval(countdownRef.current); countdownRef.current = null }
    setNextIn(0)
  }

  const clearNextTimeout = () => {
    if (nextTimeoutRef.current) { window.clearTimeout(nextTimeoutRef.current); nextTimeoutRef.current = null }
  }

  const scheduleNext = () => {
    if (!autoRunRef.current) return
    const nextIdx = currentIndexRef.current + 1
    const list = queueRef.current
    if (nextIdx >= list.length) {
      setAutoRun(false)
      autoRunRef.current = false
      setStatus("Completed")
      clearCountdown()
      clearNextTimeout()
      return
    }
    const delay = Math.max(0, delayMsRef.current)
    setNextIn(Math.ceil(delay / 1000))
    if (countdownRef.current) { window.clearInterval(countdownRef.current); countdownRef.current = null }
    countdownRef.current = window.setInterval(() => {
      setNextIn((s) => {
        const n = Math.max(0, s - 1)
        return n
      })
    }, 1000)
    clearNextTimeout()
    nextTimeoutRef.current = window.setTimeout(() => {
      if (countdownRef.current) { window.clearInterval(countdownRef.current); countdownRef.current = null }
      setNextIn(0)
      setCurrentIndex(nextIdx)
      currentIndexRef.current = nextIdx
      placeCallTo(list[nextIdx].phone)
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
    await placeCallTo(list[idx].phone)
  }

  const pauseAuto = () => { setAutoRun(false); autoRunRef.current = false; clearCountdown(); clearNextTimeout() }
  const resumeAuto = async () => {
    if (!queueRef.current.length) { setError("Upload a list first"); return }
    if (!status.includes("Registered")) { setError("SIP not registered yet"); return }
    setAutoRun(true)
    autoRunRef.current = true
    // Ensure any pending timers are reset
    clearCountdown();
    clearNextTimeout();
    const list = queueRef.current
    // Resume from the NEXT number after the current index to avoid re-dialing the same one
    const nextIdx = currentIndexRef.current + 1
    if (nextIdx >= list.length) {
      setStatus("Completed")
      return
    }
    setCurrentIndex(nextIdx)
    currentIndexRef.current = nextIdx
    // If a call is already active, let the scheduler continue after it ends
    if (sessionRef.current) return
    await placeCallTo(list[nextIdx].phone)
  }
  const skipNext = () => {
    const list = queueRef.current
    const nextIdx = Math.min(list.length, currentIndexRef.current + 1)
    setCurrentIndex(nextIdx)
    currentIndexRef.current = nextIdx
    if (nextIdx < list.length) placeCallTo(list[nextIdx].phone)
  }

  // File parsing (CSV/XLSX)
  const parseCsvRows = (text: string): string[][] => {
    return text
      .split(/\r?\n/)
      .map(l => l.split(/[;,\t]/).map(c => c.trim()))
      .filter(row => row.some(c => c && c.length))
  }

  const toDigits = (s: string) => s.replace(/[^0-9+]/g, '').replace(/^00/, '+').trim()

  const looksLikePhone = (s: string) => {
    const t = toDigits(s)
    if (!t) return false
    const digits = t.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  }

  const looksLikeName = (s: string) => /^[a-zA-Z ,.'-]{2,}$/.test(s || '')

  const mapHeaders = (headers: string[]) => {
    const idx = { name: -1, designation: -1, company: -1, phone: -1 }
    headers.forEach((h, i) => {
      const k = (h || '').toLowerCase().trim()
      if (idx.phone === -1 && /(phone|mobile|contact|number|msisdn|cell)/.test(k)) idx.phone = i
      else if (idx.name === -1 && /(name|full\s*name|prospect|customer)/.test(k)) idx.name = i
      else if (idx.designation === -1 && /(designation|title|role|position)/.test(k)) idx.designation = i
      else if (idx.company === -1 && /(company|organization|organisation|org|firm)/.test(k)) idx.company = i
    })
    return idx
  }

  const parseProspectsFromRows = (rows: any[][]): Prospect[] => {
    if (!rows.length) return []
    let start = 0
    let headerMap = { name: -1, designation: -1, company: -1, phone: -1 }
    const first = rows[0] || []
    const headerCandidate = first.every(c => isNaN(Number(c)) || /[a-zA-Z]/.test(String(c)))
    if (headerCandidate) {
      headerMap = mapHeaders(first.map(String))
      start = 1
    }
    if (headerMap.phone === -1) {
      const colScores: number[] = new Array(Math.max(...rows.map(r => r.length), 1)).fill(0)
      for (let r = start; r < Math.min(rows.length, start + 30); r++) {
        const row = rows[r] || []
        row.forEach((v: any, ci: number) => { if (looksLikePhone(String(v || ''))) colScores[ci]++ })
      }
      let best = 0, bestIdx = -1
      colScores.forEach((s, i) => { if (s > best) { best = s; bestIdx = i } })
      headerMap.phone = bestIdx
    }
    if (headerMap.name === -1) {
      const colScores: number[] = new Array(Math.max(...rows.map(r => r.length), 1)).fill(0)
      for (let r = start; r < Math.min(rows.length, start + 30); r++) {
        const row = rows[r] || []
        row.forEach((v: any, ci: number) => { if (looksLikeName(String(v || ''))) colScores[ci]++ })
      }
      let best = 0, bestIdx = -1
      colScores.forEach((s, i) => { if (s > best && i !== headerMap.phone) { best = s; bestIdx = i } })
      headerMap.name = bestIdx
    }
    const out: Prospect[] = []
    for (let r = start; r < rows.length; r++) {
      const row = rows[r] || []
      const rawPhone = headerMap.phone >= 0 ? String(row[headerMap.phone] ?? '') : String(row[0] ?? '')
      const phone = toDigits(rawPhone)
      if (!looksLikePhone(phone)) continue
      const p: Prospect = { phone }
      if (headerMap.name >= 0) p.name = String(row[headerMap.name] ?? '').trim() || undefined
      if (headerMap.designation >= 0) p.designation = String(row[headerMap.designation] ?? '').trim() || undefined
      if (headerMap.company >= 0) p.company = String(row[headerMap.company] ?? '').trim() || undefined
      p.raw = row
      out.push(p)
    }
    const seen = new Set<string>()
    const dedup: Prospect[] = []
    for (const p of out) { if (!seen.has(p.phone)) { seen.add(p.phone); dedup.push(p) } }
    return dedup
  }

  const onFile = async (file: File) => {
    try {
      setError(null)
      const name = file.name.toLowerCase()
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text()
        const rows = parseCsvRows(text)
        const prospects = parseProspectsFromRows(rows)
        setQueue(prospects); queueRef.current = prospects; setCurrentIndex(0); currentIndexRef.current = 0
        try { localStorage.setItem('auto_queue', JSON.stringify(prospects)); queueHydratedRef.current = true } catch {}
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        if (!window.XLSX) throw new Error('XLSX parser not loaded')
        const data = new Uint8Array(await file.arrayBuffer())
        const wb = window.XLSX.read(data, { type: 'array' })
        const targetSheet = sheetName && wb.Sheets[sheetName] ? sheetName : wb.SheetNames[0]
        const ws = wb.Sheets[targetSheet]
        const rows: any[][] = window.XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        const prospects = parseProspectsFromRows(rows)
        setQueue(prospects); queueRef.current = prospects; setCurrentIndex(0); currentIndexRef.current = 0
        try { localStorage.setItem('auto_queue', JSON.stringify(prospects)); queueHydratedRef.current = true } catch {}
      } else {
        setError('Unsupported file. Use CSV or Excel')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to parse file')
    }
  }

  const onPopupMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    dragOffsetRef.current = { x, y }
    const move = (e: MouseEvent) => {
      if (!dragOffsetRef.current) return
      const { x, y } = dragOffsetRef.current
      const px = Math.max(0, Math.min(e.clientX - x, window.innerWidth - rect.width))
      const py = Math.max(0, Math.min(e.clientY - y, window.innerHeight - rect.height))
      setPopupPos({ x: px, y: py })
    }
    const up = () => {
      dragOffsetRef.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const toggleMute = async () => {
    try {
      const stream = await getLocalMicStream()
      if (!stream) return
      const tracks = stream.getAudioTracks()
      if (!tracks.length) return
      tracks[0].enabled = !tracks[0].enabled
      setIsMuted(!tracks[0].enabled)
    } catch {}
  }

  const sendDTMF = async (digit: string) => {
    try {
      const session = sessionRef.current
      if (!session) return
      await session.dtmf(digit)
    } catch {}
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
            <div className="ml-auto" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-x-hidden">
          <Script src="/js/jssip.min.js" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />
          <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />

          {error && error.toLowerCase() !== 'canceled' && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-3">
              <Card className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2" variant="outline"><UploadCloud className="h-4 w-4" /> Add from Excel/CSV</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload list</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Label className="min-w-28" htmlFor="sheet">Sheet name</Label>
                            <Input id="sheet" placeholder="Optional (defaults to first)" value={sheetName} onChange={(e) => setSheetName(e.target.value)} />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="min-w-28" htmlFor="file">File</Label>
                            <Input id="file" type="file" accept=".csv,.xlsx,.xls,.txt" onChange={(e) => setPendingFile(e.target.files?.[0] || null)} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setPendingFile(null); setSheetName(""); setUploadOpen(false) }}>Cancel</Button>
                          <Button onClick={async () => { if (pendingFile) { await onFile(pendingFile); setUploadOpen(false); setPendingFile(null) } }}>Load</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="gap-2" onClick={() => { setQueue([]); queueRef.current = []; setCurrentIndex(0); currentIndexRef.current = 0; setAutoRun(false); autoRunRef.current = false; try { localStorage.removeItem('auto_queue_v1'); localStorage.removeItem('auto_queue'); localStorage.removeItem('auto_current_index') } catch {} }}>
                      Clear Queue
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={startAuto} disabled={!queue.length || autoRun || !status.includes("Registered") } className="gap-2">
                      <Play className="h-4 w-4" /> Start
                    </Button>
                    {autoRun ? (
                    <Button onClick={pauseAuto} variant="outline" className="gap-2">
                      <Pause className="h-4 w-4" /> Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeAuto} variant="outline" disabled={!queue.length || !status.includes("Registered")} className="gap-2">
                      <Play className="h-4 w-4" /> Resume
                    </Button>
                  )}
                    <Button onClick={skipNext} variant="outline" disabled={!queue.length || currentIndex >= queue.length - 1} className="gap-2">
                      <SkipForward className="h-4 w-4" /> Skip
                    </Button>
                    <Button onClick={hangup} variant="destructive" disabled={!sessionRef.current} className="gap-2">
                      <PhoneOff className="h-4 w-4" /> Hang Up
                    </Button>
                    <div className="ml-auto" />
                  </div>

                  {autoRun && nextIn > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-2 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Next call in {String(Math.floor(nextIn / 60)).padStart(2,'0')}:{String(nextIn % 60).padStart(2,'0')}
                        </span>
                        <span className="text-muted-foreground">({totalNextSecs - nextIn}s elapsed)</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded bg-muted/40 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-[width] duration-1000 ease-linear"
                          style={{ width: `${Math.min(100, Math.max(0, ((totalNextSecs - nextIn) / totalNextSecs) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 rounded-md border bg-muted/5 p-3">
                    <WaveBars active={status.includes("Ringing") || status.startsWith("In Call")} />
                    <Separator className="mt-3" />
                  </div>
                  <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
                </div>
              </Card>

              {(status === "Completed" || (queue.length > 0 && currentIndex >= queue.length)) && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">All calls completed</div>
                      <div className="text-xs text-muted-foreground">{Math.min(currentIndex, queue.length)} / {queue.length} numbers processed</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => { setCurrentIndex(0); currentIndexRef.current = 0; setStatus('Idle') }}>Restart</Button>
                      <Button onClick={() => startAuto()} disabled={!status.includes('Registered')}>Start Again</Button>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-2">Queue</div>
                <div className="text-xs text-muted-foreground mb-2">{queue.length} numbers • Index {Math.min(currentIndex + 1, queue.length)} / {queue.length}</div>
                <div className="max-h-80 overflow-auto border rounded">
                  {queue.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No numbers loaded</div>
                  ) : (
                    <ul className="text-sm">
                      {queue.map((p, i) => (
                        <li key={`${p.phone}-${i}`} className={`${i === currentIndex ? 'bg-accent/50 font-medium' : ''} px-3 py-2 border-b last:border-b-0`}>
                          {i + 1}. {p.name ? `${p.name} — ` : ''}{p.company ? `${p.company} — ` : ''}{p.phone}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <Card className="p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="font-semibold">Notes</div>
                  <div className="text-xs text-muted-foreground">{notes.length} notes</div>
                </div>
                <Separator />
                <Tabs defaultValue="all" className="px-4 py-3">
                  <TabsList>
                    <TabsTrigger value="all">All Notes</TabsTrigger>
                    <TabsTrigger value="new">+ New Note</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-3">
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
                  <TabsContent value="new" className="mt-3">
                    <div className="space-y-3">
                      <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write a quick note..." className="min-h-[120px]" />
                      <div className="text-right">
                        <Button onClick={addNote}>Save Note</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>

              <Card className="p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="font-semibold">Shared Documents from Playbook</div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input placeholder="Search documents..." value={docQuery} onChange={(e) => setDocQuery(e.target.value)} className="pl-8 w-64" />
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button variant="outline" onClick={() => fetchDocs()} disabled={docsLoading}>Search</Button>
                  </div>
                </div>
                <Separator />
                <div className="p-4 space-y-2">
                  {docsLoading ? (
                    <Card className="p-3 text-sm text-muted-foreground">Loading…</Card>
                  ) : docs.length === 0 ? (
                    <Card className="p-3 text-sm text-muted-foreground">No documents</Card>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {docs.map((d: any) => (
                        <Card key={d.id} className="p-3">
                          <div className="font-medium truncate">{d.title}</div>
                          <div className="text-xs text-muted-foreground">{String(d.type || '').toUpperCase()} • {String(d.visibility || '').toUpperCase()}</div>
                          <Separator className="my-1" />
                          <div className="text-sm text-muted-foreground line-clamp-2">{d.description || d.content_richtext || '-'}</div>
                          <div className="mt-2 text-right">
                            <Button size="sm" variant="outline" onClick={() => setPreviewDoc(d)}>View</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {sessionRef.current && status.startsWith("In Call") && (
            <Card className="p-5">
              <div className="text-sm text-muted-foreground mb-2">Now Calling</div>
              <div className="flex items-center gap-3">
                <Button onClick={hangup} variant="destructive" className="gap-2"><PhoneOff className="h-4 w-4" /> End Call</Button>
              </div>
            </Card>
          )}

          {showPopup && (
            <div className="fixed z-50 w-[360px] rounded-lg border bg-card text-card-foreground shadow-xl" style={{ left: popupPos.x, top: popupPos.y }}>
              <div className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-emerald-50 dark:bg-emerald-900/30 border-b border-border cursor-move" onMouseDown={onPopupMouseDown}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`inline-block h-2 w-2 rounded-full ${status.includes('Ringing') ? 'bg-amber-500' : status.startsWith('In Call') ? 'bg-emerald-500' : status.includes('Failed') ? 'bg-red-500' : status.includes('Disconnected') ? 'bg-gray-400' : (status.includes('Connected') || status.includes('Registered')) ? 'bg-sky-500' : 'bg-muted'}`} />
                  <span className="text-foreground/90">{status}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${status.includes("Registered") || status.includes("Connected") ? "bg-sky-100 text-sky-800" : status.includes("Ringing") ? "bg-amber-100 text-amber-800" : status.startsWith("In Call") ? "bg-emerald-100 text-emerald-800" : status.includes("Failed") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>{status}</span>
              </div>
              <div className="px-4 pt-3 pb-4">
                <div className="text-center font-semibold tracking-wide text-foreground">{queue[currentIndex]?.phone || 'Unknown'}</div>
                <div className="mt-1 text-center text-xs text-muted-foreground">{elapsed() || '00:00'}</div>
                <div className="mt-4 grid grid-cols-5 gap-3 place-items-center">
                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10" onClick={toggleMute}>
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10" onClick={() => sendDTMF('5')}>
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

          {previewDoc && (
            <div className="fixed inset-0 z-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-background/60" onClick={() => setPreviewDoc(null)} />
              <Card className="relative z-50 w-[720px] max-w-[95vw] max-h-[85vh] overflow-hidden border shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <div className="font-medium truncate mr-4">{previewDoc.title || 'Document'}</div>
                  <div className="flex items-center gap-2">
                    {previewDoc.file_url ? (
                      <a className="text-xs text-primary underline" href={previewDoc.file_url} target="_blank" rel="noreferrer">Open in new tab</a>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setPreviewDoc(null)}>Close</Button>
                  </div>
                </div>
                <div className="p-3 overflow-auto max-h-[78vh] bg-card">
                  {(() => {
                    const url = String(previewDoc.file_url || '')
                    const mime = String(previewDoc.file_mime || '')
                    const lower = url.toLowerCase()
                    if (!url && previewDoc.content_richtext) {
                      return <div className="whitespace-pre-wrap text-sm">{previewDoc.content_richtext}</div>
                    }
                    if (lower.endsWith('.pdf') || mime.includes('pdf')) {
                      return <iframe src={url} className="w-full h-[70vh]" />
                    }
                    if (/(png|jpg|jpeg|gif|webp)$/i.test(lower) || /^image\//.test(mime)) {
                      return <img src={url} alt="preview" className="max-w-full max-h-[70vh] object-contain" />
                    }
                    return (
                      <div className="text-sm text-muted-foreground">Preview not available. Use "Open in new tab" to view/download.</div>
                    )
                  })()}
                </div>
              </Card>
            </div>
          )}

          {showDisposition && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-background/70" />
              <Card className="relative z-50 w-[560px] max-w-[95vw] border shadow-2xl">
                <div className="px-4 py-3 border-b font-medium">Select Call Disposition</div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">This is required before saving the call.</div>
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose disposition" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-auto">
                      {[
                        'Call Failed','Lead','Lost','DNC','VM-RPC','VM-Operator','Not an RPC','Invalid Number','Invalid Job Title','Invalid Country','Invalid Industry','Invalid EMP-Size','Follow-Ups','Busy','Wrong Number','Not Answered','Disconnected','Contact Discovery'
                      ].map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={() => { /* mandatory - no close without selection */ }} disabled>
                      Close
                    </Button>
                    <Button onClick={async () => {
                      if (!disposition) return
                      try {
                        if (!uploadedOnceRef.current) uploadedOnceRef.current = true
                        await stopRecordingAndUpload(pendingUploadExtra || {})
                      } finally {
                        setShowDisposition(false)
                        setPendingUploadExtra(null)
                        setDisposition("")
                      }
                    }} disabled={!disposition}>
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
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

