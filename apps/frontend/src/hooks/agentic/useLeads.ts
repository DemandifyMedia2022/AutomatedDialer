import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLeads } from '@/lib/agenticApi'

export function useLeads(page: number) {
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', page],
    queryFn: () => getLeads(page),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    placeholderData: (prev: any) => prev, // keep previous page data while loading
  })

  const refreshLeads = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }

  return {
    leads: data?.leads || [],
    totalPages: data?.total_pages || 1,
    startIndex: data?.start_index || 0,
    totalLeads: data?.total_leads || 0,
    currentPage: data?.page || page,
    loading: isLoading,
    error,
    refreshLeads
  }
}
