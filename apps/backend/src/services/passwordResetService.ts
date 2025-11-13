import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '../db/prisma'

const OTP_EXP_MINUTES = 10
const MAX_ATTEMPTS = 5

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function requestPasswordReset(usermail: string) {
  // Find user by email
  const user = await db.users.findFirst({ where: { usermail } , select: { id: true, status: true } })
  // Always behave similarly to avoid enumeration
  const generic = { success: true }
  if (!user) return generic
  // Optionally block inactive users
  if (user.status && user.status.toLowerCase() !== 'active') return generic

  const otp = generateOtp()
  const otpHash = await bcrypt.hash(otp, 10)
  const resetToken = randomUUID()
  const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000)

  // Remove previous pending resets for this user
  await db.$executeRaw`DELETE FROM password_resets WHERE user_id = ${user.id} AND used_at IS NULL`
  // Insert new reset
  await db.$executeRaw`INSERT INTO password_resets (user_id, otp_hash, reset_token, expires_at, attempts) VALUES (${user.id}, ${otpHash}, ${resetToken}, ${expiresAt}, 0)`

  return { success: true, otp, resetToken, userId: user.id }
}

export async function verifyOtp(usermail: string, otp: string) {
  const recs: any[] = await db.$queryRaw`SELECT pr.id, pr.user_id, pr.otp_hash, pr.reset_token, pr.expires_at, pr.attempts, pr.used_at FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE u.usermail = ${usermail} AND pr.used_at IS NULL ORDER BY pr.id DESC LIMIT 1`
  if (!recs.length) return { ok: false as const }
  const r = recs[0]
  if (new Date(r.expires_at).getTime() < Date.now()) return { ok: false as const }
  if ((r.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false as const }

  const match = await bcrypt.compare(otp, r.otp_hash)
  if (!match) {
    await db.$executeRaw`UPDATE password_resets SET attempts = attempts + 1 WHERE id = ${r.id}`
    return { ok: false as const }
  }
  // Mark used
  const now = new Date()
  await db.$executeRaw`UPDATE password_resets SET used_at = ${now} WHERE id = ${r.id}`
  return { ok: true as const, resetToken: r.reset_token }
}

export async function resetPassword(usermail: string, resetToken: string, newPassword: string) {
  const recs: any[] = await db.$queryRaw`SELECT pr.id, pr.user_id, pr.reset_token, pr.expires_at, pr.used_at FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE u.usermail = ${usermail} AND pr.reset_token = ${resetToken} ORDER BY pr.id DESC LIMIT 1`
  if (!recs.length) return { ok: false as const }
  const r = recs[0]
  if (r.used_at === null) {
    // allow flow only if previously verified (used_at must be set in verify step)
    return { ok: false as const }
  }
  if (new Date(r.expires_at).getTime() < Date.now()) return { ok: false as const }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await db.$executeRaw`UPDATE users SET password = ${passwordHash} WHERE id = ${r.user_id}`
  // Invalidate any other pending resets
  await db.$executeRaw`DELETE FROM password_resets WHERE user_id = ${r.user_id}`

  return { ok: true as const, userId: r.user_id as number }
}
