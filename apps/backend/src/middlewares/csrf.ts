import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!cookieHeader) return out
  cookieHeader.split(';').forEach((c) => {
    const [k, ...rest] = c.trim().split('=')
    out[k] = decodeURIComponent(rest.join('='))
  })
  return out
}

const unsafe = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function csrfProtect(req: Request, res: Response, next: NextFunction) {
  if (!env.USE_AUTH_COOKIE) return next()
  if (!unsafe.has(req.method)) return next()

  const header = req.header('x-csrf-token') || req.header('X-CSRF-Token')
  const cookies = parseCookies(req.headers.cookie)
  const cookie = cookies['csrf_token']
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' })
  }
  next()
}
