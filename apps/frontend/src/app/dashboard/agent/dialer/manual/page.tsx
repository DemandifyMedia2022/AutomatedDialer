"use client"
// Simple waveform animation like in Call History page
const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-end justify-between gap-[2px] h-4 w-full">
    {Array.from({ length: 64 }).map((_, i) => {
      const base = [0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.6, 0.8, 1, 0.8, 0.6, 0.4]
      const height = base[i % base.length]
      return (
        <span
          key={i}
          style={{
            height: `${height * 100}%`,
            animation: active ? `wave 0.7s ${0.03 * (i % base.length)}s infinite ease-in-out` : 'none',
            animationFillMode: active ? 'both' : 'forwards',
          }}
          className="w-[2px] bg-foreground/70 rounded-sm origin-bottom"
        />
      )
    })}
    <style jsx>{`
      @keyframes wave {
        0% { transform: scaleY(0.4); }
        50% { transform: scaleY(1.2); }
        100% { transform: scaleY(0.4); }
      }
    `}</style>
  </div>
)


import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { Phone, PhoneOff, Mic, MicOff, Trash2, Search, Pause, UserPlus, Grid2X2, PhoneCall } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
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
import { io } from "socket.io-client"
import { useCampaigns } from "@/hooks/agentic/useCampaigns"

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
  const [countryCode, setCountryCode] = useState("+91")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [callHistory, setCallHistory] = useState<any[]>([])
  const [liveSegments, setLiveSegments] = useState<Array<{ speaker?: string; text: string }>>([])
  const lastDialedNumber = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("lastDialedNumber")
  }, [])
  const historyToShow = useMemo(() => {
    if (!Array.isArray(callHistory)) return []
    return callHistory.slice(0, 5)
  }, [callHistory])

  // Notes state
  const [notes, setNotes] = useState<Array<{ id: string; text: string; phone?: string; at: string }>>([])
  const [newNote, setNewNote] = useState("")
  // Documents state
  const [docs, setDocs] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docQuery, setDocQuery] = useState("")
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>(undefined)
  const { campaigns, loading: campaignsLoading } = useCampaigns()

  // Draggable in-call popup position
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 420, y: 160 })
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)

  // Live transcription (client-only) refs
  const liveSessionIdRef = useRef<string | null>(null)
  const socketRef = useRef<any>(null)

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
  const remoteInMixRef = useRef<boolean>(false)
  const lastRemoteStreamRef = useRef<MediaStream | null>(null)
  const localMicStreamRef = useRef<MediaStream | null>(null)
  const lastDialDestinationRef = useRef<string | null>(null)
  const remoteRecorderRef = useRef<MediaRecorder | null>(null)
  const remoteRecordedChunksRef = useRef<BlobPart[]>([])
  const wantRemoteRecordingRef = useRef<boolean>(false)

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

  const appliedLastDialOnce = useRef(false)

  // Post-call disposition modal state
  const [showDisposition, setShowDisposition] = useState(false)
  const [disposition, setDisposition] = useState("")
  const [pendingUploadExtra, setPendingUploadExtra] = useState<any>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("manual_dialer_campaign")
      if (saved) setSelectedCampaign(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (!selectedCampaign) localStorage.removeItem("manual_dialer_campaign")
      else localStorage.setItem("manual_dialer_campaign", selectedCampaign)
    } catch {}
  }, [selectedCampaign])

  const selectedCampaignLabel = useMemo(() => {
    if (!selectedCampaign) return ""
    const found = campaigns.find((c: { key: string; label: string }) => c.key === selectedCampaign)
    return found?.label || selectedCampaign
  }, [campaigns, selectedCampaign])

  const currentPhone = useMemo(() => {
    const dialNum = number ? `${countryCode}${number}` : (lastDialedNumber || "")
    return dialNum || ""
  }, [countryCode, number, lastDialedNumber])

  function isBusyCause(cause: any, code?: number, reason?: string): boolean {
    const c = String(cause || '').toLowerCase()
    const r = String(reason || '').toLowerCase()
    return c.includes('busy') || c.includes('486') || code === 486 || code === 603 || r.includes('busy') || r.includes('decline')
  }

  useEffect(() => {
    // Load saved country code and local number early
    try {
      const savedCc = localStorage.getItem('dial_cc')
      const savedNum = localStorage.getItem('dial_num')
      if (savedCc) setCountryCode(savedCc)
      if (savedNum) setNumber(savedNum)
    } catch {}
  }, [])

  useEffect(() => {
    if (!appliedLastDialOnce.current && lastDialedNumber) {
      // Only use lastDialedNumber as a fallback if no saved dial_num
      try {
        const savedNum = localStorage.getItem('dial_num')
        if (!savedNum) {
          const m = lastDialedNumber.match(/^\+(\d{1,3})(\d+)$/)
          if (m) {
            setCountryCode(`+${m[1]}`)
            setNumber(m[2])
          }
        }
      } catch {}
      appliedLastDialOnce.current = true
    }
  }, [lastDialedNumber])

  const fetchHistory = useCallback(async () => {
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
      const res = await fetch(`${API_PREFIX}/calls/mine?page=1&pageSize=5`, { headers, credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => null) as any
      const list = Array.isArray(data?.items)
        ? data.items
        : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
      setCallHistory(list)
    } catch {}
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Notes: fetch for current phone (or user's recent if none)
  const fetchNotes = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies()
        if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const qs = new URLSearchParams()
      qs.set('limit', '20')
      if (currentPhone) qs.set('phone', currentPhone)
      const res = await fetch(`${API_PREFIX}/notes?${qs.toString()}`, { headers, credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => null) as any
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
      const mapped = items.map((n: any) => ({ id: String(n.id), text: String(n.body || ''), phone: n.phone_e164 || undefined, at: (n.created_at || new Date().toISOString()).slice(0,16).replace('T',' ') }))
      setNotes(mapped)
    } catch {}
  }, [currentPhone])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // Documents: fetch manager playbook/docs visible to agent (public/org)
  const fetchDocs = useCallback(async () => {
    try {
      setDocsLoading(true)
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const qs = new URLSearchParams({ page: '1', pageSize: '12' })
      if (docQuery) qs.set('q', docQuery)
      const res = await fetch(`${API_PREFIX}/documents?${qs.toString()}`, { headers, credentials })
      if (!res.ok) { setDocs([]); return }
      const data = await res.json().catch(() => null) as any
      setDocs(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }, [docQuery])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  // --- Live transcription helpers ---
  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current
    try {
      const opts: any = { transports: ["websocket"] }
      if (USE_AUTH_COOKIE) {
        opts.withCredentials = true
      } else {
        const t = getToken()
        if (t) opts.auth = { token: t }
      }
      const s = io(API_BASE, opts)
      s.on("transcription:segment", (payload: any) => {
        try {
          if (!payload || payload.sessionId !== liveSessionIdRef.current || !payload.segment) return
          const seg = payload.segment
          if (!seg || typeof seg.text !== "string" || !seg.text.trim()) return
          setLiveSegments(prev => [...prev, { speaker: seg.speaker, text: seg.text }])
        } catch {}
      })
      s.on("transcription:error", (_payload: any) => {
        // ignore for now in UI
      })
      socketRef.current = s
      return s
    } catch {
      return null
    }
  }, [])

  const createLiveSession = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_PREFIX}/transcription/session/create`, {
        method: 'POST',
        headers,
        credentials,
        body: JSON.stringify({ language: 'en' }),
      })
      if (!res.ok) return null
      const data = await res.json().catch(() => null) as any
      const sid = typeof data?.sessionId === 'string' ? data.sessionId : null
      if (!sid) return null
      liveSessionIdRef.current = sid
      setLiveSegments([])
      return sid
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    return () => {
      try { socketRef.current?.disconnect() } catch {}
      socketRef.current = null
    }
  }, [])

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
        try {
          localStorage.setItem('dial_ext', data.extensionId)
          localStorage.setItem('dial_cc', countryCode)
        } catch {}
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
      lastRemoteStreamRef.current = stream
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        safePlay()
      }
      if (audioCtxRef.current && mixDestRef.current && !remoteInMixRef.current) {
        try {
          const src = audioCtxRef.current.createMediaStreamSource(stream)
          src.connect(mixDestRef.current)
          remoteInMixRef.current = true
        } catch {}
      }
      if (wantRemoteRecordingRef.current && !remoteRecorderRef.current) {
        try {
          const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
          remoteRecordedChunksRef.current = []
          rec.ondataavailable = (e) => {
            if (e.data && e.data.size) {
              remoteRecordedChunksRef.current.push(e.data)
              if (liveSessionIdRef.current && socketRef.current) {
                e.data.arrayBuffer().then((buf) => {
                  try {
                    socketRef.current?.emit('transcription:audio_chunk', {
                      sessionId: liveSessionIdRef.current,
                      audioData: buf,
                      speaker: 'customer',
                    })
                  } catch {}
                }).catch(() => {})
              }
            }
          }
          rec.start(3000)
          remoteRecorderRef.current = rec
        } catch {}
      }
    }

    // Fallback: build stream from receivers
    const setFromReceivers = () => {
      try {
        const tracks = pc.getReceivers().map((r) => r.track).filter(Boolean) as MediaStreamTrack[]
        if (tracks.length) {
          const stream = new MediaStream(tracks)
          lastRemoteStreamRef.current = stream
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream
            safePlay()
          }
          if (audioCtxRef.current && mixDestRef.current && !remoteInMixRef.current) {
            try {
              const src = audioCtxRef.current.createMediaStreamSource(stream)
              src.connect(mixDestRef.current)
              remoteInMixRef.current = true
            } catch {}
          }
          if (wantRemoteRecordingRef.current && !remoteRecorderRef.current) {
            try {
              const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
              remoteRecordedChunksRef.current = []
              rec.ondataavailable = (e) => {
                if (e.data && e.data.size) {
                  remoteRecordedChunksRef.current.push(e.data)
                  if (liveSessionIdRef.current && socketRef.current) {
                    e.data.arrayBuffer().then((buf) => {
                      try {
                        socketRef.current?.emit('transcription:audio_chunk', {
                          sessionId: liveSessionIdRef.current,
                          audioData: buf,
                          speaker: 'customer',
                        })
                      } catch {}
                    }).catch(() => {})
                  }
                }
              }
              rec.start(3000)
              remoteRecorderRef.current = rec
            } catch {}
          }
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
        try {
          ensureSocket()
          await createLiveSession()
        } catch {}
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
        const code = Number(e?.response?.status_code || 0)
        const reason = e?.response?.reason_phrase || String(e?.cause || '')
        const reasonL = String(reason).toLowerCase()
        const isBusy = isBusyCause(e?.cause, code, reason)
        const isNoAnswer = (!isBusy) && (
          code === 408 || code === 480 || code === 487 || code === 404 ||
          reasonL.includes('no answer') || reasonL.includes('timeout') || reasonL.includes('temporarily unavailable') || reasonL.includes('unavailable')
        )
        setStatus(isBusy ? "Busy" : isNoAnswer ? "No Answer" : "Call Failed")
        setError(e?.cause || "Call failed")
        clearTimer()
        // Keep the popup visible to show final status to the agent
        setShowPopup(true)
        if (!uploadedOnceRef.current) {
          if (isBusy) {
            try { await startBusyTone(); setTimeout(() => stopBusyTone(), 3000) } catch {}
          }
          setPendingUploadExtra({ sip_status: code || undefined, sip_reason: reason || undefined, hangup_cause: isBusy ? 'busy' : undefined })
          setShowDisposition(true)
        }
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
      })
    })

    ua.start()
    uaRef.current = ua
  }, [attachRemoteAudio, fetchSipConfig, ensureSocket, createLiveSession])

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

  const timeAgo = (iso?: string | null) => {
    try {
      if (!iso) return 'just now'
      const t = new Date(iso).getTime()
      if (!isFinite(t)) return 'just now'
      const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
      if (s < 5) return 'just now'
      if (s < 60) return `${s} sec ago`
      const m = Math.floor(s / 60)
      if (m < 60) return m === 1 ? '1 min ago' : `${m} mins ago`
      const h = Math.floor(m / 60)
      if (h < 24) return h === 1 ? '1 hr ago' : `${h} hrs ago`
      const d = Math.floor(h / 24)
      return d === 1 ? '1 day ago' : `${d} days ago`
    } catch { return 'just now' }
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
      const dialNum = `${countryCode}${number}`
      lastDialDestinationRef.current = dialNum || null
      // Show popup immediately when dialing and center it
      setShowPopup(true)
      try {
        const w = window.innerWidth
        const h = window.innerHeight
        const px = Math.max(8, Math.floor(w / 2 - 180))
        const py = Math.max(60, Math.floor(h / 2 - 120))
        setPopupPos({ x: px, y: py })
      } catch {}
      // For many SIP servers, the user part should not include '+'
      const sipUser = dialNum.replace(/^\+/, '')
      uaRef.current.call(numberToSipUri(sipUser, ext), options)
      localStorage.setItem("lastDialedNumber", dialNum)
      try { localStorage.setItem('dial_num', number) } catch {}
      // Optimistically show in recent history
      setCallHistory((prev) => [{ destination: dialNum, end_time: null }, ...prev].slice(0, 5))
    } catch (e: any) {
      setError(e?.message || "Call start error")
    }
  }

  const hangup = async () => {
    try { sessionRef.current?.terminate() } catch {}
    stopRingback()
    setShowPopup(false)
    if (!uploadedOnceRef.current) {
      setPendingUploadExtra({})
      setShowDisposition(true)
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
      remoteInMixRef.current = false
      wantRemoteRecordingRef.current = true

      const addStream = (ms: MediaStream | null, markRemote?: boolean) => {
        if (!ms) return
        try {
          const src = ctx.createMediaStreamSource(ms)
          src.connect(dest)
          if (markRemote) remoteInMixRef.current = true
        } catch {}
      }
      addStream(lastRemoteStreamRef.current, true)
      addStream(await getLocalMicStream())

      const mime = 'audio/webm'
      recordedChunksRef.current = []
      const rec = new MediaRecorder(dest.stream, { mimeType: mime })
      rec.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunksRef.current.push(e.data) }
      rec.start(250)
      mediaRecorderRef.current = rec

      if (wantRemoteRecordingRef.current && lastRemoteStreamRef.current && !remoteRecorderRef.current) {
        try {
          const rrec = new MediaRecorder(lastRemoteStreamRef.current, { mimeType: 'audio/webm' })
          remoteRecordedChunksRef.current = []
          rrec.ondataavailable = (e) => {
            if (e.data && e.data.size) {
              remoteRecordedChunksRef.current.push(e.data)
              if (liveSessionIdRef.current && socketRef.current) {
                e.data.arrayBuffer().then((buf) => {
                  try {
                    socketRef.current?.emit('transcription:audio_chunk', {
                      sessionId: liveSessionIdRef.current,
                      audioData: buf,
                      speaker: 'customer',
                    })
                  } catch {}
                }).catch(() => {})
              }
            }
          }
          rrec.start(3000)
          remoteRecorderRef.current = rrec
        } catch {}
      }
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

    try {
      const rrec = remoteRecorderRef.current
      if (rrec && rrec.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          rrec.onstop = () => resolve()
          try { rrec.stop() } catch { resolve() }
        })
      }
    } catch {}

    const blob = recordedChunksRef.current.length ? new Blob(recordedChunksRef.current, { type: 'audio/webm' }) : null
    const remoteBlob = remoteRecordedChunksRef.current.length ? new Blob(remoteRecordedChunksRef.current, { type: 'audio/webm' }) : null
    mediaRecorderRef.current = null
    recordedChunksRef.current = []
    remoteRecorderRef.current = null
    remoteRecordedChunksRef.current = []
    wantRemoteRecordingRef.current = false

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
    if (selectedCampaign) form.append('campaign_name', selectedCampaign)
    if (typeof extra.sip_status === 'number') form.append('sip_status', String(extra.sip_status))
    if (extra.sip_reason) form.append('sip_reason', extra.sip_reason)
    if (extra.hangup_cause) form.append('hangup_cause', extra.hangup_cause)
    form.append('platform', 'web')
    // Determine automatic call disposition from SIP result
    const autoDisposition = (() => {
      if (hasAnsweredRef.current) return 'Answered'
      const code = typeof extra.sip_status === 'number' ? extra.sip_status : undefined
      const cause = (extra.sip_reason || '').toLowerCase()
      const hang = (extra.hangup_cause || '').toLowerCase()
      if (hang.includes('busy') || (code === 486 || code === 603) || cause.includes('busy') || cause.includes('decline')) return 'Busy'
      if ((code === 408 || code === 480 || code === 487 || code === 404) || cause.includes('no answer') || cause.includes('timeout') || cause.includes('temporarily unavailable') || cause.includes('unavailable')) return 'No Answer'
      return 'Call Failed'
    })()
    form.append('disposition', autoDisposition)
    // Selected options are feedbacks stored as remark
    if (disposition) form.append('remarks', disposition)

    if (blob) form.append('recording', blob, `call_${Date.now()}.webm`)
    if (remoteBlob) form.append('remote_recording', remoteBlob, `call_remote_${Date.now()}.webm`)

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
      // Refresh recent history
      try { await fetchHistory() } catch {}
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

  const onAlpha = (a: string) => {
    if (status.startsWith("In Call")) {
      sendDTMF(a)
    } else {
      setNumber((prev) => (prev + a).slice(0, 32))
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

  const addNote = async () => {
    if (!newNote.trim()) return
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies()
        if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const payload = { title: newNote.trim().slice(0, 80), body: newNote.trim(), phone_e164: currentPhone, tags_csv: '' }
      const res = await fetch(`${API_PREFIX}/notes`, { method: 'POST', headers, credentials, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to save note')
      const saved = await res.json()
      const mapped = { id: String(saved.id), text: String(saved.body || newNote.trim()), phone: saved.phone_e164 || currentPhone || undefined, at: (saved.created_at || new Date().toISOString()).slice(0,16).replace('T',' ') }
      setNotes((n) => [mapped, ...n])
      setNewNote("")
    } catch (e: any) {
      setError(e?.message || 'Failed to save note')
    }
  }

  const removeNote = async (id: string) => {
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
      const res = await fetch(`${API_PREFIX}/notes/${encodeURIComponent(id)}`, { method: 'DELETE', headers, credentials })
      if (!res.ok) throw new Error('Failed to delete note')
      setNotes((n) => n.filter((x) => x.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Failed to delete note')
    }
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
                  <BreadcrumbLink href="/dashboard/agent">Dialer</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Manual</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* status badge removed per request */}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
          <Script src="/js/jssip.min.js" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />

          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <div className="grid gap-2 lg:grid-cols-3">
            {/* Dialer */}
            <Card className="p-4 lg:col-span-1">
              <div className="mb-2 text-base font-semibold">Dialer</div>
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Campaign</Label>
                <Select
                  value={selectedCampaign ?? undefined}
                  onValueChange={(value) => setSelectedCampaign(value)}
                  disabled={campaignsLoading || campaigns.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={campaignsLoading ? "Loading campaigns..." : "Select campaign"} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.length === 0 ? (
                      <SelectItem value="no-campaign" disabled>
                        {campaignsLoading ? "Loading..." : "No campaigns available"}
                      </SelectItem>
                    ) : (
                      campaigns.map((campaign: { key: string; label: string }) => (
                        <SelectItem key={campaign.key} value={campaign.key}>
                          {campaign.label || campaign.key}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {selectedCampaign ? `Calling under ${selectedCampaignLabel}` : "Select a campaign to enable dialing."}
                </p>
              </div>

              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <div className="mt-1 flex gap-2">
                  <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); try { localStorage.setItem('dial_cc', v) } catch {} }}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="+91" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">+1 US</SelectItem>
                      <SelectItem value="+44">+44 UK</SelectItem>
                      <SelectItem value="+61">+61 AU</SelectItem>
                      <SelectItem value="+65">+65 SG</SelectItem>
                      <SelectItem value="+91">+91 IN</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="flex-1 text-lg tracking-widest" inputMode="numeric" value={number} onChange={(e) => {
                    const v = e.target.value.replace(/\D+/g, "")
                    setNumber(v)
                    try { localStorage.setItem('dial_num', v) } catch {}
                  }} placeholder="Enter number" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {d:"1", s:""},
                  {d:"2", s:"ABC"},
                  {d:"3", s:"DEF"},
                  {d:"4", s:"GHI"},
                  {d:"5", s:"JKL"},
                  {d:"6", s:"MNO"},
                  {d:"7", s:"PQRS"},
                  {d:"8", s:"TUV"},
                  {d:"9", s:"WXYZ"},
                  {d:"*", s:""},
                  {d:"0", s:"+"},
                  {d:"#", s:""},
                ].map(({d,s}) => (
                  <Button key={d} variant="outline" className="h-14 flex flex-col items-center justify-center" onClick={() => onDigit(d)}>
                    <span className="text-lg font-semibold leading-none">{d}</span>
                    {s ? <span className="mt-0.5 text-[10px] tracking-widest text-muted-foreground">{s}</span> : null}
                  </Button>
                ))}
              </div>

              {/* Removed A-D DTMF keys per request */}

              <div className="mt-2 flex items-center gap-2">
                {status.startsWith("In Call") ? (
                  <Button onClick={hangup} variant="destructive" className="gap-2 flex-1">
                    <PhoneOff className="h-4 w-4" /> End Call
                  </Button>
                ) : (
                  <Button
                    onClick={placeCall}
                    className="gap-2 flex-1"
                    disabled={!number || !uaRef.current || !status.includes("Registered") || !selectedCampaign}
                  >
                    <PhoneCall className="h-4 w-4" /> Call
                  </Button>
                )}
                <Button variant="outline" onClick={() => setNumber("")}>Clear</Button>
              </div>

              <div className="mt-2">
                {status.startsWith("In Call") ? (<WaveBars active={true} />) : null}
              </div>

              <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

              <Separator className="my-1" />
              <div className="text-sm text-muted-foreground">History</div>
              <div className="mt-1 space-y-1 text-sm">
                {historyToShow.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No recent calls</div>
                ) : historyToShow.map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <PhoneCall className="h-4 w-4 text-pink-600 shrink-0" />
                      <div className="truncate">{h.destination || h.phone || h.number || "Unknown"}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {h.disposition ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground/80">{h.disposition}</span> : null}
                      <div className="text-xs text-muted-foreground">{timeAgo(h.end_time || h.start_time || null)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right column: Notes + Documents */}
            <div className="lg:col-span-2 space-y-3">
              {/* Notes */}
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

              {/* Documents */}
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
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Draggable In-Call Popup */}
          {showPopup && (
            <div
              className="fixed z-50 w-[360px] rounded-lg border bg-card text-card-foreground shadow-xl dark:shadow-2xl"
              style={{ left: popupPos.x, top: popupPos.y }}
            >
              <div
                className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-emerald-50 dark:bg-emerald-900/30 border-b border-border cursor-move"
                onMouseDown={onPopupMouseDown}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {(() => {
                    const s = status
                    const dot = s.includes('Ringing') ? 'bg-amber-500' :
                               s.startsWith('In Call') ? 'bg-emerald-500' :
                               s.includes('Busy') ? 'bg-orange-500' :
                               s.includes('No Answer') ? 'bg-slate-500' :
                               s.includes('Failed') ? 'bg-red-500' :
                               s.includes('Disconnected') ? 'bg-gray-400' :
                               (s.includes('Connected') || s.includes('Registered')) ? 'bg-sky-500' :
                               'bg-muted'
                    return (
                      <>
                        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                        <span className="text-foreground/90">{s}</span>
                      </>
                    )
                  })()}
                </div>
                <div className="text-xs text-muted-foreground">Drag to move</div>
              </div>
              <div className="px-4 pt-3 pb-4">
                <div className="text-center font-semibold tracking-wide text-foreground">{number || lastDialedNumber || "Unknown"}</div>
                <div className="mt-1 text-center text-xs text-muted-foreground">{elapsed() || "00:00"}</div>

                {/* Live client subtitles */}
                <div className="mt-3 border rounded-md bg-background/70 px-3 py-2 max-h-28 overflow-y-auto">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">Live Transcript</div>
                  {liveSegments.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">Waiting for speech…</div>
                  ) : (
                    liveSegments.slice(-6).map((seg, idx) => (
                      <div key={idx} className="text-xs whitespace-pre-wrap break-words">
                        <span className="font-semibold mr-1">Prospect:</span>
                        {seg.text}
                      </div>
                    ))
                  )}
                </div>
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

          {/* Mandatory Feedback Modal */}
          {showDisposition && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-background/70" />
              <Card className="relative z-50 w-[560px] max-w-[95vw] border shadow-2xl">
                <div className="px-4 py-3 border-b font-medium">Select Feedback</div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">This is required before saving the call.</div>
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose feedback" />
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

          {/* Document Preview Popup */}
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
                    // Fallback: show filename and a link
                    return (
                      <div className="text-sm text-muted-foreground">
                        Preview not available. Use "Open in new tab" to view/download.
                      </div>
                    )
                  })()}
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
