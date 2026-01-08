import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/prisma'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'

const router = Router()

// Zod schema for create
const CreateNoteSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  phone_e164: z.string().trim().default(''),
  call_id: z.coerce.bigint().optional().nullable(),
  tags_csv: z.string().trim().default(''),
  visibility: z.enum(['private', 'team', 'public']).default('private'),
})

// GET /notes - list current user's notes (optionally filter by phone)
router.get('/', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'
    const isManager = req.user?.role === 'manager' || isSuper

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20))
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0)
    const phone = (req.query.phone || '').toString().trim()

    let where: any = {}

    if (isSuper) {
      // no restrictive filter
    } else if (isManager && orgId) {
      where.organization_id = orgId
    } else {
      // Agent
      where.OR = [
        { user_id: userId },
        { AND: [{ organization_id: orgId }, { visibility: { in: ['team', 'public'] } }] }
      ]
    }

    if (phone) {
      if (where.OR) {
        // Wrap existing OR in AND with phone filter
        where = { AND: [{ phone_e164: { contains: phone } }, { OR: where.OR }] }
      } else {
        where.phone_e164 = { contains: phone }
      }
    }

    const [total, items] = await Promise.all([
      (db as any).notes.count({ where }),
      (db as any).notes.findMany({ where, orderBy: { created_at: 'desc' }, skip: offset, take: limit }),
    ])

    res.json({ success: true, total: Number(total), items })
  } catch (e) {
    next(e)
  }
})

// POST /notes - create a note for current user
const createMiddlewares: any[] = [requireAuth, requireRoles(['agent', 'manager', 'superadmin'])]
if (env.USE_AUTH_COOKIE) createMiddlewares.push(csrfProtect)
router.post('/', ...createMiddlewares, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const parsed = CreateNoteSchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const b = parsed.data

    const orgId = req.user?.organizationId
    if (!orgId) return res.status(400).json({ success: false, message: 'User must belong to an organization' })

    const data: any = {
      user_id: userId,
      call_id: (b.call_id as any) ?? null,
      phone_e164: b.phone_e164 || '',
      title: b.title,
      body: b.body,
      tags_csv: b.tags_csv || '',
      visibility: b.visibility,
      organization_id: orgId,
    }

    const saved = await (db as any).notes.create({ data })
    res.status(201).json(saved)
  } catch (e) {
    next(e)
  }
})

// DELETE /notes/:id - delete if owner or manager/superadmin
router.delete('/:id', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const id = parseInt(String(req.params.id), 10)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })

    const note = await (db as any).notes.findUnique({ where: { id } })
    if (!note) return res.status(404).json({ success: false, message: 'Not found' })

    const isManager = req.user?.role === 'manager' || isSuper
    if (!isSuper && orgId && note.organization_id !== orgId) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    if (!isManager && Number(note.user_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await (db as any).notes.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

export default router
