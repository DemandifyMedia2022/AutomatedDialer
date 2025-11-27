'use client'

import { useState, useMemo } from 'react'
import { Activity, Filter, Trash2, Wifi, WifiOff, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { useActivityFeed, ActivityEvent } from '@/hooks/useActivityFeed'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ActivityFeedPage() {
  const [selectedFilters, setSelectedFilters] = useState<Array<'auth' | 'api' | 'database' | 'error'>>([
    'auth',
    'api',
    'database',
    'error'
  ])
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null)

  const { events, isConnected, isConnecting, error, setFilters, clearEvents } = useActivityFeed({
    autoConnect: true,
    eventFilters: selectedFilters
  })

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => selectedFilters.includes(event.type))
  }, [events, selectedFilters])

  // Toggle filter
  const toggleFilter = (filter: 'auth' | 'api' | 'database' | 'error') => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter]
    
    setSelectedFilters(newFilters)
    setFilters(newFilters)
  }

  // Get severity color
  const getSeverityColor = (severity: ActivityEvent['severity']) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
      case 'error':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
      case 'critical':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800'
    }
  }

  // Get severity icon
  const getSeverityIcon = (severity: ActivityEvent['severity']) => {
    switch (severity) {
      case 'info':
        return <Info className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'critical':
        return <XCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  // Get type color
  const getTypeColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'auth':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200'
      case 'api':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
      case 'database':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200'
      case 'error':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) {
      return `${seconds}s ago`
    } else if (minutes < 60) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      return date.toLocaleString()
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin">Super Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Activity Feed</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Connection Status */}
        <div className={`rounded-lg border p-3 ${
          isConnected 
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30' 
            : error 
            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30' 
            : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Connected to live feed</span>
                </>
              ) : isConnecting ? (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Connecting...</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{error}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Disconnected</span>
                </>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredEvents.length} events
            </Badge>
          </div>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Event Filters
                </CardTitle>
                <CardDescription>Filter events by type</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearEvents}
                disabled={events.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Events
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedFilters.includes('auth') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('auth')}
              >
                Authentication
              </Button>
              <Button
                variant={selectedFilters.includes('api') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('api')}
              >
                API Requests
              </Button>
              <Button
                variant={selectedFilters.includes('database') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('database')}
              >
                Database
              </Button>
              <Button
                variant={selectedFilters.includes('error') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('error')}
              >
                Errors
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Stream
            </CardTitle>
            <CardDescription>Real-time system events and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {isConnecting && events.length === 0 ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No events yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isConnected ? 'Waiting for activity...' : 'Connect to see live events'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 sm:p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(event.severity)}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="mt-0.5 flex-shrink-0">
                            {getSeverityIcon(event.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge className={`text-xs ${getTypeColor(event.type)}`}>
                                {event.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {event.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground sm:hidden">
                                {formatTimestamp(event.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm font-medium break-words">{event.message}</p>
                            {event.metadata?.username && (
                              <p className="text-xs text-muted-foreground mt-1">
                                User: {event.metadata.username}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about this activity event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 pb-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Event ID</label>
                  <p className="text-sm font-mono break-all">{selectedEvent.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Type</label>
                  <Badge className={getTypeColor(selectedEvent.type)}>
                    {selectedEvent.type}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Severity</label>
                  <Badge variant="outline">{selectedEvent.severity}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Message</label>
                  <p className="text-sm break-words">{selectedEvent.message}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Timestamp</label>
                  <p className="text-sm">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                </div>
                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Metadata</label>
                    <ScrollArea className="max-h-[200px]">
                      <pre className="text-xs p-3 bg-muted dark:bg-muted/50 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
