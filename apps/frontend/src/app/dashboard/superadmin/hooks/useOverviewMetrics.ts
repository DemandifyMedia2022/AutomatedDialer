import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { get } from '@/lib/superadminApi'
import { API_BASE } from '@/lib/api'

export interface OverviewMetrics {
  totalUsers: number
  activeUsers: number
  totalCallsToday: number
  activeCampaigns: number
  systemStatus: {
    frontend: 'healthy' | 'degraded' | 'down'
    backend: 'healthy' | 'degraded' | 'down'
    database: 'healthy' | 'degraded' | 'down'
    agentic: 'healthy' | 'degraded' | 'down'
  }
}

/**
 * Hook to fetch overview dashboard metrics with real-time WebSocket updates
 * Uses existing API endpoints for calls, campaigns, and users
 */
export function useOverviewMetrics(refetchInterval: number = 30000, enableWebSocket: boolean = true) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  const query = useQuery<OverviewMetrics>({
    queryKey: ['overviewMetrics'],
    queryFn: async () => {
      try {
        // Get today's date range for "Calls Today"
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayISO = today.toISOString()

        console.log('[OverviewMetrics] Fetching data for date:', todayISO)

        // Fetch data from existing API endpoints in parallel
        const [usersResponse, callsResponse, campaignsResponse, systemHealth] = await Promise.all([
          // Get all users
          get<any>('/api/superadmin/users', { page: 1, limit: 1 }).catch(err => {
            console.error('[OverviewMetrics] Error fetching users:', err)
            return { users: [], pagination: { total: 0 } }
          }),
          // Get calls from today
          get<any>('/api/calls', { from: todayISO, page: 1, pageSize: 1 }).catch(err => {
            console.error('[OverviewMetrics] Error fetching calls:', err)
            return { total: 0, items: [] }
          }),
          // Get active campaigns
          get<any>('/api/campaigns/active').catch(err => {
            console.error('[OverviewMetrics] Error fetching campaigns:', err)
            return { items: [] }
          }),
          // Get system health
          get<any>('/api/superadmin/system/health').catch(err => {
            console.error('[OverviewMetrics] Error fetching system health:', err)
            return {
              frontend: { status: 'down' },
              backend: { status: 'down' },
              database: { status: 'down' },
              agentic: { status: 'down' },
            }
          }),
        ])

        console.log('[OverviewMetrics] Users response:', usersResponse)
        console.log('[OverviewMetrics] Calls response:', callsResponse)
        console.log('[OverviewMetrics] Campaigns response:', campaignsResponse)

        // Extract counts from responses
        // Users endpoint returns: { users: [...], pagination: { total, page, limit, totalPages } }
        const totalUsers = usersResponse.pagination?.total || 0
        const totalCallsToday = callsResponse.total || 0
        const activeCampaigns = campaignsResponse.items?.length || 0

        // Calculate active users (users with calls today)
        // For now, we'll use a simplified approach - you can enhance this later
        const activeUsers = totalCallsToday > 0 ? Math.min(totalUsers, totalCallsToday) : 0

        const metrics = {
          totalUsers,
          activeUsers,
          totalCallsToday,
          activeCampaigns,
          systemStatus: {
            frontend: systemHealth.frontend?.status || 'down',
            backend: systemHealth.backend?.status || 'down',
            database: systemHealth.database?.status || 'down',
            agentic: systemHealth.agentic?.status || 'down',
          },
        }

        console.log('[OverviewMetrics] Final metrics:', metrics)
        return metrics
      } catch (error) {
        console.error('[OverviewMetrics] Error in queryFn:', error)
        throw error
      }
    },
    refetchInterval,
    staleTime: 20000,
  })

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableWebSocket) return

    const connectWebSocket = () => {
      try {
        const wsBase = API_BASE.replace(/^http/, 'ws')
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = decodeURIComponent(value)
          return acc
        }, {} as Record<string, string>)
        
        const token = cookies['auth_token'] || cookies['token']
        const wsUrl = `${wsBase}/ws/activity-feed${token ? `?token=${encodeURIComponent(token)}` : ''}`
        
        const ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log('[OverviewMetrics] WebSocket connected')
          // Subscribe to metrics updates
          ws.send(JSON.stringify({
            type: 'subscribe',
            subscriptions: ['metrics']
          }))
        }
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            if (message.type === 'metrics_update') {
              // Update the query cache with new metrics
              queryClient.setQueryData(['overviewMetrics'], (old: OverviewMetrics | undefined) => {
                if (!old) return old
                return {
                  ...old,
                  ...message.data
                }
              })
            }
          } catch (err) {
            console.error('[OverviewMetrics] Error parsing WebSocket message:', err)
          }
        }
        
        ws.onerror = (error) => {
          console.error('[OverviewMetrics] WebSocket error:', error)
        }
        
        ws.onclose = () => {
          console.log('[OverviewMetrics] WebSocket closed')
          wsRef.current = null
        }
        
        wsRef.current = ws
      } catch (err) {
        console.error('[OverviewMetrics] Error creating WebSocket:', err)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [enableWebSocket, queryClient])

  return query
}
