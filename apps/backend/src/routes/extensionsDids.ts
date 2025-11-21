import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { getPool } from '../db/pool'
import { emitToManagers } from '../utils/ws'

const router = Router()

router.get('/dids', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows]: any = await pool.query('SELECT extension_id AS extensionId, did, updated_at AS updatedAt FROM extension_dids ORDER BY extension_id ASC')
    res.json({ success: true, items: rows })
  } catch (e) {
    next(e)
  }
})

router.get('/:ext/did', requireAuth, requireRoles(['manager', 'superadmin']), async (req, res, next) => {
  try {
    const ext = String(req.params.ext || '').trim()
    const pool = getPool()
    const [rows]: any = await pool.query('SELECT extension_id AS extensionId, did, updated_at AS updatedAt FROM extension_dids WHERE extension_id = ? LIMIT 1', [ext])
    const row = rows && rows[0]
    res.json({ success: true, mapping: row || null })
  } catch (e) {
    next(e)
  }
})

router.post('/:ext/did', requireAuth, requireRoles(['manager', 'superadmin']), async (req, res, next) => {
  try {
    const ext = String(req.params.ext || '').trim()
    const didRaw = req.body?.did
    const did = didRaw == null ? null : String(didRaw).trim()
    if (!ext) return res.status(400).json({ success: false, message: 'Invalid extension' })
    const pool = getPool()
    await pool.query('INSERT INTO extension_dids (extension_id, did) VALUES (?, ?) ON DUPLICATE KEY UPDATE did = VALUES(did), updated_at = CURRENT_TIMESTAMP', [ext, did])
    const [rows]: any = await pool.query('SELECT extension_id AS extensionId, did, updated_at AS updatedAt FROM extension_dids WHERE extension_id = ? LIMIT 1', [ext])
    const row = rows && rows[0]
    // Broadcast update to managers
    try { emitToManagers('extension:did:update', { extensionId: ext, did }) } catch {}
    res.json({ success: true, mapping: row || { extensionId: ext, did, updatedAt: new Date() } })
  } catch (e) {
    next(e)
  }
})

// Convenience: agent self lookup for dialer usage
router.get('/me/did', requireAuth, async (req: any, res, next) => {
  try {
    const ext = String(req.user?.extension || req.user?.ext || '').trim()
    if (!ext) return res.json({ success: true, extensionId: null, did: null })
    const pool = getPool()
    const [rows]: any = await pool.query('SELECT did FROM extension_dids WHERE extension_id = ? LIMIT 1', [ext])
    const did = rows && rows[0] ? rows[0].did : null
    res.json({ success: true, extensionId: ext, did })
  } catch (e) {
    next(e)
  }
})
 
export default router