import { useEffect, useRef, useState, useCallback } from 'react'
import { API_BASE } from '@/lib/api'

export interface ActivityEvent {
  id: string
  type: 'auth' | 'api' | 'database' | 'error'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
  metadata?: any
}

interface UseActivityFeedOptions {
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  eventFilters?: Array<'auth' | 'api' | 'database' | 'error'>
}

interface UseActivityFeedReturn {
  events: ActivityEvent[]
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
  setFilters: (filters: Array<'auth' | 'api' | 'database' | 'error'>) => void
  clearEvents: () => void
}

/**
 * Custom hook for WebSocket connection to activity feed
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    eventFilters = ['auth', 'api', 'database', 'error']
  } = options

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<Array<'auth' | 'api' | 'database' | 'error'>>(eventFilters)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)

  /**
   * Get WebSocket URL with authentication token
   */
  const getWebSocketUrl = useCallback((): string => {
    // Convert http/https to ws/wss
    const wsBase = API_BASE.replace(/^http/, 'ws')
    
    // Get auth token from cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = decodeURIComponent(value)
      return acc
    }, {} as Record<string, string>)
    
    const token = cookies['auth_token'] || cookies['token']
    
    // Add token as query parameter
    return `${wsBase}/ws/activity-feed${token ? `?token=${encodeURIComponent(token)}` : ''}`
  }, [])

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const wsUrl = getWebSocketUrl()
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[ActivityFeed] WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Send initial filters
        if (currentFilters.length > 0) {
          ws.send(JSON.stringify({
            type: 'set_filters',
            filters: currentFilters
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === 'activity_event') {
            // Add new event to the beginning of the list
            setEvents((prev) => [message.event, ...prev].slice(0, 500)) // Keep last 500 events
          } else if (message.type === 'connection') {
            console.log('[ActivityFeed] Connection established:', message.status)
          } else if (message.type === 'filters_updated') {
            console.log('[ActivityFeed] Filters updated:', message.filters)
          }
        } catch (err) {
          console.error('[ActivityFeed] Error parsing message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('[ActivityFeed] WebSocket error:', event)
        setError('WebSocket connection error')
        setIsConnecting(false)
      }

      ws.onclose = (event) => {
        console.log('[ActivityFeed] WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        wsRef.current = null

        // Attempt reconnection if enabled
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`[ActivityFeed] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[ActivityFeed] Error creating WebSocket:', err)
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket connection')
      setIsConnecting(false)
    }
  }, [getWebSocketUrl, currentFilters, reconnectInterval, maxReconnectAttempts])

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  /**
   * Update event type filters
   */
  const setFilters = useCallback((filters: Array<'auth' | 'api' | 'database' | 'error'>) => {
    setCurrentFilters(filters)

    // Send filter update to server if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set_filters',
        filters
      }))
    }
  }, [])

  /**
   * Clear all events
   */
  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      shouldReconnectRef.current = true
      connect()
    }

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [autoConnect, connect])

  return {
    events,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    setFilters,
    clearEvents
  }
}
