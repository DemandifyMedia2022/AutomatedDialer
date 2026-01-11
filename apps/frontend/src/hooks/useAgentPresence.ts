import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { USE_AUTH_COOKIE, getToken, logout } from '@/lib/auth'
import { API_BASE, SOCKET_IO_URL } from '@/lib/api'

type Status = 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'IDLE' | 'BREAK'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.split(';').map(v => v.trim().split('='))
  for (const [k, ...v] of m) if (k === name) return decodeURIComponent(v.join('='))
  return null
}

export function useAgentPresence() {
  const [status, setStatusState] = useState<Status>('AVAILABLE')
  const [breakReasons, setBreakReasons] = useState<Array<{ id: number; code: string; label: string }>>([])
  const [totalTodaySeconds, setTotalTodaySeconds] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const hbRef = useRef<any>(null)
  const lastChangeRef = useRef<number>(Date.now())
  const socketRef = useRef<Socket | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const localSessionIdRef = useRef<number | null>(null)
  const pollRef = useRef<any>(null)

  const credentials: RequestCredentials = 'include'

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    const c = getCookie('csrf_token')
    if (c) h['X-CSRF-Token'] = c
    return h
  }, [])

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presence/me`, { credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => null as any)
      if (!data) return
      if (data.status) setStatusState(data.status as Status)
      if (data.since) {
        const t = new Date(data.since).getTime()
        if (!isNaN(t)) lastChangeRef.current = t
      }
      if (data.sessionId) {
        // Fallback: If we already had a session and the server now gives us a DIFFERENT ID, 
        // it means we've been kicked out or the session was replaced.
        if (localSessionIdRef.current !== null && data.sessionId !== localSessionIdRef.current) {
          console.warn('[useAgentPresence] Session ID mismatch in poll. Logging out...')
          logout()
          return
        }
        setSessionId(data.sessionId)
        localSessionIdRef.current = data.sessionId
      }
    } catch { }
  }, [API_BASE, credentials])

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presence/me/summary`, { credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => null as any)
      if (data && typeof data.totalOnlineSeconds === 'number') setTotalTodaySeconds(data.totalOnlineSeconds)
    } catch { }
  }, [API_BASE, credentials])

  const heartbeat = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/presence/heartbeat`, { method: 'POST', credentials, headers, body: JSON.stringify({}) })
    } catch { }
  }, [API_BASE, credentials, headers])

  const setStatus = useCallback(async (to: Status, meta?: any) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/presence/status`, { method: 'POST', credentials, headers, body: JSON.stringify({ status: to, meta: meta || null }) })
      if (res.ok) { setStatusState(to); lastChangeRef.current = Date.now(); try { await loadMe() } catch { } }
    } finally { setLoading(false) }
  }, [API_BASE, credentials, headers, loadMe])

  const startBreak = useCallback(async (break_reason_id?: number | null) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/presence/break/start`, { method: 'POST', credentials, headers, body: JSON.stringify({ break_reason_id: break_reason_id ?? null }) })
      if (res.ok) { setStatusState('BREAK'); lastChangeRef.current = Date.now(); try { await loadMe() } catch { } }
    } finally { setLoading(false) }
  }, [API_BASE, credentials, headers, loadMe])

  const endBreak = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/presence/break/end`, { method: 'POST', credentials, headers })
      if (res.ok) { setStatusState('AVAILABLE'); lastChangeRef.current = Date.now(); try { await loadMe() } catch { } }
    } finally { setLoading(false) }
  }, [API_BASE, credentials, headers, loadMe])

  const loadBreaks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/presence/break-reasons`, { credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => ({ items: [] }))
      setBreakReasons(Array.isArray(data?.items) ? data.items : [])
    } catch { }
  }, [API_BASE, credentials])

  useEffect(() => {
    loadBreaks(); loadMe(); loadSummary()
  }, [loadBreaks, loadMe, loadSummary])

  useEffect(() => {
    heartbeat()
    hbRef.current = setInterval(heartbeat, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') heartbeat() }
    document.addEventListener('visibilitychange', onVis)
    return () => { if (hbRef.current) clearInterval(hbRef.current); document.removeEventListener('visibilitychange', onVis) }
  }, [heartbeat])

  useEffect(() => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5

    const connectSocket = () => {
      try {
        const s = io(SOCKET_IO_URL, {
          withCredentials: USE_AUTH_COOKIE,
          transports: ['websocket', 'polling'],
          path: '/socket.io',
          auth: USE_AUTH_COOKIE ? undefined : { token: getToken() || undefined },
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        })

        socketRef.current = s

        s.on('connect', () => {
          reconnectAttempts = 0
        })

        s.on('connect_error', (error) => {
          console.warn('[useAgentPresence] Socket connection error:', error.message)
          reconnectAttempts++
          if (reconnectAttempts >= maxReconnectAttempts) {
            console.warn('[useAgentPresence] Max reconnection attempts reached')
          }
        })

        s.on('disconnect', (reason) => {
          console.warn('[useAgentPresence] Socket disconnected:', reason)
        })

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
        s.on('session:closed', (p: any) => {
          // Only force logout if the closed session ID matches our current session
          if (p?.sessionId && localSessionIdRef.current && p.sessionId === localSessionIdRef.current) {
            console.warn('[useAgentPresence] Session closed by server. Logging out...', p.reason)
            logout()
          }
          setStatusState('OFFLINE')
          lastChangeRef.current = Date.now()
        })

        return s
      } catch (error) {
        console.error('[useAgentPresence] Failed to create socket:', error)
        return null
      }
    }

    const socket = connectSocket()

    return () => {
      try { socket?.disconnect() } catch { }
    }
  }, [API_BASE])

  useEffect(() => {
    const doPoll = async () => { try { await loadMe(); await loadSummary() } catch { } }
    doPoll()
    pollRef.current = setInterval(doPoll, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadMe, loadSummary])

  const secondsSinceChange = Math.max(0, Math.floor((Date.now() - lastChangeRef.current) / 1000))

  return { status, setStatus, startBreak, endBreak, breakReasons, loading, secondsSinceChange, totalTodaySeconds, reloadBreaks: loadBreaks }
}