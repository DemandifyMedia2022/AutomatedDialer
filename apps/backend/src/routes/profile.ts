import { Router } from 'express'
import { requireAuth } from '../middlewares/auth'
import { db } from '../db/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { csrfProtect } from '../middlewares/csrf'
import { env } from '../config/env'

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

const protectIfCookie = env.USE_AUTH_COOKIE ? [csrfProtect] : []

const UpdateProfileSchema = z.object({
  username: z.string().trim().min(1).max(120).optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
})

router.patch('/me', ...protectIfCookie, requireAuth as any, async (req: any, res, next) => {
  try {
    const parsed = UpdateProfileSchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const { username, currentPassword, newPassword } = parsed.data

    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const updates: any = {}
    if (typeof username === 'string') updates.username = username

    // Handle password change if both provided
    if ((currentPassword || newPassword) && !(currentPassword && newPassword)) {
      return res.status(400).json({ success: false, message: 'Both currentPassword and newPassword are required to change password' })
    }
    if (currentPassword && newPassword) {
      const found = await db.users.findUnique({ where: { id: userId }, select: { password: true } })
      const ok = found?.password ? await bcrypt.compare(currentPassword, found.password as any) : false
      if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' })
      updates.password = await bcrypt.hash(newPassword, 10)
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No changes provided' })

    const updated = await db.users.update({ where: { id: userId }, data: updates, select: { id: true, username: true, usermail: true, role: true } })
    return res.json({ success: true, user: { id: updated.id, username: updated.username, email: updated.usermail, role: updated.role } })
  } catch (e) {
    next(e)
  }
})

export default router
