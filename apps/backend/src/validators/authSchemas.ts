import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const LoginResponseSchema = z.object({
  success: z.literal(true),
  token: z.string().optional(),
  user: z.object({ id: z.number(), role: z.string(), username: z.string().nullable(), email: z.string() })
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  issues: z.any().optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
