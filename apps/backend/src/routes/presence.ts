import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'
import { recordHeartbeat, setStatus, startBreak, endBreak } from '../services/presenceService'
import { db } from '../db/prisma'

const router = Router()

// Heartbeat: agents call every ~30s
if (env.USE_AUTH_COOKIE) {
  router.post('/heartbeat', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), csrfProtect, async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      await recordHeartbeat(userId, req.body?.client_state, req.ip)
      res.json({ success: true })
    } catch (e) { next(e) }
  })
} else {
  router.post('/heartbeat', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      await recordHeartbeat(userId, req.body?.client_state, req.ip)
      res.json({ success: true })
    } catch (e) { next(e) }
  })
}

// Status change: AVAILABLE, ON_CALL, IDLE, BREAK (manual)
if (env.USE_AUTH_COOKIE) {
  router.post('/status', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), csrfProtect, async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      const to = String(req.body?.status || '').toUpperCase()
      const allowed = new Set(['OFFLINE','AVAILABLE','ON_CALL','IDLE','BREAK'])
      if (!allowed.has(to)) return res.status(400).json({ success: false, message: 'Invalid status' })
      const result = await setStatus(userId, to as any, req.body?.meta || null)
      res.json({ success: true, status: result.status })
    } catch (e) { next(e) }
  })
} else {
  router.post('/status', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      const to = String(req.body?.status || '').toUpperCase()
      const allowed = new Set(['OFFLINE','AVAILABLE','ON_CALL','IDLE','BREAK'])
      if (!allowed.has(to)) return res.status(400).json({ success: false, message: 'Invalid status' })
      const result = await setStatus(userId, to as any, req.body?.meta || null)
      res.json({ success: true, status: result.status })
    } catch (e) { next(e) }
  })
}

// Break start
if (env.USE_AUTH_COOKIE) {
  router.post('/break/start', requireAuth, requireRoles(['agent','manager','superadmin']), csrfProtect, async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      const br = await startBreak(userId, req.body?.break_reason_id ?? null)
      res.json({ success: true, breakId: Number(br.id) })
    } catch (e) { next(e) }
  })
} else {
  router.post('/break/start', requireAuth, requireRoles(['agent','manager','superadmin']), async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      const br = await startBreak(userId, req.body?.break_reason_id ?? null)
      res.json({ success: true, breakId: Number(br.id) })
    } catch (e) { next(e) }
  })
}

// Break end
if (env.USE_AUTH_COOKIE) {
  router.post('/break/end', requireAuth, requireRoles(['agent','manager','superadmin']), csrfProtect, async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      await endBreak(userId)
      res.json({ success: true })
    } catch (e) { next(e) }
  })
} else {
  router.post('/break/end', requireAuth, requireRoles(['agent','manager','superadmin']), async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
      await endBreak(userId)
      res.json({ success: true })
    } catch (e) { next(e) }
  })
}

export default router

// Manager endpoints: presence summaries
router.get('/break-reasons', requireAuth, requireRoles(['agent','manager','superadmin']), async (_req: any, res: any, next: any) => {
  try {
    const items: any[] = await (db as any).break_reasons.findMany({ orderBy: { label: 'asc' } })
    const filtered = (items || []).filter((r: any) => r.active === null || r.active === undefined || r.active === true)
    res.json({ success: true, items: filtered.map((r: any) => ({ id: Number(r.id), code: r.code, label: r.label })) })
  } catch (e) { next(e) }
})

// Current user's presence summary for today
router.get('/me/summary', requireAuth, requireRoles(['agent','manager','superadmin']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const now = new Date()

    // Fetch sessions that overlap today
    const sessions: any[] = await (db as any).agent_sessions.findMany({
      where: {
        user_id: userId,
        OR: [
          { login_at: { gte: todayStart } },
          { logout_at: { gte: todayStart } },
        ],
      },
      orderBy: { login_at: 'asc' },
    })

    let totalOnlineSeconds = 0
    for (const s of sessions) {
      const start = new Date(Math.max(new Date(s.login_at).getTime(), todayStart.getTime()))
      const end = new Date(Math.min(new Date(s.logout_at ?? now).getTime(), now.getTime()))
      const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
      totalOnlineSeconds += diff
    }

    return res.json({ success: true, totalOnlineSeconds })
  } catch (e) { next(e) }
})

// Return current presence status and since timestamp for the authenticated agent
router.get('/me', requireAuth, requireRoles(['agent','manager','superadmin']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
    const session = await (db as any).agent_sessions.findFirst({ where: { user_id: userId, is_active: true }, orderBy: { id: 'desc' } })
    if (!session) return res.json({ success: true, status: 'OFFLINE', since: null, sessionId: null })
    const last = await (db as any).agent_presence_events.findFirst({ where: { session_id: session.id, to_status: { not: null } }, orderBy: { ts: 'desc' } })
    const status = (last?.to_status || session.initial_status || 'AVAILABLE')
    const since = (last?.ts || session.login_at)
    return res.json({ success: true, status, since, sessionId: Number(session.id) })
  } catch (e) { next(e) }
})

router.get('/manager/agents', requireAuth, requireRoles(['manager', 'superadmin']), async (_req: any, res: any, next: any) => {
  try {
    // Get all users with role agent (and optionally managers if needed)
    const users: any[] = await (db as any).users.findMany({ where: { role: { in: ['agent', 'Agent'] as any } }, select: { id: true, username: true, usermail: true } })

    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const now = new Date()

    const results = [] as any[]
    for (const u of users) {
      const active = await (db as any).agent_sessions.findFirst({ where: { user_id: u.id, is_active: true }, orderBy: { id: 'desc' } })
      let status = 'OFFLINE'
      let firstLogin: Date | null = null
      let lastLogout: Date | null = null
      let durationSeconds = 0

      // First login and last logout today
      const firstToday = await (db as any).agent_sessions.findFirst({ where: { user_id: u.id, login_at: { gte: todayStart } }, orderBy: { login_at: 'asc' } })
      const lastTodayLogout = await (db as any).agent_sessions.findFirst({ where: { user_id: u.id, logout_at: { not: null, gte: todayStart } }, orderBy: { logout_at: 'desc' } })
      firstLogin = firstToday?.login_at || null
      lastLogout = lastTodayLogout?.logout_at || null

      if (active) {
        // Determine current status from last event
        const lastEv = await (db as any).agent_presence_events.findFirst({ where: { session_id: active.id, to_status: { not: null } }, orderBy: { ts: 'desc' } })
        status = (lastEv?.to_status || active.initial_status || 'AVAILABLE')
        durationSeconds = Math.max(0, Math.floor((now.getTime() - new Date(active.login_at).getTime()) / 1000))
      }

      results.push({
        userId: u.id,
        name: u.username || u.usermail || `User ${u.id}`,
        status,
        firstLogin,
        lastLogout,
        durationSeconds,
      })
    }

    res.json({ success: true, items: results })
  } catch (e) {
    next(e)
  }
})
