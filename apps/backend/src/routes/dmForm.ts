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
    f_campaign_name: optionalField,
    f_lead: optionalField,
    ...baseShape,
  })
  .strict()

type DmFormInput = z.infer<typeof DmFormSchema>

const writeMiddlewares: any[] = [requireAuth, requireRoles(['agent', 'manager', 'superadmin', 'qa'])]
if (env.USE_AUTH_COOKIE) writeMiddlewares.push(csrfProtect)

function sanitizePayload(input: Partial<DmFormInput>) {
  const data: Partial<Record<LeadFieldKey | 'f_campaign_name' | 'f_lead', string | null>> = {}
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

  return { data, touched }
}

router.post('/', ...writeMiddlewares, async (req: any, res, next) => {
  try {
    const parsed = DmFormSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    }

    const { data } = sanitizePayload(parsed.data)
    const payload = {
      ...data,
      form_status: 1,
      added_by_user_id: req.user?.userId ? String(req.user.userId) : null,
      qualifyleads_by: req.user?.username || null,
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
