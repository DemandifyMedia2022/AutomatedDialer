import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.union([
    z.string().email(),
    z.string().regex(/^DM-[A-Za-z]{1,2}-\d{4}$/),
  ]),
  // Security: Min 12 chars, upper, lower, number, special char
  password: z.string().min(12).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/, 'Password must meet complexity requirements'),
})

export type JwtPayload = {
  userId: number
  role: string | null
  // email: string // Removed for security (PII in token)
}

export const LoginResponseSchema = z.object({
  success: z.literal(true),
  token: z.string().optional(),
  user: z.object({ id: z.number(), role: z.string(), username: z.string().nullable() })
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  issues: z.any().optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
