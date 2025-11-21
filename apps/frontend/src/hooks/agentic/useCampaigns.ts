import { useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE } from '@/lib/api'
import { USE_AUTH_COOKIE, getToken } from '@/lib/auth'

type CampaignOption = { key: string; label: string }

async function fetchCampaignsFromDb(): Promise<CampaignOption[]> {
  const headers: Record<string, string> = {}
  let credentials: RequestCredentials = 'omit'

  if (USE_AUTH_COOKIE) {
    credentials = 'include'
  } else {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/api/campaigns/active`, { headers, credentials })
  if (!res.ok) {
    throw new Error('Failed to load campaigns')
  }

  const data = await res.json().catch(() => null) as any
  const items: any[] = Array.isArray(data?.items) ? data.items : []

  const mapped = items
    .map((item) => {
      const key = String(item?.campaign_name || item?.campaign_id || item?.id || '').trim()
      if (!key) return null
      const label = String(item?.campaign_name || item?.display_name || key)
      return { key, label }
    })
    .filter((item): item is CampaignOption => !!item && !!item.key)

  // Deduplicate by key while preserving order
  const uniqueMap = new Map<string, CampaignOption>()
  for (const option of mapped) {
    if (!uniqueMap.has(option.key)) uniqueMap.set(option.key, option)
  }
  return Array.from(uniqueMap.values())
}

export function useCampaigns() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaignsFromDb,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const refreshCampaigns = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  return {
    campaigns: data || [],
    loading: isLoading,
    error,
    refreshCampaigns,
  }
}