import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const router = Router()

// Lightweight in-memory rate limiter
function makeLimiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  const buckets = new Map<string, { c: number; t: number }>()
  return function limiter(req: any, res: any, next: any) {
    const now = Date.now()
    const key = `${req.ip || req.headers['x-forwarded-for'] || 'ip'}:${req.path}:${req.method}`
    const b = buckets.get(key)
    if (!b || now - b.t > windowMs) {
      buckets.set(key, { c: 1, t: now })
      return next()
    }
    if (b.c >= limit) {
      return res.status(429).json({ success: false, message: 'Too many requests' })
    }
    b.c += 1
    return next()
  }
}

const staffLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 30 })

// Manager and Superadmin can view staff lists
router.use(requireAuth, requireRoles(['manager', 'superadmin']), staffLimiter)

// List agents with minimal fields for admin/manager views
router.get('/agents', async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = { role: 'agent' }
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const users = await db.users.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: { id: true, username: true, status: true, extension: true, usermail: true, unique_user_id: true, organization_id: true },
    })
    res.json({ success: true, users })
  } catch (e) {
    next(e)
  }
})

// Create agent — managers and superadmins
const protectIfCookie = env.USE_AUTH_COOKIE ? [csrfProtect] : []

const CreateAgentSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  extension: z.string().trim().min(1),
})

router.post('/agents', ...protectIfCookie, async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    if (!orgId) return res.status(400).json({ success: false, message: 'Manager must belong to an organization' })

    const parsed = CreateAgentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const { username, email, password, extension } = parsed.data

    const exists = await db.users.findFirst({ where: { usermail: email } })
    if (exists) return res.status(409).json({ success: false, message: 'User already exists' })

    // Verify limits (Quotas)
    const org = await db.organizations.findUnique({
      where: { id: orgId },
      include: { _count: { select: { users: true } } }
    })
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' })

    if (org.max_users !== null && (org as any)._count.users >= org.max_users) {
      return res.status(400).json({ success: false, message: `Organization has reached its total user limit of ${org.max_users}` })
    }

    const totalAgents = await db.users.count({ where: { organization_id: orgId, role: 'agent' } })
    if ((org as any).max_agents !== null && totalAgents >= (org as any).max_agents) {
      return res.status(400).json({ success: false, message: `Organization has reached its Agent limit of ${(org as any).max_agents}` })
    }

    // Verify extension exists and has capacity (<10)
    const pool = getPool()
    const [extRows]: any = await pool.query('SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1', [extension])
    if (!extRows || extRows.length === 0) return res.status(400).json({ success: false, message: 'Extension not found' })
    const count = await db.users.count({ where: { extension } })
    if (count >= 10) return res.status(400).json({ success: false, message: 'Extension capacity reached (10)' })

    const hash = await bcrypt.hash(password, 10)
    const user = await db.users.create({
      data: { username, usermail: email, password: hash, role: 'agent', status: 'active', extension, organization_id: orgId },
      select: { id: true, username: true, status: true, extension: true, usermail: true, unique_user_id: true },
    })
    res.status(201).json({ success: true, user })
  } catch (e) {
    next(e)
  }
})

// Extensions with assigned counts — managers and superadmins
router.get('/agents/extensions', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query(`
      SELECT e.extension_id AS extensionId,
             (SELECT COUNT(1) FROM users u WHERE u.extension = e.extension_id) AS assignedCount
      FROM extensions e
      ORDER BY e.extension_id ASC
    `)
    res.json({ success: true, extensions: rows })
  } catch (e) {
    next(e)
  }
})

// Update agent — managers and superadmins
const UpdateAgentSchema = z.object({
  username: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  extension: z.string().trim().optional(), // empty string to unassign
})

router.patch('/agents/:id', ...protectIfCookie, async (req: any, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    // Check if user exists and belongs to the same org (if not super)
    const targetUser = await db.users.findUnique({ where: { id }, select: { organization_id: true } })
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' })
    if (!isSuper && targetUser.organization_id !== orgId) return res.status(403).json({ success: false, message: 'Access denied' })

    const parsed = UpdateAgentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })

    const data: any = {}
    if (parsed.data.username) data.username = parsed.data.username
    if (parsed.data.email) data.usermail = parsed.data.email
    if (parsed.data.status) data.status = parsed.data.status

    if (Object.prototype.hasOwnProperty.call(parsed.data, 'extension')) {
      const ext = (parsed.data.extension ?? '').trim()
      if (ext === '') {
        data.extension = null
      } else {
        const pool = getPool()
        const [extRows]: any = await pool.query('SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1', [ext])
        if (!extRows || extRows.length === 0) return res.status(400).json({ success: false, message: 'Extension not found' })
        const countExcl = await db.users.count({ where: { extension: ext, NOT: { id } } })
        if (countExcl >= 10) return res.status(400).json({ success: false, message: 'Extension capacity reached (10)' })
        data.extension = ext
      }
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ success: false, message: 'No changes provided' })

    const updated = await db.users.update({
      where: { id },
      data,
      select: { id: true, username: true, extension: true, status: true, usermail: true, unique_user_id: true },
    })
    res.json({ success: true, user: updated })
  } catch (e) {
    next(e)
  }
})

// Delete agent — managers and superadmins
router.delete('/agents/:id', ...protectIfCookie, async (req: any, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const user = await db.users.findUnique({ where: { id }, select: { id: true, role: true, organization_id: true } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    if (!isSuper && user.organization_id !== orgId) return res.status(403).json({ success: false, message: 'Access denied' })

    if (user.role !== 'agent') return res.status(403).json({ success: false, message: 'Only agents can be deleted here' })
    await db.users.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

router.get('/agents/call-count', requireAuth, requireRoles(['manager']), async (req: any, res: any, next: any) => {
  try {
    const username = String(req.query.username || '').trim()
    if (!username) return res.status(400).json({ success: false, message: 'username is required' })
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = { username }
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    if (from || to) where.start_time = { gte: from || undefined, lte: to || undefined }
    const total = await (db as any).calls.count({ where })
    return res.json({ success: true, total: Number(total) })
  } catch (e) {
    next(e)
  }
})

export default router