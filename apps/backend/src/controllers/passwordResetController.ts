import { Request, Response } from 'express'
import { z } from 'zod'
import { sendMail } from '../services/mailer'
import { requestPasswordReset, verifyOtp as verifyOtpSvc, resetPassword as resetPasswordSvc } from '../services/passwordResetService'
import { closeActiveSession } from '../services/presenceService'

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
})

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  reset_token: z.string().min(1),
  new_password: z.string().min(6),
})

export async function forgotPassword(req: Request, res: Response) {
  const parsed = ForgotPasswordSchema.safeParse({ email: req.body?.email || req.body?.usermail })
  if (!parsed.success) return res.status(200).json({ success: true }) // generic
  const { email } = parsed.data
  try {
    const resp = await requestPasswordReset(email)
    if ((resp as any).otp && (resp as any).userId) {
      const otp = (resp as any).otp as string
      // Send email with OTP
      try {
        const pretty = `Your OTP is ${otp}. It expires in 10 minutes.`
        await sendMail({
          to: email,
          subject: 'Password reset OTP',
          text: pretty,
          html: `<p>${pretty}</p>`,
        })
      } catch {}
    }
  } catch {}
  // Always generic response to prevent enumeration
  return res.json({ success: true })
}

export async function verifyOtp(req: Request, res: Response) {
  const parsed = VerifyOtpSchema.safeParse({ email: req.body?.email || req.body?.usermail, otp: req.body?.otp })
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload' })
  const { email, otp } = parsed.data
  try {
    const out = await verifyOtpSvc(email, otp)
    if (!out.ok) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
    return res.json({ success: true, reset_token: out.resetToken })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Verification failed' })
  }
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = ResetPasswordSchema.safeParse({
    email: req.body?.email || req.body?.usermail,
    reset_token: req.body?.reset_token,
    new_password: req.body?.new_password,
  })
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload' })
  const { email, reset_token, new_password } = parsed.data
  try {
    const out = await resetPasswordSvc(email, reset_token, new_password)
    if (!out.ok) return res.status(400).json({ success: false, message: 'Invalid reset request' })
    try { if (out.userId) await closeActiveSession(out.userId, 'password_reset') } catch {}
    return res.json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Reset failed' })
  }
}
