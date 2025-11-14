import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const router = Router()

// Manager and Superadmin can view staff lists
router.use(requireAuth, requireRoles(['manager', 'superadmin']))

// List agents with minimal fields for admin/manager views
router.get('/agents', async (_req, res, next) => {
  try {
    const users = await db.users.findMany({
      where: { role: 'agent' },
      orderBy: { created_at: 'desc' },
      select: { id: true, username: true, status: true, extension: true, usermail: true, unique_user_id: true },
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

router.post('/agents', ...protectIfCookie, async (req, res, next) => {
  try {
    const parsed = CreateAgentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const { username, email, password, extension } = parsed.data

    const exists = await db.users.findFirst({ where: { usermail: email } })
    if (exists) return res.status(409).json({ success: false, message: 'User already exists' })

    // Verify extension exists and has capacity (<10)
    const pool = getPool()
    const [extRows]: any = await pool.query('SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1', [extension])
    if (!extRows || extRows.length === 0) return res.status(400).json({ success: false, message: 'Extension not found' })
    const count = await db.users.count({ where: { extension } })
    if (count >= 10) return res.status(400).json({ success: false, message: 'Extension capacity reached (10)' })

    const hash = await bcrypt.hash(password, 10)
    const user = await db.users.create({
      data: { username, usermail: email, password: hash, role: 'agent', status: 'active', extension },
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
  status: z.enum(['active','inactive']).optional(),
  extension: z.string().trim().optional(), // empty string to unassign
})

router.patch('/agents/:id', ...protectIfCookie, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })
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
router.delete('/agents/:id', ...protectIfCookie, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })
    const user = await db.users.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
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
    const where: any = { username }
    if (from || to) where.start_time = { gte: from || undefined, lte: to || undefined }
    const total = await (db as any).calls.count({ where })
    return res.json({ success: true, total: Number(total) })
  } catch (e) {
    next(e)
  }
})

export default router