import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { emitToManagers } from '../utils/ws'

const router = Router()

router.get('/dids', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const role = (req.user?.role || '').toLowerCase()
    const orgId = req.user?.organizationId

    const where: any = {}
    if (role === 'manager') {
      if (!orgId) return res.json({ success: true, items: [] })
      where.organization_id = orgId
    }

    const items = await db.extension_dids.findMany({
      where,
      orderBy: { extension_id: 'asc' }
    })

    // If manager, also fetch which DIDs they are allowed to use
    let allowedDids: string[] = []
    if (role === 'manager' && orgId) {
      const allowed = await (db as any).organization_allowed_dids.findMany({
        where: { organization_id: orgId }
      })
      allowedDids = allowed.map((a: any) => a.did)
    }

    res.json({
      success: true,
      items: items.map(i => ({
        extensionId: i.extension_id,
        did: i.did,
        updatedAt: i.updated_at,
        organizationId: i.organization_id
      })),
      allowedDids // Managers will use this to filter their Caller ID dropdown
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:ext/did', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const ext = String(req.params.ext || '').trim()
    const role = (req.user?.role || '').toLowerCase()
    const orgId = req.user?.organizationId

    const where: any = { extension_id: ext }
    if (role === 'manager' && orgId) {
      where.organization_id = orgId
    }

    const mapping = await db.extension_dids.findFirst({
      where
    })

    res.json({
      success: true,
      mapping: mapping ? {
        extensionId: mapping.extension_id,
        did: mapping.did,
        updatedAt: mapping.updated_at,
        organizationId: mapping.organization_id
      } : null
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:ext/did', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const ext = String(req.params.ext || '').trim()
    const didRaw = req.body?.did
    const did = didRaw == null ? null : String(didRaw).trim()
    const role = (req.user?.role || '').toLowerCase()
    const orgId = req.user?.organizationId

    if (!ext) return res.status(400).json({ success: false, message: 'Invalid extension' })

    // If manager, check if they own this extension mapping already
    if (role === 'manager' && orgId) {
      const existing = await db.extension_dids.findUnique({
        where: { extension_id: ext }
      })
      if (existing && existing.organization_id !== orgId) {
        return res.status(403).json({ success: false, message: 'Extension belongs to another organization' })
      }
    }

    const mapping = await db.extension_dids.upsert({
      where: { extension_id: ext },
      create: {
        extension_id: ext,
        did: did,
        organization_id: role === 'manager' ? orgId : (req.body?.organizationId || null)
      },
      update: {
        did: did,
        updated_at: new Date(),
        // Only superadmin can change the organization of an extension mapping
        ...(role === 'superadmin' && req.body?.organizationId !== undefined ? { organization_id: req.body.organizationId } : {})
      }
    })

    // Broadcast update to managers
    try { emitToManagers('extension:did:update', { extensionId: ext, did }) } catch { }

    res.json({
      success: true,
      mapping: {
        extensionId: mapping.extension_id,
        did: mapping.did,
        updatedAt: mapping.updated_at,
        organizationId: mapping.organization_id
      }
    })
  } catch (e) {
    next(e)
  }
})

// Convenience: agent self lookup for dialer usage
router.get('/me/did', requireAuth, async (req: any, res, next) => {
  try {
    const ext = String(req.user?.extension || req.user?.ext || '').trim()
    if (!ext) return res.json({ success: true, extensionId: null, did: null })

    const mapping = await db.extension_dids.findUnique({
      where: { extension_id: ext }
    })

    res.json({ success: true, extensionId: ext, did: mapping?.did || null })
  } catch (e) {
    next(e)
  }
})

// --- Super Admin: Manage Allowed DIDs for Organizations ---

router.get('/allowed-dids/:orgId', requireAuth, requireRoles(['superadmin']), async (req, res, next) => {
  try {
    const orgId = parseInt(req.params.orgId)
    const items = await (db as any).organization_allowed_dids.findMany({
      where: { organization_id: orgId }
    })
    res.json({ success: true, items })
  } catch (e) {
    next(e)
  }
})

router.post('/allowed-dids/:orgId', requireAuth, requireRoles(['superadmin']), async (req, res, next) => {
  try {
    const orgId = parseInt(req.params.orgId)
    const { dids } = req.body // Array of strings

    if (!Array.isArray(dids)) return res.status(400).json({ success: false, message: 'DIDs must be an array' })

    // Transaction to replace the list
    await (db as any).$transaction([
      (db as any).organization_allowed_dids.deleteMany({ where: { organization_id: orgId } }),
      (db as any).organization_allowed_dids.createMany({
        data: dids.map(did => ({ organization_id: orgId, did }))
      })
    ])

    res.json({ success: true, message: 'Allowed DIDs updated' })
  } catch (e) {
    next(e)
  }
})

export default router
