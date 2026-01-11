import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'
import { z } from 'zod'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'

const router = Router()

// Only managers and superadmins can access manager settings
router.use(requireAuth, requireRoles(['manager', 'superadmin']))

const protectIfCookie = env.USE_AUTH_COOKIE ? [csrfProtect] : []

const ManagerSettingsSchema = z.object({
    teamName: z.string().optional(),
    timezone: z.string().optional(),
    workingHoursStart: z.string().optional(),
    workingHoursEnd: z.string().optional(),
    notificationEmail: z.boolean().optional(),
    notificationSms: z.boolean().optional(),
    notificationInApp: z.boolean().optional(),
    autoAssignCampaigns: z.boolean().optional(),
    requireApprovalForCalls: z.boolean().optional(),
    dailyReportTime: z.string().optional(),
})

// Get manager settings
router.get('/settings', async (req: any, res, next) => {
    try {
        const orgId = req.user?.organizationId
        if (!orgId) {
            return res.status(400).json({ success: false, message: 'User does not belong to an organization' })
        }

        const org = await (db as any).organizations.findUnique({
            where: { id: orgId },
            include: {
                extension_dids: true,
                organization_allowed_dids: true
            }
        })

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' })
        }

        // Fetch extensions list from extensions table if needed, but we have extension_dids
        const extensions = org.extension_dids.map(ed => ed.extension_id)

        // Get unique DIDs from both allowed pool and those actually assigned to extensions
        const allowedDids = org.organization_allowed_dids.map(ad => ad.did)
        const assignedDids = org.extension_dids.map(ed => ed.did).filter(Boolean)
        const dids = Array.from(new Set([...allowedDids, ...assignedDids]))

        res.json({
            success: true,
            settings: {
                teamName: org.name, // Use org name as team name if not specified
                organizationName: org.name,
                timezone: org.timezone || 'UTC',
                workingHoursStart: org.working_hours_start || '09:00',
                workingHoursEnd: org.working_hours_end || '17:00',
                notificationEmail: org.notification_email ?? true,
                notificationSms: org.notification_sms ?? false,
                notificationInApp: org.notification_in_app ?? true,
                autoAssignCampaigns: org.auto_assign_campaigns ?? false,
                requireApprovalForCalls: org.require_approval_for_calls ?? false,
                dailyReportTime: org.daily_report_time || '08:00',
                extensions,
                dids
            }
        })
    } catch (e) {
        next(e)
    }
})

// Update manager settings
router.put('/settings', ...protectIfCookie, async (req: any, res, next) => {
    try {
        const orgId = req.user?.organizationId
        if (!orgId) {
            return res.status(400).json({ success: false, message: 'User does not belong to an organization' })
        }

        const parsed = ManagerSettingsSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
        }

        const data = parsed.data
        await (db as any).organizations.update({
            where: { id: orgId },
            data: {
                name: data.teamName, // If they update team name, update org name? Maybe.
                timezone: data.timezone,
                working_hours_start: data.workingHoursStart,
                working_hours_end: data.workingHoursEnd,
                notification_email: data.notificationEmail,
                notification_sms: data.notificationSms,
                notification_in_app: data.notificationInApp,
                auto_assign_campaigns: data.autoAssignCampaigns,
                require_approval_for_calls: data.requireApprovalForCalls,
                daily_report_time: data.dailyReportTime,
            }
        })

        res.json({ success: true, message: 'Settings updated successfully' })
    } catch (e) {
        next(e)
    }
})

export default router
