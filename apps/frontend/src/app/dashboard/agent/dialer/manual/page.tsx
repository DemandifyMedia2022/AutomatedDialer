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
import { detectRegion, getCountryName } from "@/utils/regionDetection"

declare global {
  interface Window {
    JsSIP?: any
  }
}

const API_PREFIX = `${API_BASE}/api`
const DIAL_PREFIX = process.env.NEXT_PUBLIC_DIAL_PREFIX || ''

const dmFieldKeys = [
  'unique_id',
  'f_salutation',
  'f_first_name',
  'f_last_name',
  'f_job_title',
  'f_department',
  'f_job_level',
  'f_email_add',
  'Secondary_Email',
  'f_conatct_no',
  'f_company_name',
  'f_website',
  'f_address1',
  'f_city',
  'f_state',
  'f_zip_code',
  'f_country',
  'f_emp_size',
  'f_industry',
  'f_sub_industry',
  'f_revenue',
  'f_revenue_link',
  'f_profile_link',
  'f_company_link',
  'f_address_link',
  'f_cq1',
  'f_cq2',
  'f_cq3',
  'f_cq4',
  'f_cq5',
  'f_cq6',
  'f_cq7',
  'f_cq8',
  'f_cq9',
  'f_cq10',
  'f_asset_name1',
  'f_asset_name2',
  'f_email_status',
  'f_qa_status',
  'f_dq_reason1',
  'f_dq_reason2',
  'f_dq_reason3',
  'f_dq_reason4',
  'f_qa_comments',
  'f_call_rating',
  'f_call_notes',
  'f_call_links',
  'f_qa_name',
  'f_audit_date',
] as const

type DmFieldKey = (typeof dmFieldKeys)[number]
type DmFormState = Record<DmFieldKey | 'f_campaign_name', string>
const extendedDmKeys = ['f_campaign_name', ...dmFieldKeys] as const
type DmFormKey = typeof extendedDmKeys[number]

const multilineDmFields = new Set<DmFieldKey>(['f_address1', 'f_profile_link', 'f_company_link', 'f_address_link'])

const buildDefaultDmFormState = (campaign?: string, overrides?: Partial<DmFormState>): DmFormState => {
  const base: Record<string, string> = {}
  for (const key of dmFieldKeys) {
    base[key] = ''
  }
  const merged = {
    f_campaign_name: campaign ?? '',
    ...base,
    ...overrides,
  }
  return merged as DmFormState
}

