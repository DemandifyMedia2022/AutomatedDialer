import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/hooks/useAuth'

type Status = 'OFFLINE'|'AVAILABLE'|'ON_CALL'|'IDLE'|'BREAK'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.split(';').map(v=>v.trim().split('='))
  for (const [k, ...v] of m) if (k === name) return decodeURIComponent(v.join('='))
  return null
}

export function useAgentPresence() {
  const { user, loading: authLoading } = useAuth()
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const [status, setStatusState] = useState<Status>('OFFLINE')
  const [breakReasons, setBreakReasons] = useState<Array<{id:number; code:string; label:string}>>([])
  const [totalTodaySeconds, setTotalTodaySeconds] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const hbRef = useRef<any>(null)
  const lastChangeRef = useRef<number>(Date.now())
  const socketRef = useRef<Socket | null>(null)
  const pollRef = useRef<any>(null)

  // Don't make API calls if user is not authenticated
  if (!user && !authLoading) {
    return { 
      status: 'OFFLINE', 
      setStatus: async () => {}, 
      startBreak: async () => {}, 
      endBreak: async () => {}, 
      breakReasons: [], 
      loading: false, 
      secondsSinceChange: 0, 
      totalTodaySeconds: 0, 
      reloadBreaks: async () => {} 
    }
  }

  const credentials: RequestCredentials = 'include'

  const headers = useMemo(() => {
    const h: Record<string,string> = { 'Content-Type': 'application/json' }
    const c = getCookie('csrf_token')
    if (c) h['X-CSRF-Token'] = c
    return h
  }, [])

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presence/me`, { credentials })
      if (!res.ok) return
      const data = await res.json().catch(()=>null as any)
      if (!data) return
      if (data.status) setStatusState(data.status as Status)
      if (data.since) {
        const t = new Date(data.since).getTime()
        if (!isNaN(t)) lastChangeRef.current = t
      }
    } catch {}
  }, [API_BASE, credentials])

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presence/me/summary`, { credentials })
      if (!res.ok) return
      const data = await res.json().catch(()=>null as any)
      if (data && typeof data.totalOnlineSeconds === 'number') setTotalTodaySeconds(data.totalOnlineSeconds)
    } catch {}
  }, [API_BASE, credentials])

  const heartbeat = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/presence/heartbeat`, { method: 'POST', credentials, headers, body: JSON.stringify({}) })
    } catch {}
  }, [API_BASE, credentials, headers])

  const setStatus = useCallback(async (to: Status, meta?: any) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/presence/status`, { method: 'POST', credentials, headers, body: JSON.stringify({ status: to, meta: meta || null }) })
      if (res.ok) { setStatusState(to); lastChangeRef.current = Date.now(); try { await loadMe() } catch {} }
    } finally { setLoading(false) }
  }, [API_BASE, credentials, headers, loadMe])

  const startBreak = useCallback(async (break_reason_id?: number|null) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/presence/break/start`, { method: 'POST', credentials, headers, body: JSON.stringify({ break_reason_id: break_reason_id ?? null }) })
      if (res.ok) { setStatusState('BREAK'); lastChangeRef.current = Date.now(); try { await loadMe() } catch {} }
    } finally { setLoading(false) }
  }, [API_BASE, credentials, headers, loadMe])

  const endBreak = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/presence/break/end`, { method: 'POST', credentials, headers })
      if (res.ok) { setStatusState('AVAILABLE'); lastChangeRef.current = Date.now(); try { await loadMe() } catch {} }
    } finally { setLoading(false) }
  }, [API_BASE, credentials, headers, loadMe])

  const loadBreaks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presence/break-reasons`, { credentials })
      if (!res.ok) return
      const data = await res.json().catch(()=>({items:[]}))
      setBreakReasons(Array.isArray(data?.items) ? data.items : [])
    } catch {}
  }, [API_BASE, credentials])

  

  useEffect(() => {
    if (user) {
      loadBreaks(); loadMe(); loadSummary()
    }
  }, [user, loadBreaks, loadMe, loadSummary])

  useEffect(() => {
    if (user) {
      heartbeat()
      hbRef.current = setInterval(heartbeat, 30000)
      const onVis = () => { if (document.visibilityState === 'visible') heartbeat() }
      document.addEventListener('visibilitychange', onVis)
      return () => { if (hbRef.current) clearInterval(hbRef.current); document.removeEventListener('visibilitychange', onVis) }
    }
  }, [heartbeat, user])

  useEffect(() => {
    if (user) {
      try {
        const s = io(API_BASE, { withCredentials: true, transports: ['websocket'] })
        socketRef.current = s
        s.on('connect', () => {})
        s.on('presence:update', (p: any) => {
          if (p?.status) setStatusState(p.status as Status)
          if (p?.since) {
            const t = new Date(p.since).getTime(); if (!isNaN(t)) lastChangeRef.current = t
          } else {
            lastChangeRef.current = Date.now()
          }
        })
        s.on('break:started', () => { setStatusState('BREAK'); lastChangeRef.current = Date.now() })
        s.on('break:ended', () => { setStatusState('AVAILABLE'); lastChangeRef.current = Date.now() })
        s.on('session:closed', () => { setStatusState('OFFLINE'); lastChangeRef.current = Date.now() })
        return () => { try { s.disconnect() } catch {} }
      } catch { return }
    }
  }, [API_BASE, user])

  // Fallback: periodic polling to auto-refresh UI even if WS is unavailable
  useEffect(() => {
    if (user) {
      const doPoll = async () => { try { await loadMe(); await loadSummary() } catch {} }
      doPoll()
      pollRef.current = setInterval(doPoll, 5000)
      return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
  }, [loadMe, loadSummary, user])

  const secondsSinceChange = Math.max(0, Math.floor((Date.now() - lastChangeRef.current) / 1000))

  return { status, setStatus, startBreak, endBreak, breakReasons, loading, secondsSinceChange, totalTodaySeconds, reloadBreaks: loadBreaks }
}
