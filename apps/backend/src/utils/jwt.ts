import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export type JwtPayload = {
  userId: number
  role: string | null
  email: string
}

export function signJwt(payload: JwtPayload): string {
  if (!env.JWT_SECRET) throw new Error('Missing JWT_SECRET')
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    if (!env.JWT_SECRET) throw new Error('Missing JWT_SECRET')
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}
