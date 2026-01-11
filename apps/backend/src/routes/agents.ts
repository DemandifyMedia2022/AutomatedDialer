import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'
 
const router = Router()
 
// Auth required for all routes in this file
router.use(requireAuth)
 
// Return SIP credentials for the authenticated agent
router.get('/me/credentials', requireRoles(['agent', 'manager', 'superadmin']), async (req, res, next) => {
  try {
    const id = req.user!.userId
    const user = await db.users.findUnique({ where: { id }, select: { extension: true } })
    if (!user || !user.extension) return res.status(404).json({ success: false, message: 'No extension assigned' })
    const pool = getPool()
    const [rows]: any = await pool.query('SELECT extension_id AS extensionId, password FROM extensions WHERE extension_id = ? LIMIT 1', [user.extension])
    
    // If extension not found in database, use SIP_PASSWORD as fallback (common for Telxio)
    if (!rows || !rows[0]) {
      const sipPassword = process.env.SIP_PASSWORD || ''
      if (sipPassword) {
        // Insert the extension with SIP_PASSWORD as fallback
        await pool.query('INSERT INTO extensions (extension_id, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?', 
          [user.extension, sipPassword, sipPassword])
        return res.json({ success: true, extensionId: user.extension, password: sipPassword })
      }
      return res.status(404).json({ success: false, message: 'Extension not found and no SIP password configured' })
    }
    
    const { extensionId, password } = rows[0]
    return res.json({ success: true, extensionId, password })
  } catch (e) {
    next(e)
  }
})
 
// List peers (agents) with assigned extensions for transfer targeting
router.get('/peers', requireRoles(['agent', 'manager', 'superadmin']), async (_req, res, next) => {
  try {
    const users = await db.users.findMany({
      where: { role: 'agent', NOT: { extension: null } },
      orderBy: { username: 'asc' },
      select: { id: true, username: true, extension: true },
    })
    res.json({ success: true, users })
  } catch (e) {
    next(e)
  }
})
 
export default router