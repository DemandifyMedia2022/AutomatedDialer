"use client"

import { useState, useEffect } from "react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface FollowUpCall {
  id: number | string
  destination: string | null
  start_time: string
  disposition: string | null
}

export function useFollowUpNotifications() {
  const [hasShownLoginNotification, setHasShownLoginNotification] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!hasShownLoginNotification) {
      checkAndShowLoginNotification()
      setHasShownLoginNotification(true)
    }
  }, [hasShownLoginNotification])

  const checkAndShowLoginNotification = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'

      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }

      // Get calls from last 7 days
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const params = new URLSearchParams()
      params.set('from', format(weekAgo, 'yyyy-MM-dd'))
      params.set('to', format(today, 'yyyy-MM-dd'))

      const response = await fetch(`${API_BASE}/api/calls/mine?${params.toString()}`, {
        headers,
        credentials,
      })

      if (response.ok) {
        const data = await response.json()
        const allCalls = data.items || data.calls || []

        // Filter calls for follow-ups
        const filteredCalls = allCalls.filter((call: any) => {
          const remarks = (call.remarks || '').trim().toLowerCase()

          const allowedRemarks = ['busy', 'not answered', 'follow-ups']
          const isRemarkMatch = allowedRemarks.includes(remarks)

          if (!isRemarkMatch) return false
          if (call.follow_up === true) return false
          if (call.schedule_call && new Date(call.schedule_call) > new Date()) return false

          return true
        })

        if (filteredCalls.length > 0) {
          // Check for high priority follow-ups (older than 7 days)
          const highPriorityCalls = filteredCalls.filter((call: FollowUpCall) => {
            const daysSinceCall = call.start_time ?
              Math.floor((new Date().getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24)) : 0
            return daysSinceCall > 7
          })

          if (highPriorityCalls.length > 0) {
            toast({
              title: "⚠️ Urgent Follow-ups Required",
              description: `You have ${highPriorityCalls.length} high-priority follow-up call${highPriorityCalls.length === 1 ? '' : 's'} that are overdue. Check your Follow-up Calls section.`,
              duration: 10000,
            })
          } else {
            toast({
              title: "📞 Follow-up Calls Available",
              description: `You have ${filteredCalls.length} follow-up call${filteredCalls.length === 1 ? '' : 's'} that need attention.`,
              duration: 8000,
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to check follow-ups:', error)
    }
  }

  return { hasShownLoginNotification }
}
