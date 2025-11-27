import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { get } from '@/lib/superadminApi'
import { API_BASE } from '@/lib/api'

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down'
  responseTime?: number
  uptime?: number
  lastCheck: Date
  errorRate?: number
  message?: string
}

export interface SystemHealth {
  frontend: ComponentHealth
  backend: ComponentHealth
  database: ComponentHealth
  agentic: ComponentHealth
  timestamp: Date
  poolStats: {
    active: number
    idle: number
    total: number
  }
  uptime: {
    day: number
    week: number
    month: number
  }
}

export interface HealthSnapshot {
  id: string
  frontend_status: string
  backend_status: string
  database_status: string
  agentic_status: string
  backend_response: number | null
  database_response: number | null
  error_rate: number | null
  timestamp: Date
}

export interface HealthHistoryData {
  snapshots: HealthSnapshot[]
  period: {
    hours: number
    from: Date
    to: Date
  }
}

/**
 * Hook to fetch current system health with optional WebSocket real-time updates
 */
export function useSystemHealth(refetchInterval: number = 30000, enableWebSocket: boolean = false) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  const query = useQuery<SystemHealth>({
    queryKey: ['systemHealth'],
    queryFn: () => get<SystemHealth>('/api/superadmin/system/health'),
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
          console.log('[SystemHealth] WebSocket connected')
          // Subscribe to health updates
          ws.send(JSON.stringify({
            type: 'subscribe',
            subscriptions: ['health']
          }))
        }
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            if (message.type === 'system_health') {
              // Update the query cache with new health data
              queryClient.setQueryData(['systemHealth'], message.data)
            }
          } catch (err) {
            console.error('[SystemHealth] Error parsing WebSocket message:', err)
          }
        }
        
        ws.onerror = (error) => {
          console.error('[SystemHealth] WebSocket error:', error)
        }
        
        ws.onclose = () => {
          console.log('[SystemHealth] WebSocket closed')
          wsRef.current = null
        }
        
        wsRef.current = ws
      } catch (err) {
        console.error('[SystemHealth] Error creating WebSocket:', err)
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

/**
 * Hook to fetch system health history
 */
export function useSystemHealthHistory(hours: number = 24) {
  return useQuery<HealthHistoryData>({
    queryKey: ['systemHealthHistory', hours],
    queryFn: () => get<HealthHistoryData>('/api/superadmin/system/health/history', { hours }),
    staleTime: 60000,
  })
}

/**
 * Hook to fetch database pool statistics
 */
export function useDatabasePoolStats(refetchInterval: number = 30000) {
  return useQuery({
    queryKey: ['databasePoolStats'],
    queryFn: () => get('/api/superadmin/system/health/pool'),
    refetchInterval,
    staleTime: 20000,
  })
}
