import { useQuery, useMutation } from '@tanstack/react-query'
import { get, post } from '@/lib/superadminApi'

export interface AuditLog {
  id: string
  timestamp: Date
  user_id: number | null
  username: string | null
  action: string
  resource: string
  resource_id: string | null
  changes: {
    before: any
    after: any
  } | null
  ip: string | null
  user_agent: string | null
  outcome: 'success' | 'failure'
}

export interface AuditLogsData {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  userId?: number
  action?: string
  resource?: string
  outcome?: 'success' | 'failure'
}

export interface ExportAuditLogsRequest {
  format: 'csv' | 'json' | 'excel'
  filters?: Omit<AuditLogFilters, 'page' | 'limit'>
}

/**
 * Hook to fetch paginated audit logs with filters
 */
export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery<AuditLogsData>({
    queryKey: ['auditLogs', filters],
    queryFn: () => get<AuditLogsData>('/api/superadmin/audit/logs', filters),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch audit log details by ID
 */
export function useAuditLogDetails(logId: string | null) {
  return useQuery<AuditLog>({
    queryKey: ['auditLog', logId],
    queryFn: () => get<AuditLog>(`/api/superadmin/audit/logs/${logId}`),
    enabled: !!logId,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to export audit logs
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (request: ExportAuditLogsRequest) => {
      const response = await fetch('/api/superadmin/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error('Failed to export audit logs')
      }

      return response.blob()
    },
  })
}
