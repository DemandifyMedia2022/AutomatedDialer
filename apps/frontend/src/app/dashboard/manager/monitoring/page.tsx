"use client"
import { ManagerSidebar } from "../components/ManagerSidebar"
import AIAssistant from "@/components/ai-assistant"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Search, Filter, Clock, Phone, Coffee, AlertCircle } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { SOCKET_IO_URL } from "@/lib/api"
import { io, Socket } from "socket.io-client"

interface AgentData {
  userId: number
  name: string
  extension: string | null
  status: 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'IDLE' | 'BREAK'
  firstLogin: Date | null
  lastLogout: Date | null
  durationSeconds: number
  lastStatusTs: Date | null
  onBreak: boolean
  breakReason: string | null
  totalBreakSecondsToday: number
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function getStatusBadgeVariant(status: string): { className: string; label: string } {
  switch (status) {
    case 'AVAILABLE':
      return { 
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30",
        label: "Available"
      }
    case 'ON_CALL':
      return { 
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30",
        label: "On Call"
      }
    case 'IDLE':
      return { 
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30",
        label: "Idle"
      }
    case 'BREAK':
      return { 
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 dark:bg-orange-500/15 dark:border-orange-500/30",
        label: "On Break"
      }
    case 'OFFLINE':
    default:
      return { 
        className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20 dark:bg-gray-500/15 dark:border-gray-500/30",
        label: "Offline"
      }
  }
}

function AgentCard({ agent }: { agent: AgentData }) {
  const statusInfo = getStatusBadgeVariant(agent.status)
  const isOnline = agent.status !== 'OFFLINE'
  
  return (
    <Card className="transition-all hover:shadow-md duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(agent.name)}`} 
                alt={agent.name} 
              />
              <AvatarFallback className="text-sm font-semibold">
                {agent.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
              {agent.extension && (
                <p className="text-xs text-muted-foreground">Ext: {agent.extension}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOnline && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium ml-auto">{formatDuration(agent.durationSeconds)}</span>
            </div>
            
            {agent.status === 'ON_CALL' && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-muted-foreground">Active call</span>
              </div>
            )}
            
            {agent.onBreak && agent.breakReason && (
              <div className="flex items-center gap-2 text-sm">
                <Coffee className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-muted-foreground truncate">{agent.breakReason}</span>
              </div>
            )}
            
            {agent.totalBreakSecondsToday > 0 && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t">
                <span className="text-muted-foreground text-xs">Total break time:</span>
                <span className="font-medium text-xs ml-auto">{formatDuration(agent.totalBreakSecondsToday)}</span>
              </div>
            )}
          </>
        )}
        
        {!isOnline && agent.lastLogout && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Last seen: {new Date(agent.lastLogout).toLocaleTimeString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AgentCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/presence/manager/agents`, { 
        credentials: 'include' 
      })
      const data = await response.json()
      
      if (data?.success && data?.items) {
        setAgents(data.items)
        setError(null)
      } else {
        setError("Failed to load agent data")
      }
    } catch (err) {
      setError("Unable to connect to server")
      console.error("Error loading agents:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
    
    const socket: Socket = io(SOCKET_IO_URL, { withCredentials: true })
    
    socket.on('connect', () => {
      setIsConnected(true)
    })
    
    socket.on('disconnect', () => {
      setIsConnected(false)
    })
    
    // Real-time updates
    const handleUpdate = () => loadAgents()
    socket.on('presence:update', handleUpdate)
    socket.on('session:opened', handleUpdate)
    socket.on('session:closed', handleUpdate)
    socket.on('break:started', handleUpdate)
    socket.on('break:ended', handleUpdate)
    
    // Polling fallback
    const pollInterval = setInterval(loadAgents, 15000)
    
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('presence:update', handleUpdate)
      socket.off('session:opened', handleUpdate)
      socket.off('session:closed', handleUpdate)
      socket.off('break:started', handleUpdate)
      socket.off('break:ended', handleUpdate)
      socket.close()
      clearInterval(pollInterval)
    }
  }, [])

  // Filter and search agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.extension && agent.extension.includes(searchQuery))
      
      // Status filter
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [agents, searchQuery, statusFilter])

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = agents.length
    const online = agents.filter(a => a.status !== 'OFFLINE').length
    const available = agents.filter(a => a.status === 'AVAILABLE').length
    const onCall = agents.filter(a => a.status === 'ON_CALL').length
    const onBreak = agents.filter(a => a.status === 'BREAK').length
    
    return { total, online, available, onCall, onBreak }
  }, [agents])

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Monitoring</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <AIAssistant userRole="manager" />
            </div>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Live Status Indicator */}
          {isConnected && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </Badge>
              <span className="text-xs text-muted-foreground">Real-time monitoring active</span>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Total Agents</CardDescription>
                <CardTitle className="text-2xl font-semibold">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Online</CardDescription>
                <CardTitle className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.online}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Available</CardDescription>
                <CardTitle className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.available}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">On Call</CardDescription>
                <CardTitle className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {stats.onCall}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">On Break</CardDescription>
                <CardTitle className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                  {stats.onBreak}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Agent Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or extension..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 sm:w-48">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ON_CALL">On Call</SelectItem>
                      <SelectItem value="IDLE">Idle</SelectItem>
                      <SelectItem value="BREAK">On Break</SelectItem>
                      <SelectItem value="OFFLINE">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-amber-900 dark:text-amber-200">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <AgentCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Agent Cards Grid */}
          {!loading && !error && (
            <>
              {filteredAgents.length === 0 ? (
                <Card className="p-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No agents found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== "all" 
                        ? "Try adjusting your search or filter criteria"
                        : "No agents are currently registered in the system"}
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredAgents.map((agent) => (
                    <AgentCard key={agent.userId} agent={agent} />
                  ))}
                </div>
              )}
              
              {/* Results count */}
              {filteredAgents.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing {filteredAgents.length} of {agents.length} agents
                </p>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
