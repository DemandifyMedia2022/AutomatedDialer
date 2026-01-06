import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
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
