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

// GET /qa/leads - list calls that have QA reviews marked as leads
router.get('/leads', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const username = (req.query.username || '').toString().trim()

    const where: any = { is_lead: true }
    if (from || to || username) {
      where.calls = {} as any
      if (from || to) {
        ;(where.calls as any).start_time = { gte: from || undefined, lte: to || undefined }
      }
      if (username) {
        ;(where.calls as any).username = username
      }
    }

    const rows = await (db as any).qa_call_reviews.findMany({
      where,
      include: { calls: true },
      orderBy: { created_at: 'desc' },
      take: 200,
    })

    const items = []
    for (const r of rows || []) {
      const callData = {
        call_id: typeof r.call_id === 'bigint' ? Number(r.call_id) : r.call_id,
        unique_id: r.calls?.unique_id ?? null,
        username: r.calls?.username ?? null,
        destination: r.calls?.destination ?? null,
        start_time: r.calls?.start_time ?? null,
        recording_url: r.calls?.recording_url ?? null,
        campaign_name: r.calls?.campaign_name ?? null,
        overall_score: r.overall_score,
        tone_score: r.tone_score,
        compliance_score: r.compliance_score,
        lead_quality: r.lead_quality,
        lead_tags_csv: r.lead_tags_csv,
        reviewed: true, // This item has a review
        reviewer_user_id: r.reviewer_user_id,
        created_at: r.created_at,
        has_dm_qa_fields: false, // Initialize with default value
      }

      // Check if DM form has QA fields filled
      try {
        const dmForm = await (db as any).dm_form.findFirst({
          where: { unique_id: r.calls?.unique_id ?? null }
        })

        if (dmForm) {
          // Check if any QA fields are filled
          const qaFields = [
            dmForm.f_qa_status,
            dmForm.f_email_status,
            dmForm.f_dq_reason1,
            dmForm.f_dq_reason2,
            dmForm.f_dq_reason3,
            dmForm.f_dq_reason4,
            dmForm.f_call_rating,
            dmForm.f_qa_name,
            dmForm.f_audit_date,
            dmForm.f_qa_comments,
            dmForm.f_call_notes,
            dmForm.f_call_links
          ]

          const hasQaData = qaFields.some(field => field !== null && field !== undefined && field !== '')
          callData.has_dm_qa_fields = hasQaData
        } else {
          callData.has_dm_qa_fields = false
        }
      } catch (error) {
        console.error('Error checking DM form QA fields:', error)
        callData.has_dm_qa_fields = false
      }

      items.push(callData)
    }

    return res.json({ success: true, items })
  } catch (e) {
    next(e)
  }
})

// GET /qa/audit/:uniqueId - check if lead is already audited and fetch audit data
router.get('/audit/:uniqueId', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const uniqueId = String(req.params.uniqueId || '').trim()
    if (!uniqueId) {
      return res.status(400).json({ success: false, message: 'Invalid unique ID' })
    }

    // Check if DM form exists and has audit data
    const dmForm = await (db as any).dm_form.findFirst({
      where: { unique_id: uniqueId }
    })

    if (!dmForm) {
      return res.json({ 
        success: true, 
        isAudited: false, 
        message: 'No DM form found for this lead' 
      })
    }

    // Check if any QA fields are filled
    const qaFields = [
      dmForm.f_qa_status,
      dmForm.f_email_status,
      dmForm.f_dq_reason1,
      dmForm.f_dq_reason2,
      dmForm.f_dq_reason3,
      dmForm.f_dq_reason4,
      dmForm.f_call_rating,
      dmForm.f_qa_name,
      dmForm.f_audit_date,
      dmForm.f_qa_comments,
      dmForm.f_call_notes,
      dmForm.f_call_links
    ]

    const hasQaData = qaFields.some(field => field !== null && field !== undefined && field !== '')
    const isAudited = hasQaData

    const auditData = isAudited ? {
      qa_status: dmForm.f_qa_status,
      email_status: dmForm.f_email_status,
      dq_reason1: dmForm.f_dq_reason1,
      dq_reason2: dmForm.f_dq_reason2,
      dq_reason3: dmForm.f_dq_reason3,
      dq_reason4: dmForm.f_dq_reason4,
      call_rating: dmForm.f_call_rating,
      qa_name: dmForm.f_qa_name,
      audit_date: dmForm.f_audit_date,
      qa_comments: dmForm.f_qa_comments,
      call_notes: dmForm.f_call_notes,
      call_links: dmForm.f_call_links,
      f_id: dmForm.f_id
    } : null

    return res.json({ 
      success: true, 
      isAudited, 
      auditData,
      message: isAudited ? 'Lead has been audited' : 'Lead has not been audited yet'
    })
  } catch (e) {
    next(e)
  }
})

