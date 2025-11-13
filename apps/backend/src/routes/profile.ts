import { Router } from 'express'
import { requireAuth } from '../middlewares/auth'
import { db } from '../db/prisma'

const router = Router()

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const u = req.user!
    const user = await db.users.findUnique({ where: { id: u.userId }, select: { username: true, usermail: true, id: true, role: true } })
    return res.json({ success: true, user: { id: user?.id || u.userId, role: user?.role || u.role, username: user?.username || null, email: user?.usermail || u.email } })
  } catch (e) {
    next(e)
  }
})

export default router
