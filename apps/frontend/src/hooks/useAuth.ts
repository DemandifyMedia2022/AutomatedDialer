"use client"

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'
import { USE_AUTH_COOKIE, getToken } from '@/lib/auth'
import type { MeResponse } from '@/types/auth'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse['user'] | null>(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        const headers: Record<string, string> = {}
        if (!USE_AUTH_COOKIE) {
          const t = getToken()
          if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: 'GET',
          headers,
          credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        })
        if (!mounted) return
        if (res.ok) {
          const data = (await res.json()) as MeResponse
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  return { loading, user, role: (user?.role || '').toString().toLowerCase() }
}
