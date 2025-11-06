import { Router } from 'express'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { getPool } from '../db/pool'

const router = Router()

// Superadmin-only: list extensions and whether assigned
router.use(requireAuth, requireRoles(['superadmin']))

router.get('/', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query(`
      SELECT e.extension_id AS extensionId, e.password AS password, 
             (SELECT COUNT(1) FROM users u WHERE u.extension = e.extension_id) AS assignedCount
      FROM extensions e
      ORDER BY e.extension_id ASC
    `)
    res.json({ success: true, extensions: rows })
  } catch (e) {
    next(e)
  }
})

// Available only (not assigned)
router.get('/available', async (_req, res, next) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query(`
      SELECT e.extension_id AS extensionId
      FROM extensions e
      LEFT JOIN users u ON u.extension = e.extension_id
      WHERE u.id IS NULL
      ORDER BY e.extension_id ASC
    `)
    res.json({ success: true, extensions: rows })
  } catch (e) {
    next(e)
  }
})

export default router