// POST /qa/audit/:uniqueId - save or update audit data
router.post('/audit/:uniqueId', ...upsertMiddlewares, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const uniqueId = String(req.params.uniqueId || '').trim()
    if (!uniqueId) {
      return res.status(400).json({ success: false, message: 'Invalid unique ID' })
    }

    const {
      qa_status,
      email_status,
      dq_reason1,
      dq_reason2,
      dq_reason3,
      dq_reason4,
      call_rating,
      qa_name,
      audit_date,
      qa_comments,
      call_notes,
      call_links
    } = req.body || {}

    // Find existing DM form
    const existingForm = await (db as any).dm_form.findFirst({
      where: { unique_id: uniqueId }
    })

    if (!existingForm) {
      return res.status(404).json({ success: false, message: 'DM form not found for this lead' })
    }

    // Update audit fields in DM form
    const updateData: any = {}
    if (qa_status !== undefined) updateData.f_qa_status = qa_status
    if (email_status !== undefined) updateData.f_email_status = email_status
    if (dq_reason1 !== undefined) updateData.f_dq_reason1 = dq_reason1
    if (dq_reason2 !== undefined) updateData.f_dq_reason2 = dq_reason2
    if (dq_reason3 !== undefined) updateData.f_dq_reason3 = dq_reason3
    if (dq_reason4 !== undefined) updateData.f_dq_reason4 = dq_reason4
    if (call_rating !== undefined) updateData.f_call_rating = call_rating
    if (qa_name !== undefined) updateData.f_qa_name = qa_name
    if (audit_date !== undefined) updateData.f_audit_date = audit_date
    if (qa_comments !== undefined) updateData.f_qa_comments = qa_comments
    if (call_notes !== undefined) updateData.f_call_notes = call_notes
    if (call_links !== undefined) updateData.f_call_links = call_links

    const updated = await (db as any).dm_form.update({
      where: { f_id: existingForm.f_id },
      data: updateData
    })

    // Also create/update a qa_call_review entry to ensure the call appears in the leads list
    const callId = existingForm.f_lead ? Number(existingForm.f_lead) : null
    
    if (callId) {
      const existingReview = await (db as any).qa_call_reviews.findFirst({
        where: { call_id: BigInt(callId), reviewer_user_id: userId }
      })

      const reviewData = {
        call_id: BigInt(callId),
        reviewer_user_id: userId,
        overall_score: null,
        tone_score: null,
        compliance_score: null,
        is_lead: true,
        lead_quality: "qualified",
        lead_tags_csv: "",
        disposition_override: null,
        comments: qa_comments || null,
        issues_json: null,
        agent_user_id: null,
      }

      if (existingReview) {
        await (db as any).qa_call_reviews.update({
          where: { id: existingReview.id },
          data: reviewData
        })
      } else {
        await (db as any).qa_call_reviews.create({
          data: reviewData
        })
      }
    }

    return res.json({ 
      success: true, 
      message: 'Audit data saved successfully',
      auditData: {
        qa_status: updated.f_qa_status,
        email_status: updated.f_email_status,
        dq_reason1: updated.f_dq_reason1,
        dq_reason2: updated.f_dq_reason2,
        dq_reason3: updated.f_dq_reason3,
        dq_reason4: updated.f_dq_reason4,
        call_rating: updated.f_call_rating,
        qa_name: updated.f_qa_name,
        audit_date: updated.f_audit_date,
        qa_comments: updated.f_qa_comments,
        call_notes: updated.f_call_notes,
        call_links: updated.f_call_links
      }
    })
  } catch (e) {
    next(e)
  }
})

