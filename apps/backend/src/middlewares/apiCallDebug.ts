import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { env } from '../config/env'

// Opt-in middleware to log API requests/responses for call-related endpoints.
// Enable with API_CALL_DEBUG=true
// Correlates each request with x-correlation-id

const DEFAULT_PATTERNS = [
  /^\/calls(\/.*)?$/i,
  /^\/live-calls(\/.*)?$/i,
  /^\/calls\/phase$/i,
  /^\/analytics(\/.*)?$/i,
  /^\/transcription(\/.*)?$/i,
]

function safeJson(v: any) {
  try {
    return JSON.stringify(v)
  } catch {
    return undefined
  }
}

function maskHeaders(headers: Record<string, any>) {
  const hidden = new Set(['authorization', 'cookie', 'set-cookie'])
  const out: Record<string, any> = {}
  for (const k of Object.keys(headers || {})) {
    out[k] = hidden.has(k.toLowerCase()) ? '[redacted]' : headers[k]
  }
  return out
}

function truncate(str: string, max = 4000) {
  if (!str) return str
  return str.length > max ? str.slice(0, max) + ` ...[+${str.length - max}]` : str
}

export function apiCallDebug(patterns: RegExp[] = DEFAULT_PATTERNS) {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!env.API_CALL_DEBUG) return next()

    const path = req.path || req.originalUrl || ''
    const scopeAll = (env.API_CALL_DEBUG_SCOPE || 'calls') === 'all'
    const match = scopeAll ? true : patterns.some((re) => re.test(path))
    if (!match) return next()

    const started = Date.now()
    const existingCid: string = (req.headers['x-correlation-id'] as string) || ''
    const cid: string = existingCid || randomUUID()
    ;(res as any).setHeader('x-correlation-id', cid)

    const reqInfo = {
      cid,
      ts: new Date(started).toISOString(),
      method: req.method,
      path,
      query: req.query,
      ip: (req.ip || (req as any).socket?.remoteAddress || ''),
      headers: maskHeaders(req.headers as any),
      user: (req as any).user ? { id: (req as any).user.userId, role: (req as any).user.role } : null,
    }

    const bodyStr = truncate(safeJson(req.body) || '')
    let sizeOut = 0
    const oldJson = res.json.bind(res)
    const oldSend = res.send.bind(res)

    console.log('[api-call][request]', safeJson({ ...reqInfo, body: bodyStr }))

    ;(res as any).json = (data: any) => {
      const ms = Date.now() - started
      const payloadStr = truncate(safeJson(data) || '')
      sizeOut = Buffer.byteLength(payloadStr)
      console.log('[api-call][response]', safeJson({ cid, status: res.statusCode, ms, size: sizeOut, body: payloadStr }))
      return oldJson(data)
    }

    ;(res as any).send = (body: any) => {
      const ms = Date.now() - started
      let bodyStr = body
      if (typeof body !== 'string') {
        bodyStr = truncate(safeJson(body) || '')
      } else {
        bodyStr = truncate(body)
      }
      sizeOut = Buffer.byteLength(String(bodyStr))
      console.log('[api-call][response]', safeJson({ cid, status: res.statusCode, ms, size: sizeOut, body: bodyStr }))
      return oldSend(body)
    }

    res.on('close', () => {
      // If no json/send occurred (e.g., stream), still log completion
      const ms = Date.now() - started
      console.log('[api-call][done]', safeJson({ cid, status: res.statusCode, ms }))
    })

    next()
  }
}
