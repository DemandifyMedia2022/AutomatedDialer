import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post, put, del, patch } from '@/lib/superadminApi'

export interface User {
  id: number
  username: string
  email: string
  unique_user_id: string
  role: 'agent' | 'manager' | 'qa' | 'superadmin'
  status: 'active' | 'inactive' | 'suspended'
  extension: string | null
  created_at: Date
  updated_at: Date
  last_login: Date | null
  is_demo_user: boolean
}

export interface UserDetails extends User {
  statistics: {
    total_calls: number
    total_campaigns: number
    total_notes: number
    total_documents: number
    total_sessions: number
  }
  recent_sessions: {
    id: number
    login_at: Date
    logout_at: Date | null
    is_active: boolean
  }[]
}

export interface UsersData {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UserFilters {
  search?: string
  role?: 'agent' | 'manager' | 'qa' | 'superadmin'
  status?: 'active' | 'inactive' | 'suspended'
  page?: number
  limit?: number
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  role: 'agent' | 'manager' | 'qa' | 'superadmin'
  extension?: string | null
  status?: 'active' | 'inactive' | 'suspended'
  is_demo_user?: boolean
}

export interface UpdateUserData {
  username?: string
  email?: string
  role?: 'agent' | 'manager' | 'qa' | 'superadmin'
  extension?: string | null
  status?: 'active' | 'inactive' | 'suspended'
  password?: string
  is_demo_user?: boolean
}

/**
 * Hook to fetch paginated users list with filters
 */
export function useUsers(filters: UserFilters = {}) {
  return useQuery<UsersData>({
    queryKey: ['users', filters],
    queryFn: () => get<UsersData>('/api/superadmin/users', filters),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch user details by ID
 */
export function useUserDetails(userId: number | null) {
  return useQuery<UserDetails>({
    queryKey: ['user', userId],
    queryFn: () => get<UserDetails>(`/api/superadmin/users/${userId}`),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserData) =>
      post<User>('/api/superadmin/users', data),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook to update user information
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateUserData }) =>
      put<User>(`/api/superadmin/users/${userId}`, data),
    onSuccess: (_, variables) => {
      // Invalidate users list and specific user details
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
    },
  })
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) =>
      del(`/api/superadmin/users/${userId}`),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook to update user status
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: number
      status: 'active' | 'inactive' | 'suspended'
    }) => patch<User>(`/api/superadmin/users/${userId}/status`, { status }),
    onSuccess: (_, variables) => {
      // Invalidate users list and specific user details
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
    },
  })
}

/**
 * Hook to assign role to user
 */
export function useAssignRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number
      role: 'agent' | 'manager' | 'qa' | 'superadmin'
    }) => patch<User>(`/api/superadmin/users/${userId}/role`, { role }),
    onSuccess: (_, variables) => {
      // Invalidate users list and specific user details
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
    },
  })
}