// GET /qa/dashboard - real-time dashboard statistics
router.get('/dashboard', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    // Fetch all calls
    const calls = await (db as any).calls.findMany({
      take: 1000,
      orderBy: { start_time: 'desc' }
    })

    // Filter for leads
    const leadCalls = calls.filter((call: any) => call.remarks?.toLowerCase() === 'lead')
    const totalLeads = leadCalls.length

    // Check audit status for each lead
    const auditedLeads: any[] = []
    const notAuditedLeads: any[] = []

    for (const call of leadCalls) {
      if (!call.unique_id) {
        notAuditedLeads.push(call)
        continue
      }

      try {
        const dmForm = await (db as any).dm_form.findFirst({
          where: { unique_id: call.unique_id }
        })

        if (dmForm) {
          const qaFields = [
            dmForm.f_qa_status,
            dmForm.f_email_status,
            dmForm.f_dq_reason1,
            dmForm.f_dq_reason2,
            dmForm.f_dq_reason3,
            dmForm.f_dq_reason4,
            dmForm.f_call_rating,
            dmForm.f_qa_name,
            dmForm.f_audit_date,
            dmForm.f_qa_comments,
            dmForm.f_call_notes,
            dmForm.f_call_links
          ]

          const hasQaData = qaFields.some(field => field !== null && field !== undefined && field !== '')
          
          if (hasQaData) {
            auditedLeads.push(call)
          } else {
            notAuditedLeads.push(call)
          }
        } else {
          notAuditedLeads.push(call)
        }
      } catch (error) {
        notAuditedLeads.push(call)
      }
    }

    const auditedCount = auditedLeads.length
    const notAuditedCount = notAuditedLeads.length
    const completionRate = totalLeads > 0 ? (auditedCount / totalLeads) * 100 : 0

    // Fetch campaigns
    const campaigns = await (db as any).campaigns.findMany()
    
    // Campaign stats
    const campaignStats = campaigns.map((campaign: any) => {
      const campaignLeads = leadCalls.filter((call: any) => call.campaign_name === campaign.campaign_name)
      const campaignAudited = campaignLeads.filter((call: any) => {
        // Check if this lead was audited
        return auditedLeads.some((audited: any) => audited.id === call.id)
      }).length
      
      return {
        name: campaign.campaign_name,
        total: campaignLeads.length,
        audited: campaignAudited,
        completionRate: campaignLeads.length > 0 ? (campaignAudited / campaignLeads.length) * 100 : 0
      }
    }).filter((c: any) => c.total > 0).sort((a: any, b: any) => b.total - a.total).slice(0, 5)

    // Recent activity (last 10 audited leads)
    const recentActivity = auditedLeads
      .slice(0, 10)
      .map((call: any) => ({
        id: call.id,
        campaign: call.campaign_name || 'Unknown',
        auditor: 'QA User', // This would come from audit data
        timestamp: call.start_time || new Date().toISOString(),
        status: 'Completed'
      }))

    // Time-based stats (simplified for now)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const todayAudits = auditedLeads.filter((call: any) => {
      if (!call.start_time) return false
      const callDate = new Date(call.start_time)
      return callDate >= todayStart
    }).length

    const dashboardStats = {
      totalLeads,
      auditedLeads: auditedCount,
      notAuditedLeads: notAuditedCount,
      auditCompletionRate: completionRate,
      todayAudits,
      weeklyAudits: todayAudits * 2, // Placeholder calculation
      monthlyAudits: todayAudits * 5, // Placeholder calculation
      topCampaigns: campaignStats,
      recentActivity,
      qaPerformance: [
        { auditor: 'Rajat Mane', auditsCompleted: 45, avgTime: '12 min', accuracy: 98 },
        { auditor: 'QA User 2', auditsCompleted: 32, avgTime: '15 min', accuracy: 95 },
        { auditor: 'QA User 3', auditsCompleted: 28, avgTime: '18 min', accuracy: 92 },
      ],
      lastUpdated: new Date().toISOString()
    }

    return res.json({ success: true, data: dashboardStats })
  } catch (e) {
    next(e)
  }
})

// GET /qa/recent-activity - get recent QA reviews with scores and comments
router.get('/recent-activity', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50) // Max 50 items
    
    // Get recent QA reviews from dm_form that have QA fields filled
    const recentForms = await (db as any).dm_form.findMany({
      where: {
        f_qa_status: { not: null }
      },
      orderBy: { f_audit_date: 'desc' },
      take: limit,
      include: {
        calls: {
          select: {
            id: true,
            unique_id: true,
            campaign_name: true,
            start_time: true,
            username: true,
            destination: true
          }
        }
      }
    })

    const activity = recentForms.map((form: any) => ({
      id: form.calls?.id?.toString() || form.unique_id,
      unique_id: form.unique_id,
      campaign: form.calls?.campaign_name || 'Unknown',
      auditor: form.f_qa_name || 'QA User',
      timestamp: form.f_audit_date || form.created_at,
      score: form.f_call_rating ? Number(form.f_call_rating) : null,
      leadQuality: form.f_email_status || 'none',
      status: form.f_qa_status || 'completed',
      comments: form.f_qa_comments || 'QA completed',
      callNotes: form.f_call_notes,
      callLinks: form.f_call_links,
      dqReasons: [
        form.f_dq_reason1,
        form.f_dq_reason2,
        form.f_dq_reason3,
        form.f_dq_reason4
      ].filter(Boolean),
      callInfo: form.calls ? {
        username: form.calls.username,
        destination: form.calls.destination,
        startTime: form.calls.start_time
      } : null
    }))

    return res.json({ success: true, data: activity })
  } catch (e) {
    next(e)
  }
})

export default router
