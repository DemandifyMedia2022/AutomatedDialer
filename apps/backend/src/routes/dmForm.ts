import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/prisma'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'

const router = Router()

const optionalField = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === undefined || val === null) return null
    const str = String(val).trim()
    return str.length ? str : null
  })

const dmFieldKeys = [
  'f_campaign_name',
  'f_lead',
  'f_resource_name',
  'f_data_source',
  'unique_id',
  'f_salutation',
  'f_first_name',
  'f_last_name',
  'f_job_title',
  'f_department',
  'f_job_level',
  'f_email_add',
  'Secondary_Email',
  'f_conatct_no',
  'f_company_name',
  'f_website',
  'f_address1',
  'f_city',
  'f_state',
  'f_zip_code',
  'f_country',
  'f_emp_size',
  'f_industry',
  'f_sub_industry',
  'f_revenue',
  'f_revenue_link',
  'f_profile_link',
  'f_company_link',
  'f_address_link',
  'f_cq1',
  'f_cq2',
  'f_cq3',
  'f_cq4',
  'f_cq5',
  'f_cq6',
  'f_cq7',
  'f_cq8',
  'f_cq9',
  'f_cq10',
  'f_asset_name1',
  'f_asset_name2',
  'f_email_status',
  'f_qa_status',
  'f_dq_reason1',
  'f_dq_reason2',
  'f_dq_reason3',
  'f_dq_reason4',
  'f_qa_comments',
  'f_call_rating',
  'f_call_notes',
  'f_call_links',
  'f_qa_name',
  'f_audit_date',
] as const

type LeadFieldKey = (typeof dmFieldKeys)[number]

const baseShape = dmFieldKeys.reduce<Record<LeadFieldKey, typeof optionalField>>(
  (shape, key) => {
    shape[key] = optionalField
    return shape
  },
  {} as Record<LeadFieldKey, typeof optionalField>
)

const DmFormSchema = z
  .object({
    ...baseShape,
  })
  .strict()

type DmFormInput = z.infer<typeof DmFormSchema>

const writeMiddlewares: any[] = [requireAuth, requireRoles(['agent', 'manager', 'superadmin', 'qa'])]
if (env.USE_AUTH_COOKIE) writeMiddlewares.push(csrfProtect)

function sanitizePayload(input: Partial<DmFormInput>) {
  const data: Partial<Record<LeadFieldKey | 'f_campaign_name' | 'f_lead' | 'f_resource_name', string | null>> = {}
  let touched = false

  for (const key of dmFieldKeys) {
    if (key in input) {
      data[key] = input[key as LeadFieldKey] ?? null
      touched = true
    }
  }

  if ('f_campaign_name' in input) {
    data.f_campaign_name = input.f_campaign_name ?? null
    touched = true
  }
  if ('f_lead' in input) {
    data.f_lead = input.f_lead ?? null
    touched = true
  }
  if ('f_resource_name' in input) {
    data.f_resource_name = input.f_resource_name ?? null
    touched = true
  }

  return { data, touched }
}

// Debug endpoint to check calls with unique_ids
router.get('/debug/calls', requireAuth, async (req: any, res, next) => {
  try {
    const recentCalls = await (db as any).calls.findMany({
      select: {
        id: true,
        unique_id: true,
        destination: true,
        start_time: true,
      },
      orderBy: { start_time: 'desc' },
      take: 10
    })

    res.json({
      success: true,
      count: recentCalls.length,
      data: recentCalls
    })
  } catch (e) {
    next(e)
  }
})

// Debug endpoint to check all DM forms
router.get('/debug/all', requireAuth, async (req: any, res, next) => {
  try {
    const allForms = await (db as any).dm_form.findMany({
      select: {
        f_id: true,
        f_campaign_name: true,
        f_lead: true,
        unique_id: true,
        f_resource_name: true,
        f_date: true,
      },
      orderBy: { f_date: 'desc' },
      take: 10
    })

    res.json({
      success: true,
      count: allForms.length,
      data: allForms
    })
  } catch (e) {
    next(e)
  }
})

router.get('/lead/:leadId', requireAuth, async (req: any, res, next) => {
  try {
    const leadId = req.params.leadId

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' })
    }

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    // Search by f_lead (call ID) - simple approach
    const where: any = { f_lead: leadId }
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const form = await (db as any).dm_form.findFirst({
      where,
    })

    if (!form) {
      return res.status(404).json({ success: false, message: 'DM form not found for this lead' })
    }

    res.json({ success: true, data: form })
  } catch (e) {
    next(e)
  }
})

// New endpoint to find DM form by unique_id
router.get('/unique/:uniqueId', requireAuth, async (req: any, res, next) => {
  try {
    const uniqueId = req.params.uniqueId

    if (!uniqueId) {
      return res.status(400).json({ success: false, message: 'Unique ID is required' })
    }

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    // Search by unique_id
    const where: any = { unique_id: uniqueId }
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const form = await (db as any).dm_form.findFirst({
      where,
    })

    if (!form) {
      return res.status(404).json({ success: false, message: 'DM form not found for this unique ID' })
    }

    res.json({ success: true, data: form })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, async (req: any, res, next) => {
  try {
    const { campaign, limit = 10 } = req.query
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    let whereClause: any = {}
    if (!isSuper && orgId) {
      whereClause.organization_id = orgId
    }
    if (campaign && typeof campaign === 'string') {
      whereClause.f_campaign_name = campaign
    }

    const forms = await (db as any).dm_form.findMany({
      where: whereClause,
      orderBy: { f_date: 'desc' },
      take: Number(limit) || 10,
      select: {
        f_id: true,
        f_campaign_name: true,
        f_lead: true,
        f_date: true,
        form_status: true,
      }
    })

    res.json({ success: true, forms })
  } catch (e) {
    next(e)
  }
})

router.post('/', ...writeMiddlewares, async (req: any, res, next) => {
  try {
    const parsed = DmFormSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    }

    const orgId = req.user?.organizationId
    if (!orgId) return res.status(400).json({ success: false, message: 'User must belong to an organization' })

    const { data } = sanitizePayload(parsed.data)
    const payload = {
      ...data,
      form_status: 1,
      added_by_user_id: req.user?.userId ? String(req.user.userId) : null,
      qualifyleads_by: req.user?.username || null,
      organization_id: orgId,
    }

    const saved = await (db as any).dm_form.create({ data: payload })
    res.status(201).json({ success: true, form: saved })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', ...writeMiddlewares, async (req: any, res, next) => {
  try {
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' })
    }

    const parsed = DmFormSchema.partial().safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    }

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const existing = await (db as any).dm_form.findUnique({ where: { f_id: id }, select: { organization_id: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    if (!isSuper && existing.organization_id !== orgId) return res.status(403).json({ success: false, message: 'Access denied' });

    const { data, touched } = sanitizePayload(parsed.data)
    if (!touched) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' })
    }

    const updated = await (db as any).dm_form.update({ where: { f_id: id }, data })
    res.json({ success: true, form: updated })
  } catch (e) {
    next(e)
  }
})

export default router
