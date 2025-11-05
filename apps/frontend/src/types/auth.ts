export type Role = 'agent' | 'manager' | 'superadmin'

export type MeResponse = {
  success: true
  user: { id: number; role: Role | string; email: string }
}

export type LoginSuccess = {
  success: true
  token?: string
  user: { id: number; role: Role | string; username: string | null; email: string }
  csrfToken?: string
}

export type ApiError = { success: false; message: string; issues?: any }
