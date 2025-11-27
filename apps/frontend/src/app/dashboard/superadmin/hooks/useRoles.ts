import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, put } from '@/lib/superadminApi'

export type RoleType = 'agent' | 'manager' | 'qa' | 'superadmin'

export type PermissionAction = 'create' | 'read' | 'update' | 'delete'

export interface Permission {
  resource: string
  actions: PermissionAction[]
  description?: string
}

export interface RolePermissions {
  role: RoleType
  displayName: string
  description: string
  permissions: Permission[]
  userCount: number
}

export interface RoleUser {
  id: number
  username: string
  email: string
  unique_user_id: string
  role: RoleType
  status: 'active' | 'inactive' | 'suspended'
  extension: string | null
  created_at: Date
  updated_at: Date
  last_login: Date | null
}

export interface RoleUsersData {
  users: RoleUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AvailablePermissions {
  resources: string[]
  actions: PermissionAction[]
}

export interface UpdatePermissionsData {
  permissions: Permission[]
}

/**
 * Hook to fetch all roles with their permissions and user counts
 */
export function useRoles() {
  return useQuery<RolePermissions[]>({
    queryKey: ['roles'],
    queryFn: () => get<RolePermissions[]>('/api/superadmin/roles'),
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch a specific role by name
 */
export function useRole(roleName: RoleType | null) {
  return useQuery<RolePermissions>({
    queryKey: ['role', roleName],
    queryFn: () => get<RolePermissions>(`/api/superadmin/roles/${roleName}`),
    enabled: !!roleName,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch users assigned to a specific role
 */
export function useRoleUsers(roleName: RoleType | null, page = 1, limit = 20) {
  return useQuery<RoleUsersData>({
    queryKey: ['roleUsers', roleName, page, limit],
    queryFn: () =>
      get<RoleUsersData>(`/api/superadmin/roles/${roleName}/users`, { page, limit }),
    enabled: !!roleName,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch available permissions (resources and actions)
 */
export function useAvailablePermissions() {
  return useQuery<AvailablePermissions>({
    queryKey: ['availablePermissions'],
    queryFn: () => get<AvailablePermissions>('/api/superadmin/roles/permissions/available'),
    staleTime: 300000, // 5 minutes - this data rarely changes
  })
}

/**
 * Hook to update role permissions
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      roleName,
      permissions,
    }: {
      roleName: RoleType
      permissions: Permission[]
    }) =>
      put<RolePermissions>(`/api/superadmin/roles/${roleName}/permissions`, {
        permissions,
      }),
    onSuccess: (_, variables) => {
      // Invalidate roles list and specific role
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['role', variables.roleName] })
    },
  })
}
