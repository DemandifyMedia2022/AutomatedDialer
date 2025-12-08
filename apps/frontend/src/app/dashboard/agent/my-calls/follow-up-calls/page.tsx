"use client"

import { useState, useEffect, useMemo, Fragment, useRef } from "react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { Phone, Clock, User, MessageSquare, CheckCircle, XCircle, AlertCircle, Calendar as CalendarIcon, ArrowUpDown, Filter, RefreshCw, Bell } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AgentSidebar } from "../../components/AgentSidebar"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface FollowUpCall {
  id: number | string
  extension: string | null
  username?: string | null
  destination: string | null
  start_time: string
  end_time: string | null
  call_duration: number | null
  disposition: string | null
  status?: string | null
  remarks?: string | null
  Followup_notes?: string | null
  recording_url?: string | null
  sip_status?: number | null
  sip_reason?: string | null
  hangup_cause?: string | null
  follow_up?: boolean
  schedule_call?: string | null
}

export default function FollowUpCalls() {
  const { toast } = useToast()
  const [followUps, setFollowUps] = useState<FollowUpCall[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'number'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpCall | null>(null)
  const [notes, setNotes] = useState("")
  const [disposition, setDisposition] = useState("")
  const [scheduleCall, setScheduleCall] = useState<FollowUpCall | null>(null)
  const [scheduleDateTime, setScheduleDateTime] = useState("")
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const notifiedCallsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchFollowUps()
  }, [dateRange])
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        fetchFollowUps()
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Notification system for scheduled calls with deduplication
  useEffect(() => {
    const checkScheduledCalls = () => {
      const now = new Date()
      const scheduledCalls = followUps.filter(call => 
        call.schedule_call && 
        new Date(call.schedule_call) > now
      )

      if (scheduledCalls.length > 0) {
        let newNotifications = 0
        
        scheduledCalls.forEach(call => {
          const scheduledTime = new Date(call.schedule_call!)
          const timeUntilCall = scheduledTime.getTime() - now.getTime()
          const minutesUntilCall = Math.floor(timeUntilCall / (1000 * 60))
          
          // Create unique key for this notification window
          const notificationKey = `${call.id}-${Math.floor(minutesUntilCall / 5)}`

          // Show notification for calls scheduled in the next 30 minutes
          // Only notify once per 5-minute window to avoid spam
          if (minutesUntilCall <= 30 && minutesUntilCall > 0 && !notifiedCallsRef.current.has(notificationKey)) {
            notifiedCallsRef.current.add(notificationKey)
            newNotifications++
            
            toast({
              title: "Upcoming Scheduled Call",
              description: `Call with ${call.destination || 'Unknown'} scheduled in ${minutesUntilCall} minutes`,
              action: (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedFollowUp(call)
                    setShowScheduleDialog(true)
                  }}
                >
                  View
                </Button>
              ),
            })
          }
        })
      }
      
      // Clean up old notification keys (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      notifiedCallsRef.current.forEach(key => {
        const parts = key.split('-')
        if (parts.length > 1) {
          const timestamp = parseInt(parts[parts.length - 1])
          if (timestamp < oneHourAgo) {
            notifiedCallsRef.current.delete(key)
          }
        }
      })
    }

    // Initial check
    checkScheduledCalls()

    // Set up interval to check every 5 minutes (more frequent but with deduplication)
    notificationIntervalRef.current = setInterval(checkScheduledCalls, 5 * 60 * 1000)

    // Cleanup interval on unmount
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current)
      }
    }
  }, [followUps, toast])

  const checkScheduledCallsManually = () => {
    const now = new Date()
    const scheduledCalls = followUps.filter(call => 
      call.schedule_call && 
      new Date(call.schedule_call) > now
    )

    if (scheduledCalls.length > 0) {
      toast({
        title: "Scheduled Calls Status",
        description: `You have ${scheduledCalls.length} scheduled calls`,
      })
    } else {
      toast({
        title: "No Scheduled Calls",
        description: "You don't have any scheduled calls at the moment.",
      })
    }
  }

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

      // Build query parameters
      const params = new URLSearchParams()
      
      if (dateRange?.from) {
        params.set('from', format(dateRange.from, 'yyyy-MM-dd'))
      }
      if (dateRange?.to) {
        params.set('to', format(dateRange.to, 'yyyy-MM-dd'))
      }
      if (searchTerm) {
        params.set('query', searchTerm)
      }

      const response = await fetch(`${API_BASE}/api/calls/mine?${params.toString()}`, {
        headers,
        credentials,
      })

      if (response.ok) {
        const data = await response.json()
        const allCalls = data.items || data.calls || []
        
        // Filter calls - improved logic with deduplication
        const seenCallIds = new Set<number | string>()
        const filteredCalls = allCalls.filter((call: FollowUpCall) => {
          // Deduplicate by call ID
          if (seenCallIds.has(call.id)) {
            return false
          }
          
          const remarks = (call.remarks || '').toLowerCase().trim()
          const disposition = (call.disposition || '').toLowerCase().trim()
          const status = (call.status || '').toLowerCase().trim()
          const hangupCause = (call.hangup_cause || '').toLowerCase().trim()
          const sipReason = (call.sip_reason || '').toLowerCase().trim()
          
          const allText = `${remarks} ${disposition} ${status} ${hangupCause} ${sipReason}`.toLowerCase()
          
          // EXCLUDE unwanted call types (case-insensitive)
          const excludePatterns = [
            'vm-operator', 'vm operator', 'voicemail',
            'dnc', 'do not call', 'donotcall',
            'invalid country', 'invalid-country',
            'vm-rpc', 'vm rpc', 'vmrpc',
            'invalid number', 'invalid job', 'invalid industry', 'invalid emp'
          ]
          
          if (excludePatterns.some(pattern => allText.includes(pattern))) {
            return false
          }
          
          // INCLUDE follow-up worthy calls
          const hasNoAnswer = allText.includes('no answer') || 
                            allText.includes('no-answer') ||
                            allText.includes('not answered') ||
                            [600, 408, 480].includes(call.sip_status || 0)
          
          const hasBusy = allText.includes('busy') || 
                         [486, 603].includes(call.sip_status || 0)
          
          const hasCallFailed = allText.includes('call failed') || 
                              allText.includes('failed') ||
                              [500, 503].includes(call.sip_status || 0)
          
          const hasFollowUp = allText.includes('follow-up') || 
                            allText.includes('follow up') ||
                            allText.includes('followup') ||
                            call.follow_up === true
          
          const isMatch = hasNoAnswer || hasBusy || hasCallFailed || hasFollowUp
          
          if (isMatch) {
            seenCallIds.add(call.id)
          }
          
          return isMatch
        })
        
        setFollowUps(filteredCalls)
      }
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFollowUpStatus = async (id: number | string, disposition: string, notes?: string) => {
    if (isUpdating) return
    
    setIsUpdating(true)
    
    // Optimistic update
    const previousFollowUps = [...followUps]
    setFollowUps(prev => prev.filter(call => call.id !== id))
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/calls/${id}`, {
        method: 'PATCH',
        headers,
        credentials,
        body: JSON.stringify({ 
          remarks: disposition,
          Followup_notes: notes,
          follow_up: false
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update follow-up: ${response.statusText}`)
      }
      
      setSelectedFollowUp(null)
      setNotes("")
      setDisposition("")
      
      toast({
        title: "Follow-up Completed",
        description: "The follow-up call has been marked as completed.",
      })
    } catch (error) {
      // Rollback on error
      setFollowUps(previousFollowUps)
      
      toast({
        variant: "destructive",
        title: "Failed to Update Follow-up",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }



  const scheduleCallForFollowUp = async (id: number | string, scheduleDateTime: string) => {
    if (isScheduling) return
    
    // Validate schedule time
    const scheduledDate = new Date(scheduleDateTime)
    const now = new Date()
    
    if (scheduledDate <= now) {
      toast({
        variant: "destructive",
        title: "Invalid Schedule Time",
        description: "Please select a future date and time.",
      })
      return
    }
    
    // Check if scheduling too far in future (more than 90 days)
    const maxFutureDate = new Date()
    maxFutureDate.setDate(maxFutureDate.getDate() + 90)
    
    if (scheduledDate > maxFutureDate) {
      toast({
        variant: "destructive",
        title: "Invalid Schedule Time",
        description: "Cannot schedule more than 90 days in advance.",
      })
      return
    }
    
    setIsScheduling(true)
    
    // Optimistic update
    const previousFollowUps = [...followUps]
    setFollowUps(prev => prev.map(call => 
      call.id === id 
        ? { ...call, schedule_call: scheduleDateTime }
        : call
    ))
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }

      const callId = String(id).trim()
      const requestUrl = `${API_BASE}/api/calls/${callId}`

      const response = await fetch(requestUrl, {
        method: 'PATCH',
        headers,
        credentials,
        body: JSON.stringify({ schedule_call: scheduleDateTime })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }
        throw new Error(errorData.message || `Failed to schedule call: ${response.status}`)
      }

      setShowScheduleDialog(false)
      setScheduleCall(null)
      setScheduleDateTime("")
      
      toast({
        title: "Call Scheduled Successfully!",
        description: `Follow-up call scheduled for ${format(new Date(scheduleDateTime), "PPP 'at' p")}`,
      })
    } catch (error) {
      // Rollback on error
      setFollowUps(previousFollowUps)
      
      toast({
        variant: "destructive",
        title: "Failed to Schedule Call",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const markAsFollowedUp = async (id: number | string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }

      // Update the call to mark it as followed up
      const response = await fetch(`${API_BASE}/api/calls/${id}`, {
        method: 'PATCH',
        headers,
        credentials,
        body: JSON.stringify({ follow_up: true })
      })

      if (!response.ok) {
        throw new Error('Failed to mark call as followed up')
      }

      console.log('Call marked as followed up successfully')
      
      // Update the local state
      setFollowUps(prev => prev.map(call => 
        call.id === id 
          ? { ...call, follow_up: true }
          : call
      ))

      setSelectedFollowUp(null)
      setNotes("")
      setDisposition("")
      
      // Show success notification
      toast({
        title: "Call Marked as Followed Up",
        description: "The call has been successfully marked as followed up.",
      })
    } catch (error) {
      console.error('Failed to mark as followed up:', error)
      toast({
        variant: "destructive",
        title: "Failed to Mark as Followed Up",
        description: "Please try again or contact support if the issue persists.",
      })
    }
  }

  const getStatusBadge = (call: FollowUpCall) => {
    // Determine status based on call data
    const isCompleted = call.remarks === 'COMPLETED'
    const isMissed = call.sip_status === 486 || call.sip_status === 603 || call.hangup_cause?.includes('busy')
    const isFollowedUp = call.follow_up === true
    const isScheduled = call.schedule_call != null && new Date(call.schedule_call) > new Date()
    
    if (isCompleted) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed
        </Badge>
      )
    } else if (isScheduled) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-blue-500">
          <CalendarIcon className="w-3 h-3" />
          Scheduled
        </Badge>
      )
    } else if (isFollowedUp) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <CheckCircle className="w-3 h-3" />
          Followed Up
        </Badge>
      )
    } else if (isMissed) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Missed
        </Badge>
      )
    } else {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      )
    }
  }

  const getPriorityBadge = (call: FollowUpCall) => {
    // Determine priority by age since priority field is no longer available
    const daysSinceCall = call.start_time ? 
      Math.floor((new Date().getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24)) : 0
    
    if (daysSinceCall > 7) {
      return (
        <Badge className="bg-red-100 text-red-800">
          High Priority
        </Badge>
      )
    } else if (daysSinceCall > 3) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Medium Priority
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          Low Priority
        </Badge>
      )
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  
  const getPriorityLevel = (call: FollowUpCall) => {
    const daysSinceCall = call.start_time ? 
      Math.floor((new Date().getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24)) : 0
    
    if (daysSinceCall > 7) return 3 // High priority
    if (daysSinceCall > 3) return 2 // Medium priority
    return 1 // Low priority
  }

  const sortedAndFilteredFollowUps = useMemo(() => {
    const filtered = followUps.filter(call => {
      const matchesSearch = !searchTerm || 
        (call.destination && call.destination.includes(searchTerm)) ||
        (call.username && call.username.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const isFollowedUp = call.follow_up === true
      const isScheduled = call.schedule_call != null && new Date(call.schedule_call) > new Date()
      const isCompleted = call.remarks === 'COMPLETED'
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "pending" && !isFollowedUp && !isScheduled && !isCompleted) || 
        (statusFilter === "scheduled" && isScheduled) ||
        (statusFilter === "completed" && isCompleted) ||
        (statusFilter === "missed" && (call.sip_status === 486 || call.sip_status === 603))
      
      return matchesSearch && matchesStatus
    })

    // Sort the filtered results
    return filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          const dateA = new Date(a.start_time).getTime()
          const dateB = new Date(b.start_time).getTime()
          comparison = dateB - dateA // Most recent first
          break
        case 'priority':
          const priorityA = getPriorityLevel(a)
          const priorityB = getPriorityLevel(b)
          comparison = priorityB - priorityA // Highest priority first
          if (priorityA === priorityB) {
            // If same priority, sort by date
            const dateA = new Date(a.start_time).getTime()
            const dateB = new Date(b.start_time).getTime()
            comparison = dateB - dateA
          }
          break
        case 'number':
          comparison = (a.destination || '').localeCompare(b.destination || '')
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [followUps, searchTerm, statusFilter, sortBy, sortOrder])

  return (
    <>
      <SidebarProvider>
      <AgentSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]:sidebar-sidebar:h-12 group-has-[[data-collapsible=icon]]:sidebar-sidebar:w-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard/agent">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard/agent/my-calls">My Calls</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pending Calls</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Pending Follow-up Calls</h1>
                <p className="text-muted-foreground">View Not Answered, Call Failed, Follow Ups, and Busy call records</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bell className="w-4 h-4 text-green-500 animate-pulse" />
                  <span>Notifications Active (10 min)</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={checkScheduledCallsManually}
                  className="ml-2"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Check Now
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Search</label>
                      <Input
                        placeholder="Search by phone number or agent..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="w-full lg:w-auto">
                      <label className="text-sm font-medium mb-2 block">Date Range</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full lg:w-[280px] justify-start text-left font-normal",
                              !dateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "LLL dd, y")} -{" "}
                                  {format(dateRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(dateRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                  <div className="w-full lg:w-auto">
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full lg:w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full lg:w-auto">
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={(value: 'date' | 'priority' | 'number') => setSortBy(value)}>
                      <SelectTrigger className="w-full lg:w-[140px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="number">Phone Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full lg:w-auto">
                    <label className="text-sm font-medium mb-2 block">Order</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="w-full lg:w-auto"
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                  </div>

                  <div className="w-full lg:w-auto">
                    <label className="text-sm font-medium mb-2 block">&nbsp;</label>
                    <Button onClick={fetchFollowUps} disabled={loading} className="w-full lg:w-auto">
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Follow-up Calls List */}
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Follow-up Calls 
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({sortedAndFilteredFollowUps.length} {sortedAndFilteredFollowUps.length === 1 ? 'call' : 'calls'})
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sorted by {sortBy === 'date' ? 'date' : sortBy === 'priority' ? 'priority' : 'phone number'} ({sortOrder === 'desc' ? 'newest first' : 'oldest first'})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </span>
                </div>
              </div>

              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading follow-up calls...</p>
                  </CardContent>
                </Card>
              ) : sortedAndFilteredFollowUps.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No follow-up calls found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {searchTerm || statusFilter !== "all"
                        ? "No follow-up calls match your current filters. Try adjusting your search or filter criteria."
                        : "Great! You don't have any Busy, Not Answered, Disconnected, or Follow-up calls (excluding Lead calls)."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sortedAndFilteredFollowUps.map((call, index) => (
                    <Card key={call.id} className="hover:shadow-md transition-all duration-200 border-0 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                              <Phone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {call.destination || 'Unknown Number'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(call)}
                                {getPriorityBadge(call)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedFollowUp(call)
                                setShowScheduleDialog(true)
                              }}
                              disabled={isScheduling}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {isScheduling ? 'Scheduling...' : 'Schedule'}
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => setSelectedFollowUp(call)}
                                  disabled={isUpdating}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {isUpdating ? 'Updating...' : 'Complete'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Complete Follow-up Call</DialogTitle>
                                  <DialogDescription>
                                    Add notes about the follow-up call with {selectedFollowUp?.destination || 'Unknown'}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="disposition">Disposition</Label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                                      {[
                                        'Call Failed','Lead','Lost','DNC','VM-RPC','VM-Operator','Not an RPC','Invalid Number','Invalid Job Title','Invalid Country','Invalid Industry','Invalid EMP-Size','Follow-Ups','Busy','Wrong Number','Not Answered','Disconnected','Contact Discovery'
                                      ].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => setDisposition(opt)}
                                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                            disposition === opt 
                                              ? 'bg-blue-600 text-white' 
                                              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                    {disposition && (
                                      <div className="mt-2 text-sm text-muted-foreground">
                                        Selected: <span className="font-medium">{disposition}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <Label htmlFor="notes">Call Notes</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Enter details about the follow-up call..."
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                      rows={4}
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => {
                                        setSelectedFollowUp(null)
                                        setNotes('')
                                        setDisposition('')
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      onClick={() => {
                                        if (selectedFollowUp && disposition) {
                                          updateFollowUpStatus(selectedFollowUp.id, disposition, notes)
                                        }
                                      }}
                                      disabled={!disposition || isUpdating}
                                    >
                                      {isUpdating ? 'Updating...' : 'Mark as Completed'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        {call.remarks && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remarks:</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                              {call.remarks}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mt-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{new Date(call.start_time).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(call.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{call.username || 'Unknown'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                              {call.remarks || 'Unknown'}
                            </span>
                            {call.call_duration && (
                              <span className="text-xs">
                                {formatDuration(call.call_duration)}
                              </span>
                            )}
                          </div>
                        </div>
                        {call.Followup_notes && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                            <span className="font-medium">Notes:</span> {call.Followup_notes}
                          </div>
                        )}
                        </CardContent>
                      </Card>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      
      {/* Schedule Call Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Follow-up Call</DialogTitle>
              <DialogDescription>
                Schedule a follow-up call with {selectedFollowUp?.destination || 'Unknown'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="scheduleDateTime">Schedule Date & Time</Label>
                <Input
                  id="scheduleDateTime"
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowScheduleDialog(false)
                    setSelectedFollowUp(null)
                    setScheduleDateTime("")
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedFollowUp && scheduleDateTime) {
                      scheduleCallForFollowUp(selectedFollowUp.id, scheduleDateTime)
                    }
                  }}
                  disabled={!scheduleDateTime || isScheduling}
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Call'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </>
  )
}
