import { Router } from 'express'
import { db } from '../db/prisma'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

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

const listLimiter = makeLimiter({ windowMs: 10 * 1000, limit: 30 })
const mutateLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 30 })

const CreateUserSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['agent', 'manager', 'superadmin']).default('agent'),
})

const router = Router()

// All routes require superadmin
router.use(requireAuth, requireRoles(['superadmin']))

router.get('/', listLimiter, async (_req, res, next) => {
  try {
    const users = await db.users.findMany({
      orderBy: { created_at: 'desc' },
      select: { id: true, username: true, usermail: true, role: true, status: true, created_at: true, unique_user_id: true },
    })
    res.json({ success: true, users })
  } catch (e) {
    next(e)
  }
})

const protectIfCookie = env.USE_AUTH_COOKIE ? [csrfProtect] : []

router.post('/', ...protectIfCookie, mutateLimiter, async (req, res, next) => {
  try {
    const parsed = CreateUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const { username, email, password, role } = parsed.data

    const existing = await db.users.findFirst({ where: { usermail: email } })
    if (existing) return res.status(409).json({ success: false, message: 'User already exists' })

    const hash = await bcrypt.hash(password, 10)

    // Build initials from username (fallback to first two chars of email local part)
    const initFromName = (name: string) => name.split(/\s+/).filter(Boolean).map(w => w[0] || '').join('')
    const rawInitials = (initFromName(username || '') || (email.split('@')[0] || ''))
    const lettersOnly = rawInitials.replace(/[^A-Za-z]/g, '')
    const initials = (lettersOnly || 'XX').slice(0, 2).toUpperCase()

    // Compute next serial using lexicographic max of zero-padded suffix
    const prefix = `DM-${initials}-`
    const last = await db.users.findFirst({
      where: { unique_user_id: { startsWith: prefix } },
      select: { unique_user_id: true },
      orderBy: { unique_user_id: 'desc' },
    })
    const lastNum = last?.unique_user_id?.match(/^(?:DM-[A-Z]{1,2}-)(\d{4})$/)?.[1]
    let next = (lastNum ? parseInt(lastNum, 10) + 1 : 1)
    let uniqueId = ''
    // Increment until we find a free ID (handles race conditions and gaps)
    for (let attempts = 0; attempts < 1000; attempts++) {
      const candidate = `${prefix}${String(next).padStart(4, '0')}`
      const exists = await db.users.findFirst({ where: { unique_user_id: candidate }, select: { id: true } })
      if (!exists) { uniqueId = candidate; break }
      next += 1
    }
    if (!uniqueId) uniqueId = `${prefix}${String(Date.now()).slice(-4)}`

    const user = await db.users.create({
      data: { username, usermail: email, password: hash, role, status: 'active', unique_user_id: uniqueId },
      select: { id: true, username: true, usermail: true, role: true, status: true, created_at: true, unique_user_id: true },
    })
    res.status(201).json({ success: true, user })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', ...protectIfCookie, mutateLimiter, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })

    const user = await db.users.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    // Prevent deleting last superadmin
    if (user.role === 'superadmin') {
      const countSupers = await db.users.count({ where: { role: 'superadmin' } })
      if (countSupers <= 1) return res.status(403).json({ success: false, message: 'Cannot delete the last superadmin' })
    }

    await db.users.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

export default router
