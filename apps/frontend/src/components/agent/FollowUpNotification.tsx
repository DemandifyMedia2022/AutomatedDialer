"use client"

import { useState, useEffect } from "react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { Bell, Phone, Clock, AlertTriangle, User, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface FollowUpCall {
  id: number | string
  destination: string | null
  start_time: string
  disposition: string | null
  username?: string | null
}

interface FollowUpNotificationProps {
  className?: string
}

export function FollowUpNotification({ className }: FollowUpNotificationProps) {
  const [followUps, setFollowUps] = useState<FollowUpCall[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchFollowUps()
  }, [])

  const fetchFollowUps = async () => {
    setLoading(true)
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
        console.log('All calls:', allCalls.length)
        
        // Filter calls for follow-ups (only show calls that are at least 30 minutes old)
        const filteredCalls = allCalls.filter((call: any) => {
          const disposition = (call.disposition || '').toUpperCase().trim()
          const status = (call.status || '').toLowerCase().trim()
          const remarks = (call.remarks || '').toLowerCase().trim()
          
          const hasFollowUpDisposition = disposition === 'FOLLOW-UP CALL' && status === 'disconnected'
          const hasNoAnswerDisposition = disposition === 'NO ANSWER'
          const hasBusyDisposition = disposition === 'BUSY'
          const hasFollowUpRemarks = remarks === 'follow-up'
          
          // Check if call is at least 30 minutes old
          const minutesSinceCall = call.start_time ? 
            Math.floor((new Date().getTime() - new Date(call.start_time).getTime()) / (1000 * 60)) : 0
          const isAtLeast30MinutesOld = minutesSinceCall >= 30
          
          return (hasFollowUpDisposition || hasNoAnswerDisposition || hasBusyDisposition || hasFollowUpRemarks) && isAtLeast30MinutesOld
        })
        
        console.log('Filtered follow-ups:', filteredCalls.length)
        setFollowUps(filteredCalls)
      }
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (call: FollowUpCall) => {
    const daysSinceCall = call.start_time ? 
      Math.floor((new Date().getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24)) : 0
    
    if (daysSinceCall > 7) return "bg-red-500"
    if (daysSinceCall > 3) return "bg-yellow-500"
    return "bg-blue-500"
  }

  const getPriorityText = (call: FollowUpCall) => {
    const daysSinceCall = call.start_time ? 
      Math.floor((new Date().getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24)) : 0
    
    if (daysSinceCall > 7) return "High Priority"
    if (daysSinceCall > 3) return "Medium Priority"
    return "New"
  }

  if (loading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (followUps.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("relative", className)}>
            <Bell className="h-4 w-4" />
            <span className="sr-only">Follow-up notifications</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Follow-up Calls
            </DialogTitle>
            <DialogDescription>
              No follow-up calls require attention at this time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("relative", className)}>
          <Bell className="h-4 w-4" />
          {followUps.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {followUps.length > 99 ? "99+" : followUps.length}
            </Badge>
          )}
          <span className="sr-only">Follow-up notifications</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Follow-up Calls Required
            <Badge variant="secondary">{followUps.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            You have {followUps.length} follow-up call{followUps.length === 1 ? '' : 's'} that need attention
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {followUps.map((call) => (
            <Card key={call.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{call.destination || 'Unknown'}</span>
                  </div>
                  <Badge 
                    className={cn("text-white text-xs", getPriorityColor(call))}
                  >
                    {getPriorityText(call)}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(call.start_time), 'MMM dd, yyyy')}</span>
                    <span>•</span>
                    <span>{format(new Date(call.start_time), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    <span className="font-medium text-orange-600">
                      {call.disposition || 'Unknown disposition'}
                    </span>
                  </div>
                  {call.username && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>Agent: {call.username}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {(() => {
                        const now = new Date()
                        const callTime = new Date(call.start_time)
                        const minutesSinceCall = Math.floor((now.getTime() - callTime.getTime()) / (1000 * 60))
                        const hoursSinceCall = Math.floor(minutesSinceCall / 60)
                        const daysSinceCall = Math.floor(hoursSinceCall / 24)
                        
                        if (daysSinceCall > 0) {
                          return `${daysSinceCall} day${daysSinceCall === 1 ? '' : 's'} ago`
                        } else if (hoursSinceCall > 0) {
                          return `${hoursSinceCall} hour${hoursSinceCall === 1 ? '' : 's'} ago`
                        } else {
                          return `${minutesSinceCall} minute${minutesSinceCall === 1 ? '' : 's'} ago`
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard/agent/my-calls/follow-up-calls'}
            className="flex-1"
          >
            View All Follow-ups
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
