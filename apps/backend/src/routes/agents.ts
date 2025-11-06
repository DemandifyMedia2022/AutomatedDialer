import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'

const router = Router()

// Agent-only routes
router.use(requireAuth, requireRoles(['agent']))

// Return SIP credentials for the authenticated agent
router.get('/me/credentials', async (req, res, next) => {
  try {
    const id = req.user!.userId
    const user = await db.users.findUnique({ where: { id }, select: { extension: true } })
    if (!user || !user.extension) return res.status(404).json({ success: false, message: 'No extension assigned' })
    const pool = getPool()
    const [rows]: any = await pool.query('SELECT extension_id AS extensionId, password FROM extensions WHERE extension_id = ? LIMIT 1', [user.extension])
    if (!rows || !rows[0]) return res.status(404).json({ success: false, message: 'Extension not found' })
    const { extensionId, password } = rows[0]
    return res.json({ success: true, extensionId, password })
  } catch (e) {
    next(e)
  }
})

export default router
