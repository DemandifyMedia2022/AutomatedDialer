export const USE_AUTH_COOKIE = (process.env.NEXT_PUBLIC_USE_AUTH_COOKIE || 'true').toLowerCase() === 'true'
export const AUTH_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'ad_auth'
export const TOKEN_KEY = 'ad_token'

export function getToken(): string | null {
  if (USE_AUTH_COOKIE) return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  if (USE_AUTH_COOKIE) return
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function getCsrfTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('csrf_token='))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

import { API_BASE } from './api'

export async function logout(): Promise<void> {
  if (USE_AUTH_COOKIE) {
    const csrf = getCsrfTokenFromCookies()
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
        credentials: 'include',
      })
    } catch {}
  } else {
    clearToken()
  }
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
}
