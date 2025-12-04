import { NextFunction, Request, Response } from 'express'
import { verifyJwt, JwtPayload } from '../utils/jwt'
import { env } from '../config/env'
import { db } from '../db/prisma'

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!cookieHeader) return out
  cookieHeader.split(';').forEach((c) => {
    const [k, ...rest] = c.trim().split('=')
    out[k] = decodeURIComponent(rest.join('='))
  })
  return out
}

export type AuthUser = JwtPayload

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined

    const auth = req.header('authorization') || req.header('Authorization')
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      token = auth.slice(7)
    }

    if (!token && env.USE_AUTH_COOKIE) {
      const cookies = parseCookies(req.headers.cookie)
      token = cookies[env.AUTH_COOKIE_NAME]
    }

    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const payload = verifyJwt(token)
    if (!payload) return res.status(401).json({ success: false, message: 'Invalid token' })

    // Check if user is still active
    db.users.findUnique({ where: { id: payload.userId }, select: { status: true } })
      .then(user => {
        if (!user || user.status !== 'active') {
          return res.status(401).json({ success: false, message: 'Account is inactive' })
        }
        req.user = payload
        next()
      })
      .catch(() => {
        return res.status(401).json({ success: false, message: 'Authentication failed' })
      })
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
}

export function requireRoles(roles: Array<'agent' | 'manager' | 'qa' | 'superadmin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req.user?.role || '').toLowerCase()
    const allowed = new Set(roles)
    if (!role || !allowed.has(role as any)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    next()
  }
}
