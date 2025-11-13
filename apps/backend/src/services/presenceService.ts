import { db } from '../db/prisma'
import { env } from '../config/env'
import { getIo } from '../utils/ws'

export type AgentStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'IDLE' | 'BREAK'

async function getActiveSession(userId: number) {
  return (db as any).agent_sessions.findFirst({ where: { user_id: userId, is_active: true }, orderBy: { id: 'desc' } })
}

async function getLastStatus(userId: number, sessionId: bigint | number) {
  const ev = await (db as any).agent_presence_events.findFirst({
    where: { user_id: userId, session_id: sessionId as any, to_status: { not: null } },
    orderBy: { ts: 'desc' },
  })
  return (ev?.to_status || 'AVAILABLE') as AgentStatus
}

export async function ensureSession(userId: number, meta?: { ip?: string; userAgent?: string }) {
  let s = await getActiveSession(userId)
  if (!s) {
    s = await (db as any).agent_sessions.create({
      data: {
        user_id: userId,
        login_ip: meta?.ip || null,
        user_agent: meta?.userAgent || null,
        is_active: true,
        initial_status: 'AVAILABLE',
      },
    })
    await (db as any).agent_presence_events.create({
      data: { user_id: userId, session_id: s.id, event_type: 'LOGIN', from_status: 'OFFLINE', to_status: 'AVAILABLE' },
    })
    try { getIo()?.emit('session:opened', { userId, sessionId: Number(s.id) }) } catch {}
  }
  return s
}

export async function recordHeartbeat(userId: number, clientState?: any, ip?: string) {
  const s = await ensureSession(userId, { ip })
  await (db as any).agent_heartbeats.create({ data: { user_id: userId, session_id: s.id, client_state: clientState || null, ip: ip || null } })
  await (db as any).agent_presence_events.create({ data: { user_id: userId, session_id: s.id, event_type: 'HEARTBEAT' } })
  await (db as any).agent_sessions.update({ where: { id: s.id }, data: { last_activity_at: new Date() } })
}

export async function setStatus(userId: number, to: AgentStatus, meta?: any) {
  const s = await ensureSession(userId)
  const from = await getLastStatus(userId, s.id)
  if (from === to) return { session: s, status: to }
  await (db as any).agent_presence_events.create({
    data: { user_id: userId, session_id: s.id, event_type: 'STATUS_CHANGE', from_status: from, to_status: to, meta: meta || null },
  })
  await (db as any).agent_sessions.update({ where: { id: s.id }, data: { last_activity_at: new Date() } })
  try { getIo()?.emit('presence:update', { userId, sessionId: Number(s.id), from, to }) } catch {}
  return { session: s, status: to }
}

export async function startBreak(userId: number, break_reason_id?: number | null) {
  const s = await ensureSession(userId)
  await setStatus(userId, 'BREAK')
  const br = await (db as any).agent_breaks.create({ data: { user_id: userId, session_id: s.id, break_reason_id: break_reason_id || null } })
  await (db as any).agent_presence_events.create({ data: { user_id: userId, session_id: s.id, event_type: 'BREAK_START', to_status: 'BREAK' } })
  try { getIo()?.emit('break:started', { userId, sessionId: Number(s.id), breakId: Number(br.id), reasonId: break_reason_id || null }) } catch {}
  return br
}

export async function endBreak(userId: number) {
  const s = await ensureSession(userId)
  const open = await (db as any).agent_breaks.findFirst({ where: { user_id: userId, session_id: s.id, end_at: null }, orderBy: { id: 'desc' } })
  if (open) {
    await (db as any).agent_breaks.update({ where: { id: open.id }, data: { end_at: new Date(), ended_by: 'user' } })
  }
  await (db as any).agent_presence_events.create({ data: { user_id: userId, session_id: s.id, event_type: 'BREAK_END', from_status: 'BREAK' } })
  await setStatus(userId, 'AVAILABLE')
  try { getIo()?.emit('break:ended', { userId, sessionId: Number(s.id), breakId: open ? Number(open.id) : null }) } catch {}
}

export async function closeActiveSession(userId: number, reason: string) {
  const s = await getActiveSession(userId)
  if (!s) return null
  const lastStatus = await getLastStatus(userId, s.id)
  const updated = await (db as any).agent_sessions.update({ where: { id: s.id }, data: { is_active: false, logout_at: new Date(), ended_by: 'user', end_reason: reason } })
  await (db as any).agent_presence_events.create({ data: { user_id: userId, session_id: s.id, event_type: 'LOGOUT', from_status: lastStatus, to_status: 'OFFLINE', meta: { reason } } })
  try { getIo()?.emit('session:closed', { userId, sessionId: Number(s.id), reason }) } catch {}
  return updated
}

export async function autoIdleAndTimeoutSweep() {
  const now = Date.now()
  const idleMs = env.IDLE_THRESHOLD_SECONDS * 1000
  const timeoutMs = env.SESSION_TIMEOUT_SECONDS * 1000

  const active: any[] = await (db as any).agent_sessions.findMany({ where: { is_active: true } })
  for (const s of active) {
    const last = new Date(s.last_activity_at || s.login_at).getTime()
    const diff = now - last

    if (diff >= timeoutMs) {
      // Auto close session
      await (db as any).agent_sessions.update({ where: { id: s.id }, data: { is_active: false, logout_at: new Date(), ended_by: 'system', end_reason: 'session_timeout' } })
      await (db as any).agent_presence_events.create({ data: { user_id: s.user_id, session_id: s.id, event_type: 'LOGOUT', from_status: 'IDLE', to_status: 'OFFLINE', meta: { reason: 'timeout' } } })
      try { getIo()?.emit('session:closed', { userId: s.user_id, sessionId: Number(s.id), reason: 'timeout' }) } catch {}
      continue
    }

    if (diff >= idleMs) {
      // Only set IDLE if not already IDLE/BREAK/ON_CALL
      const lastStatus = await getLastStatus(s.user_id, s.id)
      if (lastStatus !== 'IDLE' && lastStatus !== 'BREAK' && lastStatus !== 'ON_CALL') {
        await (db as any).agent_presence_events.create({ data: { user_id: s.user_id, session_id: s.id, event_type: 'IDLE_AUTO', from_status: lastStatus, to_status: 'IDLE' } })
        try { getIo()?.emit('presence:update', { userId: s.user_id, sessionId: Number(s.id), from: lastStatus, to: 'IDLE', source: 'auto' }) } catch {}
      }
    }
  }
}

let sweepTimer: NodeJS.Timer | null = null
export function startPresenceScheduler() {
  if (sweepTimer) return
  sweepTimer = setInterval(() => { autoIdleAndTimeoutSweep().catch(() => {}) }, 15 * 1000)
}
