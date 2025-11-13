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
