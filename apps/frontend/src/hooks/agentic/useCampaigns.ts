import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCampaigns } from '@/lib/agenticApi'

export function useCampaigns() {
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const refreshCampaigns = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  return {
    campaigns: data?.campaigns || [],
    loading: isLoading,
    error,
    refreshCampaigns
  }
}