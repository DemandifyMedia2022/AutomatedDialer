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
    const u = (req.user as any)!
    const user = await db.users.findUnique({ where: { id: u.userId }, select: { username: true, usermail: true, id: true, role: true, extension: true, status: true } })
    return res.json({ success: true, user: { id: user?.id || u.userId, role: user?.role || u.role, username: user?.username || null, email: user?.usermail || u.email, extension: user?.extension || null, status: user?.status || null } })
  } catch (e) {
    next(e)
  }
})

// Get restrictions for current user (if demo)
router.get('/me/restrictions', requireAuth, async (req: any, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await db.users.findUnique({ where: { id: userId }, select: { role: true, is_demo_user: true } });

    if (!user || !user.is_demo_user) {
      return res.json({ restrictions: [] });
    }

    const restrictions = await db.demo_feature_restrictions.findMany({
      where: {
        role: user.role,
        is_locked: true
      },
      select: { feature_key: true }
    });

    res.json({ restrictions: restrictions.map(r => r.feature_key) });
  } catch (e) {
    next(e);
  }
});

const protectIfCookie = env.USE_AUTH_COOKIE ? [csrfProtect] : []

const UpdateProfileSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

router.patch('/me', ...protectIfCookie, requireAuth as any, async (req: any, res, next) => {
  try {
    const parsed = UpdateProfileSchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload. Both currentPassword and newPassword are required.', issues: parsed.error.flatten() })
    const { currentPassword, newPassword } = parsed.data

    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const found = await db.users.findUnique({ where: { id: userId }, select: { password: true } })
    if (!found) return res.status(404).json({ success: false, message: 'User not found' })

    const ok = found.password ? await bcrypt.compare(currentPassword, found.password as any) : false
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' })

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db.users.update({ where: { id: userId }, data: { password: hashedPassword } })

    return res.json({ success: true, message: 'Password updated successfully' })
  } catch (e) {
    next(e)
  }
})

router.delete('/me', ...protectIfCookie, requireAuth as any, async (req: any, res, next) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    // Check for critical relations or just attempt delete (relying on cascade)
    // For safety, we might implement a "soft delete" or checks here, but sticking to basic delete as requested.
    await db.users.delete({ where: { id: userId } })

    // Clear cookie if used
    if (env.USE_AUTH_COOKIE) {
      res.clearCookie(env.AUTH_COOKIE_NAME, { path: '/' })
    }

    return res.json({ success: true, message: 'Account deleted successfully' })
  } catch (e: any) {
    // Handle Prisma foreign key constraint errors
    if (e.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Cannot delete account because it has related data (documents, etc.)' })
    }
    next(e)
  }
})

export default router
