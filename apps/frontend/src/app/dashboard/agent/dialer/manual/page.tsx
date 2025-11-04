"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react"

declare global {
  interface Window {
    JsSIP?: any
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api"

export default function ManualDialerPage() {
  const [step, setStep] = useState<"login" | "dialer">("login")
  const [ext, setExt] = useState("")
  const [pwd, setPwd] = useState("")
  const [number, setNumber] = useState("")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const uaRef = useRef<any>(null)
  const sessionRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callStartRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null) // also used for ringback
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const lastRemoteStreamRef = useRef<MediaStream | null>(null)
  const localMicStreamRef = useRef<MediaStream | null>(null)

  // Ringback tone helpers
  const ringGainRef = useRef<GainNode | null>(null)
  const ringOsc1Ref = useRef<OscillatorNode | null>(null)
  const ringOsc2Ref = useRef<OscillatorNode | null>(null)
  const ringTimerRef = useRef<number | null>(null)

  const lastDialedNumber = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("lastDialedNumber")
  }, [])

  useEffect(() => {
    if (lastDialedNumber && !number) setNumber(lastDialedNumber)
  }, [lastDialedNumber, number])

  // Auto-login if credentials are stored
  useEffect(() => {
    if (!isLoaded || step !== "login") return
    try {
      const storedExt = localStorage.getItem("sipExt")
      const storedPwd = localStorage.getItem("sipPwd")
      if (storedExt && storedPwd) {
        setExt(storedExt)
        setPwd(storedPwd)
        startUA(storedExt, storedPwd)
          .then(() => setStep("dialer"))
          .catch((e) => setError(e?.message || "Auto login failed"))
      }
    } catch {}
  }, [isLoaded, step])

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
    const res = await fetch(`${API_BASE}/sip/config`)
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
        if (timerRef.current) window.clearInterval(timerRef.current)
        timerRef.current = window.setInterval(() => {
          setStatus((s) => (s.startsWith("In Call") ? `In Call ${elapsed()}` : s))
        }, 1000)
        // Start recording once call is accepted
        try { await startRecording() } catch {}
      })
      session.on("failed", async (e: any) => {
        stopRingback()
        setStatus("Call Failed")
        setError(e?.cause || "Call failed")
        clearTimer()
        await stopRecordingAndUpload({ disposition: "failed" })
      })
      session.on("ended", async () => {
        stopRingback()
        setStatus("Call Ended")
        clearTimer()
        await stopRecordingAndUpload({ disposition: "completed" })
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

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!ext || !pwd) throw new Error("Enter extension and password")
      await startUA(ext, pwd)
      try {
        localStorage.setItem("sipExt", ext)
        localStorage.setItem("sipPwd", pwd)
      } catch {}
      setStep("dialer")
    } catch (err: any) {
      setError(err?.message || "Failed to initialize SIP")
    }
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
      await ensureAudioCtx()
      uaRef.current.call(numberToSipUri(number, ext), options)
      localStorage.setItem("lastDialedNumber", number)
    } catch (e: any) {
      setError(e?.message || "Call start error")
    }
  }

  const hangup = async () => {
    try { sessionRef.current?.terminate() } catch {}
    stopRingback()
    await stopRecordingAndUpload({ disposition: "hangup" })
  }

  const logout = () => {
    try {
      localStorage.removeItem("sipExt")
      localStorage.removeItem("sipPwd")
    } catch {}
    setError(null)
    setStatus("Idle")
    setNumber("")
    setIsMuted(false)
    teardownUA()
    setStep("login")
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

  async function stopRecordingAndUpload(extra: { disposition: string }) {
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
    const start_time = new Date((sessionRef.current?._created || Date.now())) // fallback
    const answer_time = callStartRef.current ? new Date(callStartRef.current) : null
    const end_time = now
    const call_duration = answer_time ? Math.max(0, Math.floor((end_time.getTime() - answer_time.getTime()) / 1000)) : null

    const form = new FormData()
    form.append('campaign_name', '')
    form.append('useremail', '')
    form.append('username', '')
    form.append('unique_id', String(sessionRef.current?.id || cryptoRandom()))
    form.append('start_time', start_time.toISOString())
    if (answer_time) form.append('answer_time', answer_time.toISOString())
    form.append('end_time', end_time.toISOString())
    if (call_duration !== null) form.append('call_duration', String(call_duration))
    form.append('billed_duration', call_duration !== null ? String(call_duration) : '')
    form.append('source', 'web')
    form.append('extension', ext)
    form.append('region', '')
    form.append('charges', '')
    form.append('direction', 'outbound')
    form.append('destination', number)
    form.append('disposition', extra.disposition)
    form.append('platform', 'web')
    form.append('call_type', 'manual')
    form.append('remarks', '')
    form.append('prospect_name', '')
    form.append('prospect_email', '')
    form.append('prospect_company', '')
    form.append('job_title', '')
    form.append('job_level', '')
    form.append('data_source_type', '')

    if (blob) form.append('recording', blob, `call_${Date.now()}.webm`)

    try {
      await fetch(`${API_BASE}/calls`, { method: 'POST', body: form })
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Script src="/js/jssip.min.js" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manual Dialer</h1>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded ${status.includes("Registered") ? "bg-emerald-100 text-emerald-800" : status.includes("Connected") ? "bg-blue-100 text-blue-800" : status.includes("Call") ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}>{status}</span>
          {step === "dialer" && (
            <button onClick={logout} className="h-8 px-3 rounded border bg-white text-sm">Logout</button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      {step === "login" && (
        <form onSubmit={onLogin} className="max-w-md rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <label className="block text-sm mb-1">Extension</label>
            <input className="w-full border rounded px-3 py-2" value={ext} onChange={(e) => setExt(e.target.value)} placeholder="1001" autoFocus />
          </div>
          <div className="mb-5">
            <label className="block text-sm mb-1">SIP Password</label>
            <input type="password" className="w-full border rounded px-3 py-2" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••" />
          </div>
          <button type="submit" disabled={!isLoaded} className="w-full h-10 rounded bg-blue-600 text-white disabled:opacity-50">{isLoaded ? "Login" : "Loading JsSIP..."}</button>
        </form>
      )}

      {step === "dialer" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <input className="flex-1 border rounded px-3 py-3 text-lg tracking-widest" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Enter number" />
              <button onClick={backspace} className="h-10 px-3 rounded border bg-gray-50">⌫</button>
              <button onClick={() => setNumber("")} className="h-10 px-3 rounded border bg-gray-50">Clear</button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) => (
                <button key={d} onClick={() => onDigit(d)} className="h-14 rounded-lg border bg-white text-lg font-medium hover:bg-gray-50 active:scale-[0.99]">
                  {d}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button onClick={placeCall} className="flex items-center gap-2 h-11 px-4 rounded-lg bg-green-600 text-white disabled:opacity-50" disabled={!number || !uaRef.current || !status.includes("Registered") || status.startsWith("In Call") }>
                <Phone className="h-4 w-4" /> Call
              </button>
              <button onClick={hangup} className="flex items-center gap-2 h-11 px-4 rounded-lg bg-red-600 text-white" disabled={!sessionRef.current}>
                <PhoneOff className="h-4 w-4" /> Hang Up
              </button>
              <button onClick={toggleMute} className="flex items-center gap-2 h-11 px-4 rounded-lg border bg-white" disabled={!sessionRef.current}>
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {isMuted ? "Unmute" : "Mute"}
              </button>
            </div>

            <audio ref={remoteAudioRef} autoPlay playsInline controls className="mt-4 w-full" />
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">Call Info</div>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between"><span>Status</span><span>{status}</span></div>
              <div className="flex justify-between"><span>Extension</span><span>{ext || "-"}</span></div>
              <div className="flex justify-between"><span>Last dialed</span><span>{typeof window !== "undefined" ? (localStorage.getItem("lastDialedNumber") || "-") : "-"}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function numberToSipUri(num: string, _ext: string) {
  if (num.startsWith("sip:")) return num
  return num
}
