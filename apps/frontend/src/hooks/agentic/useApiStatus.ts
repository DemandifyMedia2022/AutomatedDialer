import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getStatus } from '@/lib/agenticApi'
import type { ApiStatus } from '@/types/agentic'

export function useApiStatus() {
  const queryClient = useQueryClient()
  
  const { data: status, isError } = useQuery<ApiStatus>({
    queryKey: ['status'],
    queryFn: getStatus,
    refetchInterval: 1000,
    staleTime: 0,
    retry: (failureCount) => failureCount < 3,
  })

  const refreshStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['status'] })
  }, [queryClient])

  return {
    status: status || {
      status: 'idle',
      running: false,
      lead_index: null,
      campaign: null,
      campaign_label: null,
      auto_next: false,
      lead: null
    },
    isError,
    refreshStatus
  }
}