const humanizeDmField = (key: string) => {
  return key
    .replace(/^f_/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function ManualDialerPage() {
  const TRANSFER_MODE: 'dtmf' | 'refer-then-dtmf' = 'dtmf'
  const [ext, setExt] = useState("")
  const [pwd, setPwd] = useState("")
  const [number, setNumber] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [callHistory, setCallHistory] = useState<any[]>([])
  const [liveSegments, setLiveSegments] = useState<Array<{ speaker?: string; text: string }>>([])
  const [lastCallDisposition, setLastCallDisposition] = useState<string | null>(null)
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
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined
    try {
      return localStorage.getItem("manual_dialer_campaign") || undefined
    } catch {
      return undefined
    }
  })
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
  const sipDomainRef = useRef<string | null>(null)

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
  const currentCallIdRef = useRef<number | null>(null)

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
  const [dmForm, setDmForm] = useState<DmFormState>(() => buildDefaultDmFormState(selectedCampaign))

  const resetDmForm = () => {
    setDmForm(buildDefaultDmFormState(selectedCampaign))
  }

  const updateDmField = (field: string, value: string) => {
    setDmForm(prev => ({ ...prev, [field]: value }))
  }

  const [dmSaving, setDmSaving] = useState(false)
  const [dmMessage, setDmMessage] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const canEditDmForm = status.startsWith("In Call") || status === "Call Ended" || showDisposition

  useEffect(() => {
    try {
      if (!selectedCampaign) localStorage.removeItem("manual_dialer_campaign")
      else localStorage.setItem("manual_dialer_campaign", selectedCampaign)
    } catch { }
  }, [selectedCampaign])

  useEffect(() => {
    setDmForm((prev) => {
      const next = selectedCampaign ?? ''
      if (prev.f_campaign_name === next) return prev
      return { ...prev, f_campaign_name: next }
    })
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

  useEffect(() => {
    if (!currentPhone) return
    // f_lead removed from form, no need to sync
  }, [currentPhone])

  function isBusyCause(cause: any, code?: number, reason?: string): boolean {
    const c = String(cause || '').toLowerCase()
    const r = String(reason || '').toLowerCase()

    // SIP codes that indicate busy/declined calls
    const busyCodes = [486, 603, 600, 403, 406]

    // Reasons that indicate busy/declined calls
    const busyReasons = [
      'busy', 'decline', 'forbidden', 'not acceptable',
      'user busy', 'call rejected', 'busy here', 'declined'
    ]

    // Check if any busy code matches
    const codeMatch = code !== undefined && busyCodes.includes(code)

    // Check if any busy reason matches
    const reasonMatch = busyReasons.some(br => r.includes(br))

    // Check if cause contains busy indicators
    const causeMatch = c.includes('busy') || c.includes('486') || c.includes('603') || c.includes('decline')

    return codeMatch || reasonMatch || causeMatch
  }

  function isNoAnswerCause(cause: any, code?: number, reason?: string): boolean {
    const c = String(cause || '').toLowerCase()
    const r = String(reason || '').toLowerCase()

    // SIP codes that indicate no answer/timeout calls
    const noAnswerCodes = [408, 480, 487, 404]

    // Reasons that indicate no answer/timeout calls
    const noAnswerReasons = [
      'no answer', 'timeout', 'temporarily unavailable', 'unavailable',
      'not reachable', 'user not reachable', 'no response', 'ring timeout',
      'call timeout', 'sip timeout', 'request timeout', 'server timeout', 'rejected'
    ]

    // Check if any no answer code matches
    const codeMatch = code !== undefined && noAnswerCodes.includes(code)

    // Check if any no answer reason matches
    const reasonMatch = noAnswerReasons.some(nr => r.includes(nr))

    // Check if cause contains no answer indicators
    const causeMatch = c.includes('no answer') || c.includes('timeout') || c.includes('unavailable') || c.includes('not reachable') || c.includes('rejected')

    return codeMatch || reasonMatch || causeMatch
  }

  useEffect(() => {
    // Load saved country code and local number early
    try {
      const savedCc = localStorage.getItem('dial_cc')
      const savedNum = localStorage.getItem('dial_num')
      if (savedCc) setCountryCode(savedCc)
      if (savedNum) setNumber(savedNum)
    } catch { }
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
      } catch { }
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
    } catch { }
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
      const mapped = items.map((n: any) => ({ id: String(n.id), text: String(n.body || ''), phone: n.phone_e164 || undefined, at: (n.created_at || new Date().toISOString()).slice(0, 16).replace('T', ' ') }))
      setNotes(mapped)
    } catch { }
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
      const opts: any = { transports: ["polling", "websocket"], path: "/socket.io" }
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
        } catch { }
        try {
          const dest = lastDialDestinationRef.current || `${countryCode}${number}`
          void sendPhase('connected', { source: ext, destination: dest || '', direction: 'OUT' }).catch(() => { })
        } catch { }
      })
      s.on("transcription:error", (_payload: any) => {
        // ignore for now in UI
      })
      s.on('agentic:start_call', async (payload: any) => {
        try {
          // Don't auto-initiate calls if last call was BUSY (prospect declined)
          if (lastCallDisposition === 'BUSY') return

          // Additional safety: don't initiate if there's any active session
          if (sessionRef.current) return

          const ph = String(payload?.lead?.phone || '').replace(/[^0-9+]/g, '').replace(/^00/, '+')
          if (!ph) return
          if (!uaRef.current) return
          if (!String(status).includes('Registered')) return
          setNumber(ph.replace(/^\+/, ''))
          await placeCall()
        } catch { }
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
      try { socketRef.current?.disconnect() } catch { }
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
        } catch { }
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
        try { sessionRef.current.terminate(); } catch { }
      }
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch { }
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
        } catch { }
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
                  } catch { }
                }).catch(() => { })
              }
            }
          }
          rec.start(3000)
          remoteRecorderRef.current = rec
        } catch { }
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
            } catch { }
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
                      } catch { }
                    }).catch(() => { })
                  }
                }
              }
              rec.start(3000)
              remoteRecorderRef.current = rec
            } catch { }
          }
        }
      } catch { }
    }

    setFromReceivers()
    pc.addEventListener('connectionstatechange', setFromReceivers)
  }, [])

  const fetchSipConfig = useCallback(async () => {
    const res = await fetch(`${API_PREFIX}/sip/config`)
    if (!res.ok) throw new Error(`Failed to load SIP config: ${res.status}`)
    return (await res.json()) as { wssUrl: string; domain: string; stunServer?: string }
  }, [])

  const sendPhase = useCallback(async (
    phase: 'dialing' | 'ringing' | 'connecting' | 'connected' | 'ended',
    extra?: Partial<{ source: string; destination: string; direction: string }>
  ) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const callId = currentCallIdRef.current || Date.now()
      currentCallIdRef.current = callId
      await fetch(`${API_PREFIX}/calls/phase`, {
        method: 'POST',
        headers,
        credentials,
        body: JSON.stringify({ phase, callId, ...extra })
      }).catch(() => { })
    } catch { }
  }, [])

  const setPresenceStatus = useCallback(async (to: 'AVAILABLE' | 'ON_CALL') => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }
      await fetch(`${API_PREFIX}/presence/status`, {
        method: 'POST',
        headers,
        credentials,
        body: JSON.stringify({ status: to })
      }).catch(() => { })
    } catch { }
  }, [])

  const startUA = useCallback(async (extension: string, password: string) => {
    setError(null)
    if (!window.JsSIP) throw new Error("JsSIP not loaded")

    const { wssUrl, domain, stunServer } = await fetchSipConfig()
    sipDomainRef.current = domain

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

      // Set unique_id in DM form when session is created
      if (session?.id) {
        setDmForm(prev => ({ ...prev, unique_id: String(session.id) }))
      }

      session.on("peerconnection", (e: any) => {
        const pc: RTCPeerConnection = e.peerconnection
        attachRemoteAudio(pc)
      })

      session.on("confirmed", () => {
        try {
          const pc: RTCPeerConnection = (session as any).connection
          if (pc) attachRemoteAudio(pc)
        } catch { }
        try {
          const dest = lastDialDestinationRef.current || `${countryCode}${number}`
          void sendPhase('connected', { source: ext, destination: dest || '', direction: 'OUT' }).catch(() => { })
        } catch { }
      })

      session.on("progress", () => {
        setStatus("Ringing");
        // Attach remote audio to hear the original ringing sound from PBX
        try { const pc: RTCPeerConnection = (session as any).connection; if (pc) attachRemoteAudio(pc) } catch { }
        const dest = lastDialDestinationRef.current || `${countryCode}${number}`
        try { sendPhase('ringing', { source: ext, destination: dest || '', direction: 'OUT' }) } catch { }
      })
      session.on("accepted", async () => {
        setStatus("In Call")
        callStartRef.current = Date.now()
        hasAnsweredRef.current = true

        if (timerRef.current) window.clearInterval(timerRef.current)
        timerRef.current = window.setInterval(() => {
          setStatus((s) => (s.startsWith("In Call") ? `In Call ${elapsed()}` : s))
        }, 1000)
        // Start recording once call is accepted
        try { await startRecording() } catch { }
        try {
          ensureSocket()
          await createLiveSession()
        } catch { }
        try {
          const dest = lastDialDestinationRef.current || `${countryCode}${number}`
          await sendPhase('connecting', { source: ext, destination: dest || '', direction: 'OUT' })
        } catch { }
        try { await setPresenceStatus('ON_CALL') } catch { }
        // Ensure popup is visible and centered on screen when call is active
        setShowPopup(true)

        try {
          const w = window.innerWidth
          const h = window.innerHeight
          const px = Math.max(8, Math.floor(w / 2 - 180))
          const py = Math.max(60, Math.floor(h / 2 - 120))
          setPopupPos({ x: px, y: py })
        } catch { }
      })
      session.on("failed", async (e: any) => {
        const code = Number(e?.response?.status_code || 0)
        const reason = e?.response?.reason_phrase || String(e?.cause || '')
        const reasonL = String(reason).toLowerCase()
        const isBusy = isBusyCause(e?.cause, code, reason)
        const isNoAnswer = isNoAnswerCause(e?.cause, code, reason)

        // Debug logging
        console.log('Call failed:', { code, reason, cause: e?.cause, isBusy, isNoAnswer })

        // Check both conditions independently to ensure proper parallel logic
        let finalStatus = "Call Failed"
        if (isBusy && isNoAnswer) {
          // If both are true, prioritize BUSY as it's more specific
          finalStatus = "Busy"
        } else if (isBusy) {
          finalStatus = "Busy"
        } else if (isNoAnswer) {
          finalStatus = "No Answer"
        }
        setStatus(finalStatus)
        setError(e?.cause || "Call failed")
        clearTimer()
        setIsOnHold(false)
        setShowPopup(true)
        // Set last call disposition to block agentic auto-calls if BUSY
        console.log('Disposition logic - isBusy:', isBusy, 'isNoAnswer:', isNoAnswer)
        if (isBusy) {
          console.log('Saving BUSY disposition - isBusy is true')
          setLastCallDisposition('BUSY')
          // Automatically save BUSY disposition to DM form
          try { await saveDispositionToDmForm('Busy') } catch { }
          // Immediately hang up any active session to prevent reconnection
          try { session.terminate?.() } catch { }
        } else {
          console.log('Saving NO_ANSWER/FAILED disposition - isBusy is false, isNoAnswer:', isNoAnswer)
          setLastCallDisposition(isNoAnswer ? 'NO_ANSWER' : 'FAILED')
          // Automatically save NO_ANSWER or FAILED disposition to DM form
          try { await saveDispositionToDmForm(isNoAnswer ? 'Not Answered' : 'Call Failed') } catch { }
        }
        if (!uploadedOnceRef.current) {
          if (isBusy) { try { await startBusyTone(); setTimeout(() => stopBusyTone(), 3000) } catch { } }
          setPendingUploadExtra({ sip_status: code || undefined, sip_reason: reason || undefined, hangup_cause: isBusy ? 'busy' : isNoAnswer ? 'no_answer' : undefined })
          setShowDisposition(true)
        }
        try { await sendPhase('ended') } catch { }
        try { await setPresenceStatus('AVAILABLE') } catch { }
      })
      session.on("ended", async () => {
        setStatus("Call Ended")
        clearTimer()
        setIsOnHold(false)
        setShowPopup(false)
        // Set last call disposition for normal call completion
        setLastCallDisposition('ANSWERED')
        if (!uploadedOnceRef.current) {
          setPendingUploadExtra({})
          setShowDisposition(true)
        }
        try { await sendPhase('ended') } catch { }
        try { await setPresenceStatus('AVAILABLE') } catch { }
      })

      // Incoming call handling
      try {
        if (session.direction === "incoming") {
          const remoteUser = (() => {
            try { return String(session.remote_identity?.uri?.user || session.remote_identity?.display_name || 'Unknown') } catch { return 'Unknown' }
          })()
          setStatus(`Incoming from ${remoteUser}`)
          setShowPopup(true)
          setShowIncomingPrompt(true)
        }
      } catch { }
    })

    ua.start()
    uaRef.current = ua
  }, [attachRemoteAudio, fetchSipConfig, ensureSocket, createLiveSession])

  // --- Staff list for transfer ---
  const [staff, setStaff] = useState<Array<{ id: number; username: string | null; extension: string | null }>>([])
  const [transferTarget, setTransferTarget] = useState<string>("")
  const [showTransfer, setShowTransfer] = useState(false)
  const [showIncomingPrompt, setShowIncomingPrompt] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = 'omit'
        if (USE_AUTH_COOKIE) {
          credentials = 'include'
        } else {
          const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_PREFIX}/agents/peers`, { credentials, headers })
        const j = await res.json().catch(() => null as any)
        const arr = Array.isArray(j?.users) ? j.users : []
        setStaff(arr.map((u: any) => ({ id: Number(u.id), username: u.username || null, extension: u.extension || null })))
      } catch { }
    }
    loadStaff()
  }, [])

  const transferCall = async () => {
    if (!sessionRef.current) { setError('No active call to transfer'); return }
    const targetExt = String(transferTarget || '').trim()
    if (!targetExt) { setError('Select an extension to transfer'); return }
    if (isTransferring) return
    setIsTransferring(true)
    // Prefer SIP REFER when supported (only if mode allows)
    const domain = sipDomainRef.current || ''
    try {
      if (TRANSFER_MODE === 'dtmf') {
        // Skip REFER entirely and use PBX feature codes
        throw new Error('DTMF-only mode')
      }
      if (typeof sessionRef.current.refer === 'function' && domain) {
        // Attach handlers so a failed REFER does not end the original call
        const sub = sessionRef.current.refer(`sip:${targetExt}@${domain}`)
        setStatus(`Transferring to ${targetExt}…`)
        try {
          sub.on('requestSucceeded', () => {
            // REFER accepted by PBX; further NOTIFY may indicate outcome
          })
          sub.on('requestFailed', (req: any, cause: any) => {
            const code = cause?.status_code || req?.status_code || 0
            const reason = cause?.reason_phrase || req?.reason_phrase || 'failed'
            setError(`Transfer failed (REFER): ${code} ${reason}. Falling back to DTMF transfer…`)
            setStatus('In Call')
            // Fallback to DTMF: #1 then *<ext># per PBX guide
            sendTransferDTMF(targetExt)
          })
          sub.on('notify', (n: any) => {
            // Optionally parse NOTIFY body for transfer progress/success
          })
        } catch { }
        return
      }
    } catch { }
    // No REFER support; use PBX DTMF transfer
    sendTransferDTMF(targetExt)
    // Auto-clear transferring flag after a short period
    setTimeout(() => setIsTransferring(false), 6000)
  }

  const sendTransferDTMF = (ext: string) => {
    try {
      setStatus(`Transferring (DTMF) to ${ext}…`)
      sendDTMFSeq('#1')
      // Wait ~3s for PBX to play the transfer prompt
      setTimeout(() => {
        try { sendDTMFSeq(`*${ext}#`) } catch { }
      }, 3000)
    } catch {
      setError('DTMF transfer failed')
      setStatus('In Call')
    }
  }

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

  const onLogin = async (_e?: React.FormEvent) => { }

  const ensureAudioCtx = async () => {
    if (!audioCtxRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    try { await audioCtxRef.current?.resume() } catch { }
  }

  // Removed synthetic ringback tone generation - now using actual media stream

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
    } catch { }
  }

  const stopBusyTone = () => {
    if (busyTimerRef.current) { window.clearTimeout(busyTimerRef.current); busyTimerRef.current = null }
    try { busyOsc1Ref.current?.stop() } catch { }
    try { busyOsc2Ref.current?.stop() } catch { }
    try { busyOsc1Ref.current?.disconnect() } catch { }
    try { busyOsc2Ref.current?.disconnect() } catch { }
    try { busyGainRef.current?.disconnect() } catch { }
    busyOsc1Ref.current = null
    busyOsc2Ref.current = null
    busyGainRef.current = null
  }

  const serializeDmPayload = () => {
    const payload: any = {}
    for (const key of extendedDmKeys) {
      const raw = (dmForm[key] || '').trim()
      payload[key] = raw.length ? raw : null
    }
    return payload
  }

  const submitDmForm = async () => {
    if (!canEditDmForm) {
      setDmMessage("Connect a call to unlock the form.")
      return
    }
    setDmSaving(true)
    setDmMessage(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies()
        if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }
      const payload = serializeDmPayload()

      // Get logged-in user name from API
      try {
        const userRes = await fetch(`${API_PREFIX}/auth/me`, {
          method: 'GET',
          headers,
          credentials,
        })
        if (userRes.ok) {
          const userData = await userRes.json().catch(() => null) as any
          payload.f_resource_name = userData?.user?.username || 'Unknown'
        } else {
          payload.f_resource_name = 'Unknown'
        }
      } catch {
        payload.f_resource_name = 'Unknown'
      }

      const res = await fetch(`${API_PREFIX}/dm-form`, {
        method: 'POST',
        headers,
        credentials,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Failed to save form (${res.status})`)
      }
      setDmMessage("Form saved successfully.")
    } catch (e: any) {
      setDmMessage(e?.message || "Failed to save form.")
    } finally {
      setDmSaving(false)
    }
  }

  const saveDispositionToDmForm = async (dispositionValue: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies()
        if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }

      // Get logged-in user name from API
      let userName = 'Unknown'
      try {
        const userRes = await fetch(`${API_PREFIX}/auth/me`, {
          method: 'GET',
          headers,
          credentials,
        })
        if (userRes.ok) {
          const userData = await userRes.json().catch(() => null) as any
          userName = userData?.user?.username || 'Unknown'
        }
      } catch {
        userName = 'Unknown'
      }

      // First, find the most recent entry for this campaign that doesn't have a disposition yet
      const listRes = await fetch(`${API_PREFIX}/dm-form?campaign=${encodeURIComponent(selectedCampaign || '')}&limit=20`, {
        method: 'GET',
        headers,
        credentials,
      })

      if (listRes.ok) {
        const listData = await listRes.json()
        if (listData.success && listData.forms && listData.forms.length > 0) {
          // Find the most recent entry that doesn't have a disposition in f_lead
          const existingEntry = listData.forms.find((form: any) =>
            form.f_campaign_name === selectedCampaign &&
            (!form.f_lead || form.f_lead === '' || form.f_lead === null)
          )

          if (existingEntry) {
            // Update the existing entry with disposition
            const updateRes = await fetch(`${API_PREFIX}/dm-form/${existingEntry.f_id}`, {
              method: 'PATCH',
              headers,
              credentials,
              body: JSON.stringify({
                f_lead: dispositionValue,
                f_resource_name: userName, // Add logged-in user name
                unique_id: dmForm.unique_id || String(sessionRef.current?.id || '') // Include unique_id from call session
              }),
            })

            if (updateRes.ok) {
              console.log('Disposition updated in existing DM form:', dispositionValue)
              return
            }
          }
        }
      }

      // If no existing entry found, create new one with disposition
      const payload = {
        f_campaign_name: selectedCampaign || '',
        f_lead: dispositionValue,
        f_resource_name: userName, // Add logged-in user name
        unique_id: dmForm.unique_id || String(sessionRef.current?.id || '') // Include unique_id from call session
      }

      const res = await fetch(`${API_PREFIX}/dm-form`, {
        method: 'POST',
        headers,
        credentials,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Failed to save disposition (${res.status})`)
      }

      console.log('Disposition saved to new DM form:', dispositionValue)
    } catch (e: any) {
      console.error('Failed to save disposition to DM form:', e?.message || 'Unknown error')
    }
  }

  const saveAndNext = () => {
    if (currentSection < formSections.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const goToPrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const formSections = [
    {
      title: "Personal Information",
      fields: ['f_salutation', 'f_first_name', 'f_last_name', 'f_job_title', 'f_department', 'f_job_level'] as DmFieldKey[],
      gridCols: 3
    },
    {
      title: "Contact Information",
      fields: ['f_email_add', 'Secondary_Email', 'f_conatct_no', 'f_website'] as DmFieldKey[],
      gridCols: 2
    },
    {
      title: "Company Information",
      fields: ['f_company_name', 'f_emp_size', 'f_industry', 'f_sub_industry', 'f_revenue'] as DmFieldKey[],
      gridCols: 2
    },
    {
      title: "Address Information",
      fields: ['f_address1', 'f_city', 'f_state', 'f_zip_code', 'f_country'] as DmFieldKey[],
      gridCols: 2
    },
    {
      title: "Links & Resources",
      fields: ['f_revenue_link', 'f_profile_link', 'f_company_link', 'f_address_link'] as DmFieldKey[],
      gridCols: 2
    },
    {
      title: "Custom Questions",
      fields: ['f_cq1', 'f_cq2', 'f_cq3', 'f_cq4', 'f_cq5', 'f_cq6', 'f_cq7', 'f_cq8', 'f_cq9', 'f_cq10'] as DmFieldKey[],
      gridCols: 2
    },
    {
      title: "Assets",
      fields: ['f_asset_name1', 'f_asset_name2'] as DmFieldKey[],
      gridCols: 2
    }
  ]

  const hangup = async () => {
    try { sessionRef.current?.terminate() } catch { }
    setShowPopup(false)
    if (!uploadedOnceRef.current) {
      setPendingUploadExtra({})
      setShowDisposition(true)
    }
    try { await sendPhase('ended') } catch { }
    try { await setPresenceStatus('AVAILABLE') } catch { }
  }

  const placeCall = async () => {
    setError(null)
    if (!uaRef.current) { setError("UA not ready"); return }
    if (!number) { setError("Empty number"); return }

    // Reset last call disposition when manually placing a call
    setLastCallDisposition(null)

    const destination = `${countryCode}${number}`
    const options = {
      eventHandlers: {},
      mediaConstraints: { audio: true, video: false },
      pcConfig: { rtcpMuxPolicy: "require" },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    }
    try {
      hasAnsweredRef.current = false
      setIsOnHold(false)
      uploadedOnceRef.current = false
      dialStartRef.current = Date.now()
      await ensureAudioCtx()
      lastDialDestinationRef.current = destination || null
      setShowPopup(true)
      try {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const px = Math.max(8, Math.floor(w / 2 - 180));
        const py = Math.max(60, Math.floor(h / 2 - 120));
        setPopupPos({ x: px, y: py })
      } catch { }
      try { await sendPhase('dialing', { source: ext, destination, direction: 'OUT' }) } catch { }
      uaRef.current.call(numberToSipUri(destination, ext), options)
    } catch (e: any) {
      setError(e?.message || "Call start error")
    }
  }

  const logout = () => {
    setError(null)
    setStatus("Idle")
    setNumber("")
    setIsMuted(false)
    setIsOnHold(false)
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
    } catch { }
  }

  const toggleHold = () => {
    const sess = sessionRef.current
    if (!sess) return
    try {
      if (isOnHold) { sess.unhold(); setIsOnHold(false) }
      else { sess.hold(); setIsOnHold(true) }
    } catch { }
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
        } catch { }
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
                  } catch { }
                }).catch(() => { })
              }
            }
          }
          rrec.start(3000)
          remoteRecorderRef.current = rrec
        } catch { }
      }
    } catch { }
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

  async function stopRecordingAndUpload(extra: { sip_status?: number; sip_reason?: string; hangup_cause?: string } = {}, manualDisposition?: string) {
    try {
      const rec = mediaRecorderRef.current
      if (rec && rec.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve()
          try { rec.stop() } catch { resolve() }
        })
      }
    } catch { }

    try {
      const rrec = remoteRecorderRef.current
      if (rrec && rrec.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          rrec.onstop = () => resolve()
          try { rrec.stop() } catch { resolve() }
        })
      }
    } catch { }

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
    const destination = (number ? `${countryCode}${number}` : lastDialDestinationRef.current || sipUser || '').toString()
    if (destination) {
      form.append('destination', destination)
      // Detect and append region and country
      const detectedRegion = detectRegion(destination, 'Unknown')
      const detectedCountry = getCountryName(destination) || 'Unknown'
      console.log('[Manual Dialer] Debug - destination:', destination)
      console.log('[Manual Dialer] Debug - detected region:', detectedRegion)
      console.log('[Manual Dialer] Debug - detected country:', detectedCountry)
      form.append('region', detectedRegion)
      form.append('country', detectedCountry)
      console.log('[Manual Dialer] Debug - appended region and country to form')
    }
    // Log all FormData entries before continuing
    console.log('[Manual Dialer] Debug - FormData entries before sending:')
    for (let [key, value] of form.entries()) {
      console.log(`  ${key}: ${value}`)
    }
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

      // Use the dedicated functions for better detection - check both independently
      const busyResult = hang.includes('busy') || isBusyCause(cause, code, extra.sip_reason)
      const noAnswerResult = hang.includes('no_answer') || isNoAnswerCause(cause, code, extra.sip_reason)

      // Determine disposition with clear priority logic
      if (busyResult && noAnswerResult) {
        // If both are true, prioritize BUSY as it's more specific
        return 'Busy'
      } else if (busyResult) {
        return 'Busy'
      } else if (noAnswerResult) {
        return 'No Answer'
      }
      return 'Call Failed'
    })()
    form.append('disposition', autoDisposition)

    // Add manual disposition to remarks if provided
    if (manualDisposition) {
      form.append('remarks', manualDisposition)
    }

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
      try { await fetchHistory() } catch { }
    } catch (e) {
      console.warn('Failed to upload call record', e)
    }
  }

  function cryptoRandom() {
    try { return (crypto as any).randomUUID?.() || String(Math.random()).slice(2) } catch { return String(Math.random()).slice(2) }
  }

  const sendDTMF = (digit: string, opts?: { duration?: number; interToneGap?: number }) => {
    try { sessionRef.current?.sendDTMF(digit, { duration: opts?.duration ?? 250, interToneGap: opts?.interToneGap ?? 250 }) } catch { }
  }

  const sendDTMFSeq = (digits: string, gapMs = 250, toneMs = 250) => {
    const seq = String(digits || '')
    if (!seq) return
    let delay = 0
    for (const ch of seq) {
      setTimeout(() => {
        try { sendDTMF(ch, { duration: toneMs, interToneGap: gapMs }) } catch { }
      }, delay)
      delay += gapMs
    }
  }

  const acceptIncoming = async () => {
    try {
      sessionRef.current?.answer({ mediaConstraints: { audio: true, video: false } })
      hasAnsweredRef.current = true
      setShowIncomingPrompt(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to answer')
    }
  }

  const declineIncoming = () => {
    try { sessionRef.current?.terminate() } catch { }
    setShowIncomingPrompt(false)
    setStatus('Call Rejected')
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
      const mapped = { id: String(saved.id), text: String(saved.body || newNote.trim()), phone: saved.phone_e164 || currentPhone || undefined, at: (saved.created_at || new Date().toISOString()).slice(0, 16).replace('T', ' ') }
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
            <Card className="border-2 border-red-300 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 p-4 text-sm font-medium shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-red-600 dark:text-red-500">⚠</span>
                <span>{error}</span>
              </div>
            </Card>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            {/* Dialer */}
            <Card className="p-5 lg:col-span-1 transition-shadow hover:shadow-md">
              <div className="mb-3 text-lg font-semibold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-primary" />
                Dialer
              </div>
              <div className="mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Campaign</Label>
                <Select
                  value={selectedCampaign ?? undefined}
                  onValueChange={(value) => setSelectedCampaign(value)}
                  disabled={campaignsLoading || campaigns.length === 0}
                >
                  <SelectTrigger className="w-full mt-1.5">
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
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {selectedCampaign ? `Calling under ${selectedCampaignLabel}` : "Select a campaign to enable dialing."}
                </p>
              </div>

              <div className="mb-4">
                <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                <div className="mt-1.5 flex gap-2">
                  <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); try { localStorage.setItem('dial_cc', v) } catch { } }}>
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
                  <Input className="flex-1 text-lg tracking-widest font-medium" inputMode="numeric" value={number} onChange={(e) => {
                    const v = e.target.value.replace(/\D+/g, "")
                    setNumber(v)
                    try { localStorage.setItem('dial_num', v) } catch { }
                  }} placeholder="Enter number" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { d: "1", s: "" },
                  { d: "2", s: "ABC" },
                  { d: "3", s: "DEF" },
                  { d: "4", s: "GHI" },
                  { d: "5", s: "JKL" },
                  { d: "6", s: "MNO" },
                  { d: "7", s: "PQRS" },
                  { d: "8", s: "TUV" },
                  { d: "9", s: "WXYZ" },
                  { d: "*", s: "" },
                  { d: "0", s: "+" },
                  { d: "#", s: "" },
                ].map(({ d, s }) => (
                  <Button
                    key={d}
                    variant="outline"
                    className="h-14 flex flex-col items-center justify-center transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-95"
                    onClick={() => onDigit(d)}
                  >
                    <span className="text-lg font-semibold leading-none">{d}</span>
                    {s ? <span className="mt-0.5 text-[10px] tracking-widest text-muted-foreground">{s}</span> : null}
                  </Button>
                ))}
              </div>

              {/* Removed A-D DTMF keys per request */}

              <div className="flex items-center gap-2 mb-3">
                {status.startsWith("In Call") ? (
                  <Button
                    onClick={hangup}
                    variant="destructive"
                    className="gap-2 flex-1 h-11 transition-all hover:shadow-md active:scale-95"
                  >
                    <PhoneOff className="h-4 w-4" /> End Call
                  </Button>
                ) : (
                  <Button
                    onClick={placeCall}
                    className="gap-2 flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 transition-all hover:shadow-md active:scale-95"
                    disabled={!number || !uaRef.current || !status.includes("Registered") || !selectedCampaign}
                  >
                    <Phone className="h-4 w-4" /> Call
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setNumber("")}
                  className="transition-all hover:bg-muted active:scale-95"
                >
                  Clear
                </Button>
              </div>

              {/* Call Status Indicator */}
              <div className="mb-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const s = status
                      const dot = s.includes('Ringing') ? 'bg-amber-500 animate-pulse' :
                        s.startsWith('In Call') ? 'bg-emerald-500 animate-pulse' :
                          s.includes('Busy') ? 'bg-orange-500' :
                            s.includes('No Answer') ? 'bg-slate-500' :
                              s.includes('Failed') ? 'bg-red-500' :
                                s.includes('Disconnected') ? 'bg-gray-400' :
                                  (s.includes('Connected') || s.includes('Registered')) ? 'bg-sky-500' :
                                    'bg-muted-foreground'
                      return (
                        <>
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
                          <span className="text-sm font-medium">{s}</span>
                        </>
                      )
                    })()}
                  </div>
                  {status.startsWith("In Call") && (
                    <span className="text-sm font-mono text-muted-foreground">{elapsed() || "00:00"}</span>
                  )}
                </div>
              </div>

              {status.startsWith("In Call") && (
                <div className="mb-3">
                  <WaveBars active={true} />
                </div>
              )}

              <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

              <Separator className="my-3" />
              <div className="text-sm font-medium mb-2">Recent Calls</div>
              <div className="space-y-2 text-sm">
                {historyToShow.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2 text-center">No recent calls</div>
                ) : historyToShow.map((h: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PhoneCall className="h-4 w-4 text-primary shrink-0" />
                      <div className="truncate font-medium">{h.destination || h.phone || h.number || "Unknown"}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {h.disposition ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${h.disposition === 'Answered' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                            h.disposition === 'Busy' ? 'bg-orange-500/10 text-orange-700 border border-orange-500/20' :
                              h.disposition === 'No Answer' ? 'bg-slate-500/10 text-slate-700 border border-slate-500/20' :
                                'bg-muted text-foreground/80 border border-border'
                          }`}>
                          {h.disposition}
                        </span>
                      ) : null}
                      <div className="text-xs text-muted-foreground">{timeAgo(h.end_time || h.start_time || null)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right column: Notes + Documents */}
            <div className="lg:col-span-2 space-y-3">
              {/* Decision Maker Form: only shown when a call is live or has just ended */}
              {canEditDmForm && (
                <Card className="p-0 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between px-5 py-4 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <div>
                      <div className="font-semibold text-base">Decision Maker Form</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Capture lead details while the call is active.</p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      Editing unlocked
                    </span>
                  </div>
                  <Separator />
                  <div className="p-5 space-y-4">
                    {dmMessage ? (
                      <Card className="border border-dashed bg-muted/40 p-3 text-xs text-foreground">
                        {dmMessage}
                      </Card>
                    ) : null}

                    {/* Campaign field only */}
                    <div className="grid gap-3 md:grid-cols-1">
                      <div key="f_campaign_name" className="space-y-1">
                        <Label className="text-xs font-medium">{humanizeDmField('f_campaign_name')}</Label>
                        <Input
                          value={dmForm.f_campaign_name}
                          onChange={(e) => updateDmField('f_campaign_name', e.target.value)}
                          placeholder={humanizeDmField('f_campaign_name')}
                        />
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {formSections.map((_, index) => (
                          <div
                            key={index}
                            className={`h-2 flex-1 rounded-full transition-colors ${index <= currentSection ? 'bg-emerald-500' : 'bg-muted'
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {currentSection + 1} of {formSections.length}
                      </span>
                    </div>

                    {/* Current section */}
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">
                          {formSections[currentSection].title}
                        </h4>
                        <div className={`grid gap-2 md:grid-cols-${formSections[currentSection].gridCols}`}>
                          {formSections[currentSection].fields.map((key) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs font-medium">{humanizeDmField(key)}</Label>
                              {multilineDmFields.has(key) ? (
                                <Textarea
                                  rows={2}
                                  value={dmForm[key]}
                                  onChange={(e) => updateDmField(key, e.target.value)}
                                  placeholder={humanizeDmField(key)}
                                />
                              ) : (
                                <Input
                                  value={dmForm[key]}
                                  onChange={(e) => updateDmField(key, e.target.value)}
                                  placeholder={humanizeDmField(key)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex gap-2">
                          {currentSection > 0 && (
                            <Button variant="outline" size="sm" onClick={goToPrevious}>
                              Previous
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={resetDmForm}>
                            Reset
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          {currentSection < formSections.length - 1 ? (
                            <Button size="sm" onClick={saveAndNext}>
                              Next
                            </Button>
                          ) : (
                            <Button size="sm" onClick={submitDmForm} disabled={!canEditDmForm || dmSaving}>
                              {dmSaving ? 'Saving...' : 'Save Complete Form'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Notes */}
              <Card className="p-0 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
                  <div className="font-semibold text-base">Notes</div>
                  <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                    {notes.length} notes
                  </div>
                </div>
                <Separator />
                <Tabs defaultValue="all" className="px-5 py-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">All Notes</TabsTrigger>
                    <TabsTrigger value="new">+ New Note</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <ScrollArea className="h-[220px] pr-3">
                      <div className="space-y-2">
                        {notes.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-8">No notes yet</div>
                        ) : notes.map((n) => (
                          <Card key={n.id} className="p-3 flex items-start justify-between transition-all hover:shadow-sm hover:border-primary/30">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">{n.text}</div>
                              <div className="mt-1.5 text-xs text-muted-foreground">{n.phone ? `${n.phone} · ` : ""}{n.at}</div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeNote(n.id)}
                              className="ml-2 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="new" className="mt-4">
                    <div className="space-y-3">
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write a quick note..."
                        className="min-h-[120px]"
                      />
                      <div className="text-right">
                        <Button
                          onClick={addNote}
                          className="transition-all hover:shadow-md active:scale-95"
                          disabled={!newNote.trim()}
                        >
                          Save Note
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Documents */}
              <Card className="p-0 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
                  <div className="font-semibold text-base">Shared Documents from Playbook</div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        placeholder="Search documents..."
                        value={docQuery}
                        onChange={(e) => setDocQuery(e.target.value)}
                        className="pl-8 w-64"
                      />
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fetchDocs()}
                      disabled={docsLoading}
                      className="transition-all hover:bg-primary/10 hover:border-primary/50"
                    >
                      Search
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="p-5 space-y-2">
                  {docsLoading ? (
                    <Card className="p-4 text-sm text-muted-foreground text-center">Loading…</Card>
                  ) : docs.length === 0 ? (
                    <Card className="p-4 text-sm text-muted-foreground text-center">No documents found</Card>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {docs.map((d: any) => (
                        <Card key={d.id} className="p-4 transition-all hover:shadow-md hover:border-primary/30">
                          <div className="font-medium truncate text-base">{d.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-muted">{String(d.type || '').toUpperCase()}</span>
                            {' • '}
                            <span className="px-1.5 py-0.5 rounded bg-muted">{String(d.visibility || '').toUpperCase()}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                            {d.description || d.content_richtext || '-'}
                          </div>
                          <div className="mt-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewDoc(d)}
                              className="transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-95"
                            >
                              View
                            </Button>
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
              className="fixed z-50 w-[380px] rounded-xl border-2 bg-card text-card-foreground shadow-2xl backdrop-blur-sm"
              style={{ left: popupPos.x, top: popupPos.y }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 rounded-t-xl bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-b-2 border-emerald-200 dark:border-emerald-800 cursor-move"
                onMouseDown={onPopupMouseDown}
              >
                <div className="flex items-center gap-2.5 text-sm font-semibold">
                  {(() => {
                    const s = status
                    const dot = s.includes('Ringing') ? 'bg-amber-500 animate-pulse' :
                      s.startsWith('In Call') ? 'bg-emerald-500 animate-pulse' :
                        s.includes('Busy') ? 'bg-orange-500' :
                          s.includes('No Answer') ? 'bg-slate-500' :
                            s.includes('Failed') ? 'bg-red-500' :
                              s.includes('Disconnected') ? 'bg-gray-400' :
                                (s.includes('Connected') || s.includes('Registered')) ? 'bg-sky-500' :
                                  'bg-muted'
                    return (
                      <>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot} shadow-sm`} />
                        <span className="text-foreground">{s}</span>
                      </>
                    )
                  })()}
                </div>
                <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                  Drag to move
                </div>
              </div>
              <div className="px-5 pt-4 pb-5">
                <div className="text-center text-xl font-bold tracking-wide text-foreground">{number || lastDialedNumber || "Unknown"}</div>
                <div className="mt-1.5 text-center text-sm font-mono text-muted-foreground">{elapsed() || "00:00"}</div>

                {/* Live client subtitles - Commented out for now */}
                {/* <div className="mt-4 border-2 rounded-lg bg-muted/30 px-4 py-3 max-h-32 overflow-y-auto">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Live Transcript</div>
                  {liveSegments.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">Waiting for speech…</div>
                  ) : (
                    liveSegments.slice(-6).map((seg, idx) => (
                      <div key={idx} className="text-xs whitespace-pre-wrap break-words mb-1.5">
                        <span className="font-semibold text-primary mr-1">Prospect:</span>
                        <span className="text-foreground">{seg.text}</span>
                      </div>
                    ))
                  )}
                </div> */}
                <div className="mt-5 grid grid-cols-5 gap-3 place-items-center">
                  <Button
                    size="icon"
                    variant={isMuted ? "default" : "outline"}
                    className={`rounded-full h-11 w-11 transition-all hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full h-11 w-11 transition-all hover:scale-110 active:scale-95 hover:bg-primary/10 hover:border-primary/50"
                    onClick={() => sendDTMF("5")}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="rounded-full h-14 w-14 transition-all hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl"
                    onClick={hangup}
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant={isOnHold ? "default" : "outline"}
                    className={`rounded-full h-11 w-11 transition-all hover:scale-110 active:scale-95 ${isOnHold ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white' : 'hover:bg-primary/10 hover:border-primary/50'}`}
                    onClick={toggleHold}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full h-11 w-11 transition-all hover:scale-110 active:scale-95 hover:bg-primary/10 hover:border-primary/50"
                    onClick={() => setShowTransfer((v) => !v)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {showIncomingPrompt && (
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Button
                      variant="default"
                      onClick={acceptIncoming}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 transition-all hover:shadow-md active:scale-95"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={declineIncoming}
                      className="flex-1 transition-all hover:shadow-md active:scale-95"
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {showTransfer && (
                  <div className="mt-5 p-4 space-y-3 border-2 rounded-lg bg-muted/30">
                    <div className="text-xs font-semibold text-muted-foreground">Transfer to user</div>
                    <Select value={transferTarget} onValueChange={setTransferTarget}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select agent/extension" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px] overflow-auto">
                        {staff.filter((u) => !!u.extension).map((u) => (
                          <SelectItem key={u.id} value={u.extension || ''}>
                            {(u.username || 'User')} ({u.extension})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end">
                      <Button
                        onClick={transferCall}
                        disabled={!transferTarget || isTransferring}
                        className="transition-all hover:shadow-md active:scale-95"
                      >
                        {isTransferring ? 'Transferring…' : 'Transfer'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mandatory Feedback Modal */}
          {showDisposition && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="absolute inset-0 bg-background/80" />
              <Card className="relative z-50 w-[560px] max-w-[95vw] border-2 shadow-2xl">
                <div className="px-5 py-4 border-b-2 bg-muted/30">
                  <div className="font-semibold text-lg">Select Call Feedback</div>
                  <p className="text-xs text-muted-foreground mt-1">This is required before saving the call.</p>
                </div>
                <div className="p-5 space-y-4">
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Choose feedback option" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-auto">
                      {[
                        'Call Failed', 'Lead', 'Lost', 'DNC', 'VM-RPC', 'VM-Operator', 'Not an RPC', 'Invalid Number', 'Invalid Job Title', 'Invalid Country', 'Invalid Industry', 'Invalid EMP-Size', 'Follow-Ups', 'Busy', 'Wrong Number', 'Not Answered', 'Disconnected', 'Contact Discovery'
                      ].map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => { /* mandatory - no close without selection */ }}
                      disabled
                      className="opacity-50"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!disposition) return
                        try {
                          // Save disposition to DM form f_lead column
                          await saveDispositionToDmForm(disposition)

                          // Continue with existing logic, pass the selected disposition for remarks
                          if (!uploadedOnceRef.current) uploadedOnceRef.current = true
                          await stopRecordingAndUpload(pendingUploadExtra || {}, disposition)
                        } finally {
                          setShowDisposition(false)
                          setPendingUploadExtra(null)
                          setDisposition("")
                        }
                      }}
                      disabled={!disposition}
                      className="transition-all hover:shadow-md active:scale-95"
                    >
                      Save Feedback
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Document Preview Popup */}
          {previewDoc && (
            <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
              <div className="absolute inset-0 bg-background/70" onClick={() => setPreviewDoc(null)} />
              <Card className="relative z-50 w-[720px] max-w-[95vw] max-h-[85vh] overflow-hidden border-2 shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b-2 bg-muted/30">
                  <div className="font-semibold text-base truncate mr-4">{previewDoc.title || 'Document'}</div>
                  <div className="flex items-center gap-3">
                    {previewDoc.file_url ? (
                      <a
                        className="text-xs text-primary underline hover:text-primary/80 transition-colors"
                        href={previewDoc.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in new tab
                      </a>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewDoc(null)}
                      className="transition-all hover:bg-muted active:scale-95"
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <div className="p-4 overflow-auto max-h-[78vh] bg-card">
                  {(() => {
                    const url = String(previewDoc.file_url || '')
                    const mime = String(previewDoc.file_mime || '')
                    const lower = url.toLowerCase()
                    if (!url && previewDoc.content_richtext) {
                      return <div className="whitespace-pre-wrap text-sm p-2">{previewDoc.content_richtext}</div>
                    }
                    if (lower.endsWith('.pdf') || mime.includes('pdf')) {
                      return <iframe src={url} className="w-full h-[70vh] rounded-lg" />
                    }
                    if (/(png|jpg|jpeg|gif|webp)$/i.test(lower) || /^image\//.test(mime)) {
                      return <img src={url} alt="preview" className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg" />
                    }
                    // Fallback: show filename and a link
                    return (
                      <div className="text-sm text-muted-foreground text-center py-8">
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

  function numberToSipUri(num: string, ext: string) {
    if (num.startsWith("sip:")) return num
    const domain = sipDomainRef.current || 'pbx2.telxio.com.sg'
    // sanitize: trim, remove spaces/dashes
    let n = String(num).trim().replace(/[\s-]/g, '')
    // If E.164 with leading '+', many Asterisk/Telxio dialplans expect digits only.
    // Use ;user=phone hint so PBX treats it as a telephone number.
    const isE164 = n.startsWith('+')
    if (isE164) n = n.slice(1)
    // Optional outbound route prefix (e.g., 9 or 00) configured via env
    if (DIAL_PREFIX) n = `${DIAL_PREFIX}${n}`
    return `sip:${n}@${domain};user=phone`
  }
}