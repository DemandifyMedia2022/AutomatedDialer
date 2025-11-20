import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'

const router = Router()

const UpsertQaReviewSchema = z.object({
  overall_score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  tone_score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  compliance_score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  is_lead: z.boolean().optional(),
  lead_quality: z.string().trim().default('none'),
  lead_tags_csv: z.string().trim().default(''),
  disposition_override: z.string().trim().min(1).optional().nullable(),
  comments: z.string().trim().optional().nullable(),
  issues_json: z.string().trim().optional().nullable(),
  agent_user_id: z.coerce.number().int().positive().optional().nullable(),
})

router.get('/reviews/:callId', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const rawId = String(req.params.callId || '').trim()
    const callIdNum = Number(rawId)
    if (!rawId || !Number.isFinite(callIdNum)) {
      return res.status(400).json({ success: false, message: 'Invalid callId' })
    }
    const callId = BigInt(callIdNum)

    const review = await (db as any).qa_call_reviews.findFirst({
      where: { call_id: callId, reviewer_user_id: userId },
    })

    if (!review) return res.status(404).json({ success: false, message: 'Not found' })

    const safeReview = {
      ...review,
      id: typeof review.id === 'bigint' ? Number(review.id) : review.id,
      call_id: typeof review.call_id === 'bigint' ? Number(review.call_id) : review.call_id,
    }

    return res.json({ success: true, review: safeReview })
  } catch (e) {
    next(e)
  }
})

const upsertMiddlewares: any[] = [requireAuth, requireRoles(['qa', 'manager', 'superadmin'])]
if (env.USE_AUTH_COOKIE) upsertMiddlewares.push(csrfProtect)

router.post('/reviews/:callId', ...upsertMiddlewares, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const rawId = String(req.params.callId || '').trim()
    const callIdNum = Number(rawId)
    if (!rawId || !Number.isFinite(callIdNum)) {
      return res.status(400).json({ success: false, message: 'Invalid callId' })
    }
    const callId = BigInt(callIdNum)

    const parsed = UpsertQaReviewSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    }
    const b = parsed.data

    const data: any = {
      call_id: callId,
      reviewer_user_id: userId,
      overall_score: b.overall_score ?? null,
      tone_score: b.tone_score ?? null,
      compliance_score: b.compliance_score ?? null,
      is_lead: b.is_lead ?? false,
      lead_quality: b.lead_quality || 'none',
      lead_tags_csv: b.lead_tags_csv || '',
      disposition_override: b.disposition_override ?? null,
      comments: b.comments ?? null,
      issues_json: b.issues_json ?? null,
      agent_user_id: b.agent_user_id ?? null,
    }

    const existing = await (db as any).qa_call_reviews.findFirst({ where: { call_id: callId, reviewer_user_id: userId } })

    let saved: any
    if (existing) {
      saved = await (db as any).qa_call_reviews.update({ where: { id: existing.id }, data })
    } else {
      saved = await (db as any).qa_call_reviews.create({ data })
    }

    const safe = {
      ...saved,
      id: typeof saved.id === 'bigint' ? Number(saved.id) : saved.id,
      call_id: typeof saved.call_id === 'bigint' ? Number(saved.call_id) : saved.call_id,
    }

    return res.status(existing ? 200 : 201).json({ success: true, review: safe })
  } catch (e) {
    next(e)
  }
})

router.get('/reports/summary', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (_req: any, res: any, next: any) => {
  try {
    const pool = getPool()

    const [[summary]]: any = await pool.query(
      'SELECT COUNT(*) AS totalReviews, AVG(overall_score) AS avgOverall, AVG(tone_score) AS avgTone, AVG(compliance_score) AS avgCompliance FROM qa_call_reviews'
    )

    const [leadRows]: any = await pool.query(
      'SELECT lead_quality, COUNT(*) AS cnt FROM qa_call_reviews WHERE is_lead = 1 GROUP BY lead_quality'
    )

    const leads = (leadRows || []).map((r: any) => ({
      quality: String(r.lead_quality || 'none'),
      count: Number(r.cnt || 0),
    }))

    const payload = {
      totalReviews: Number(summary?.totalReviews || 0),
      avgOverall: summary?.avgOverall != null ? Number(summary.avgOverall) : null,
      avgTone: summary?.avgTone != null ? Number(summary.avgTone) : null,
      avgCompliance: summary?.avgCompliance != null ? Number(summary.avgCompliance) : null,
      leads,
    }

    return res.json({ success: true, data: payload })
  } catch (e) {
    next(e)
  }
})

export default router
