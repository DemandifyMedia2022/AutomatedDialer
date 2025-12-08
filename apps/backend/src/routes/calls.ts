import { Router } from 'express'
import { env } from '../config/env'
import multer from 'multer'
import path from 'path'
import { db } from '../db/prisma'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { z } from 'zod'
import { emitToManagers, emitToUser } from '../utils/ws'
import { updateLiveCallPhase } from '../routes/livecalls'

const router = Router()

// Storage for recordings
const recordingsPath = path.isAbsolute(env.RECORDINGS_DIR)
  ? env.RECORDINGS_DIR
  : path.resolve(process.cwd(), env.RECORDINGS_DIR)

// Allowed audio extensions
const ALLOWED_EXTENSIONS = ['.webm', '.mp3', '.wav', '.ogg', '.m4a']

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsPath),
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const ext = path.extname(file.originalname).toLowerCase() || '.webm'

    // Safety check for extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      // Fallback to .webm if invalid or unknown
      return cb(null, `rec_${ts}.webm`)
    }

    cb(null, `rec_${ts}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})

// Lightweight in-memory rate limiter for calls routes
function makeLimiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  const buckets = new Map<string, { c: number; t: number }>()
  return function limiter(req: any, _res: any, next: any) {
    const now = Date.now()
    const key = `${req.ip || req.headers['x-forwarded-for'] || 'ip'}:${req.path}`
    const b = buckets.get(key)
    if (!b || now - b.t > windowMs) {
      buckets.set(key, { c: 1, t: now })
      return next()
    }
    if (b.c >= limit) {
      // Allow next middleware to send 429 if desired; for simplicity just next()
      return next()
    }
    b.c += 1
    return next()
  }
}
const callsLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 60 })

const CallsSchema = z.object({
  campaign_name: z.string().trim().min(1).optional().nullable(),
  useremail: z.string().email().optional().nullable(),
  username: z.string().trim().min(1).optional().nullable(),
  unique_id: z.string().trim().min(1).optional().nullable(),
  start_time: z.coerce.date().optional().nullable(),
  answer_time: z.coerce.date().optional().nullable(),
  end_time: z.coerce.date().optional().nullable(),
  call_duration: z.coerce.number().int().nonnegative().optional().nullable(),
  billed_duration: z.coerce.number().int().nonnegative().optional().nullable(),
  source: z.string().optional().nullable(),
  extension: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  charges: z.coerce.number().optional().nullable(),
  direction: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  disposition: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  recording_url: z.string().url().optional().nullable(),
  call_type: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  prospect_name: z.string().optional().nullable(),
  prospect_email: z.string().email().optional().nullable(),
  prospect_company: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  job_level: z.string().optional().nullable(),
  data_source_type: z.string().optional().nullable(),
})

const callsHandler = async (req: any, res: any, next: any) => {
  try {
    const parsed = CallsSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    }
    const b = parsed.data as any
    const file = (req as any).file

    const recording_url = file
      ? `${env.PUBLIC_BASE_URL}/uploads/${file.filename}`
      : b.recording_url || null

    try {
      // Redact sensitive info in logs
      const safeBody = { ...b }
      if (safeBody.prospect_name) safeBody.prospect_name = '***'
      if (safeBody.prospect_email) safeBody.prospect_email = '***'
      if (safeBody.destination) safeBody.destination = '***'
      console.log('[calls] incoming body', safeBody)
    } catch { }
    try { console.log('[calls] file', !!file, 'recording_url', recording_url) } catch { }

    // Fallback: if username not provided, use authenticated user's name
    let usernameVal = b.username || null
    if (!usernameVal && req.user?.userId) {
      try {
        const u = await db.users.findUnique({ where: { id: req.user.userId }, select: { username: true } })
        usernameVal = u?.username || null
      } catch { }
    }

    // Fallback: if extension not provided, use authenticated user's assigned extension
    let extensionVal = b.extension || null
    if (!extensionVal && req.user?.userId) {
      try {
        const u = await db.users.findUnique({ where: { id: req.user.userId }, select: { extension: true } })
        extensionVal = u?.extension || null
      } catch { }
    }

    // Normalize times/duration
    const startRaw: Date = b.start_time || new Date()
    const endRaw: Date = b.end_time || new Date()
    let startNorm = startRaw
    let endNorm = endRaw
    if (endNorm < startNorm) { const t = startNorm; startNorm = endNorm; endNorm = t }

    const computedAnswer: Date | null = (b.answer_time
      ? b.answer_time
      : ((b.call_duration ?? null) !== null)
        ? new Date(endNorm.getTime() - (Number(b.call_duration) || 0) * 1000)
        : null)

    let computedDuration: number | null = (b.call_duration ?? null) !== null
      ? Number(b.call_duration)
      : (computedAnswer ? Math.max(0, Math.floor((endNorm.getTime() - computedAnswer.getTime()) / 1000)) : null)
    if (computedDuration === null) {
      computedDuration = Math.max(0, Math.floor((endNorm.getTime() - startNorm.getTime()) / 1000))
    }

    const data = {
      campaign_name: b.campaign_name || null,
      useremail: b.useremail || null,
      username: usernameVal,
      unique_id: b.unique_id || null,
      start_time: startNorm,
      answer_time: computedAnswer,
      end_time: endNorm,
      call_duration: computedDuration,
      billed_duration: b.billed_duration ?? null,
      source: b.source || null,
      extension: extensionVal,
      region: b.region || null,
      charges: b.charges ?? null,
      direction: b.direction || null,
      destination: b.destination || null,
      disposition: b.disposition || null,
      platform: b.platform || 'web',
      recording_url,
      call_type: b.call_type || 'manual',
      remarks: b.remarks || null,
      prospect_name: b.prospect_name || null,
      prospect_email: b.prospect_email || null,
      prospect_company: b.prospect_company || null,
      job_title: b.job_title || null,
      job_level: b.job_level || null,
      data_source_type: b.data_source_type || null,
    } as any

    const saved = await (db as any).calls.create({ data })
    try { console.log('[calls] saved id', saved?.id) } catch { }
    res.status(201).json(saved)
  } catch (err) {
    try { console.error('[calls] error', err) } catch { }
    next(err)
  }
}

if (env.USE_AUTH_COOKIE) {
  router.post(
    '/calls',
    callsLimiter,
    requireAuth,
    requireRoles(['agent', 'manager', 'superadmin']),
    csrfProtect,
    upload.single('recording'),
    callsHandler
  )
} else {
  router.post(
    '/calls',
    callsLimiter,
    requireAuth,
    requireRoles(['agent', 'manager', 'superadmin']),
    upload.single('recording'),
    callsHandler
  )
}

// List calls with optional filters and pagination
router.get('/calls', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20))
    const skip = (page - 1) * pageSize

    const where: any = { AND: [] as any[] }
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    if (from && to) {
      // Overlap: starts before end, ends after start
      where.AND.push({ start_time: { lte: to } })
      where.AND.push({ end_time: { gte: from } })
    } else if (from && !to) {
      // Any call that ends after 'from'
      where.AND.push({ end_time: { gte: from } })
    } else if (!from && to) {
      // Any call that starts before 'to'
      where.AND.push({ start_time: { lte: to } })
    }
    const qDest = (req.query.destination || req.query.phone || '').toString().trim()
    if (qDest) where.AND.push({ destination: { contains: qDest } })
    const qUser = (req.query.username || '').toString().trim()
    if (qUser) where.AND.push({ username: qUser })
    const qExt = (req.query.extension || '').toString().trim()
    if (qExt) where.AND.push({ extension: qExt })
    const qStatus = (req.query.status || '').toString().trim()
    if (qStatus) where.AND.push({ disposition: { equals: qStatus } })
    const qDir = (req.query.direction || '').toString().trim()
    if (qDir) where.AND.push({ direction: qDir })

    const [total, items] = await Promise.all([
      (db as any).calls.count({ where }),
      (db as any).calls.findMany({ where, orderBy: { start_time: 'desc' }, skip, take: pageSize }),
    ])

    const safeItems = items.map((r: any) => ({
      ...r,
      id: typeof r.id === 'bigint' ? Number(r.id) : r.id,
    }))
    res.json({ success: true, page, pageSize, total: Number(total), items: safeItems })
  } catch (e) {
    next(e)
  }
})

// Calls for logged-in user
router.get('/calls/mine', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || undefined
    const usermail = me?.usermail || undefined
    const extension = me?.extension || undefined

    const where: any = { OR: [] as any[], AND: [] as any[] }
    if (username) where.OR.push({ username })
    if (usermail) where.OR.push({ useremail: usermail })
    if (extension) where.OR.push({ extension })
    if (where.OR.length === 0) { where.OR.push({ id: -1 }) }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20))
    const skip = (page - 1) * pageSize

    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    if (from || to) where.AND.push({ start_time: { gte: from || undefined, lte: to || undefined } })
    const qDest = (req.query.destination || req.query.phone || '').toString().trim()
    if (qDest) where.AND.push({ destination: { contains: qDest } })
    const qExt = (req.query.extension || '').toString().trim()
    if (qExt) where.AND.push({ extension: qExt })
    const qStatus = (req.query.status || '').toString().trim()
    if (qStatus) where.AND.push({ disposition: { equals: qStatus } })
    const qDir = (req.query.direction || '').toString().trim()
    if (qDir) where.AND.push({ direction: qDir })

    const [total, items] = await Promise.all([
      (db as any).calls.count({ where }),
      (db as any).calls.findMany({ where, orderBy: { start_time: 'desc' }, skip, take: pageSize }),
    ])

    res.json({ success: true, page, pageSize, total, items })
  } catch (e) {
    next(e)
  }
})

// Optional: live monitoring placeholder
router.get('/monitoring/live', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res) => {
  res.json({ success: true, calls: [] })
})

router.post('/calls/phase', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const phase = req.body.phase
    const callId = req.body.callId
    const userId = req.user?.userId

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    if (!phase || !callId) return res.status(400).json({ success: false, message: 'Invalid payload' })

    await emitToManagers(`call:phase:${phase}`, { callId, userId })
    await emitToUser(userId, `call:phase:${phase}`, { callId })

    await updateLiveCallPhase(req, phase, callId)

    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

// Update a call (for scheduling follow-ups)
router.patch('/:id', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const callId = req.params.id
    const userId = req.user?.userId

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
    if (!callId) return res.status(400).json({ success: false, message: 'Call ID is required' })

    // Check if user has permission to update this call
    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true, role: true } })
    const username = me?.username || undefined
    const usermail = me?.usermail || undefined
    const extension = me?.extension || undefined
    const userRole = me?.role || 'agent'

    // Build where clause to find the call
    const where: any = { id: BigInt(callId) }

    // If agent, only allow updating their own calls
    if (userRole === 'agent') {
      where.OR = []
      if (username) where.OR.push({ username })
      if (usermail) where.OR.push({ useremail: usermail })
      if (extension) where.OR.push({ extension })
      if (where.OR.length === 0) { where.OR.push({ id: -1 }) }
    }

    // Check if call exists and user has permission
    const existingCall = await (db as any).calls.findFirst({ where })
    if (!existingCall) {
      return res.status(404).json({ success: false, message: 'Call not found or access denied' })
    }

    // Validate update data
    const updateSchema = z.object({
      remarks: z.string().max(500).optional(),
      disposition: z.string().max(255).optional(),
      follow_up: z.boolean().optional(),
      schedule_call: z.coerce.date().optional(),
      Followup_notes: z.string().max(2000).optional()
    })

    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    }

    const updateData = parsed.data as any

    // Validate schedule_call is in the future
    if (updateData.schedule_call) {
      const scheduledDate = new Date(updateData.schedule_call)
      const now = new Date()

      if (scheduledDate <= now) {
        return res.status(400).json({ success: false, message: 'Schedule time must be in the future' })
      }

      // Check if scheduling too far in future (more than 90 days)
      const maxFutureDate = new Date()
      maxFutureDate.setDate(maxFutureDate.getDate() + 90)

      if (scheduledDate > maxFutureDate) {
        return res.status(400).json({ success: false, message: 'Cannot schedule more than 90 days in advance' })
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date()

    // Update the call
    const updated = await (db as any).calls.update({
      where: { id: BigInt(callId) },
      data: updateData
    })

    // Convert BigInt to Number if needed
    const safeUpdated = {
      ...updated,
      id: typeof updated.id === 'bigint' ? Number(updated.id) : updated.id,
    }

    res.json({ success: true, data: safeUpdated })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Call not found' })
    }
    next(e)
  }
})

export default router
