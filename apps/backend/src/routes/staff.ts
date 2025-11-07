import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { db } from '../db/prisma'
import { getPool } from '../db/pool'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'
 
const router = Router()
 
// Manager and Superadmin can view staff lists
router.use(requireAuth, requireRoles(['manager', 'superadmin']))
 
// List agents with minimal fields for admin/manager views
router.get('/agents', async (_req, res, next) => {
  try {
    const users = await db.users.findMany({
      where: { role: 'agent' },
      orderBy: { created_at: 'desc' },
      select: { id: true, username: true, status: true, extension: true, usermail: true, unique_user_id: true },
    })
    res.json({ success: true, users })
  } catch (e) {
    next(e)
  }
})
 
// Update agent (extension only) — managers and superadmins
const protectIfCookie = env.USE_AUTH_COOKIE ? [csrfProtect] : []
router.patch('/agents/:id', ...protectIfCookie, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })
 
    const ext = (req.body?.extension ?? '').toString().trim()
    if (!ext) return res.status(400).json({ success: false, message: 'Extension is required' })
 
    // Verify extension exists in extensions table
    const pool = getPool()
    const [extRows]: any = await pool.query('SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1', [ext])
    if (!extRows || extRows.length === 0) return res.status(400).json({ success: false, message: 'Extension not found' })
 
    // Ensure not already assigned to a different user
    const assigned = await db.users.findFirst({ where: { extension: ext, NOT: { id } } })
    if (assigned) return res.status(400).json({ success: false, message: 'Extension already assigned' })
 
    const updated = await db.users.update({
      where: { id },
      data: { extension: ext },
      select: { id: true, username: true, extension: true, status: true, usermail: true, unique_user_id: true },
    })
    res.json({ success: true, user: updated })
  } catch (e) {
    next(e)
  }
})
 
// Delete agent — managers and superadmins
router.delete('/agents/:id', ...protectIfCookie, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' })
    const user = await db.users.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    if (user.role !== 'agent') return res.status(403).json({ success: false, message: 'Only agents can be deleted here' })
    await db.users.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})
 
export default router