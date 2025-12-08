"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { Calendar, Users, Phone, Target, Play, AlertCircle, Zap, Hand } from "lucide-react"

type Campaign = {
  id: number
  campaign_id: number | null
  campaign_name: string | null
  start_date: string | null
  end_date: string | null
  allocations: string | null
  assigned_to: string | null
  status: string | null
  method: string | null
  created_at?: string | null
  updated_at?: string | null
}

const API_PREFIX = `${API_BASE}/api`

export default function CampaignsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialingDialogOpen, setDialingDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (!USE_AUTH_COOKIE) {
      const t = getToken()
      if (t) h["Authorization"] = `Bearer ${t}`
    }
    return h
  }, [])

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/campaigns/active`, {
        method: "GET",
        credentials: USE_AUTH_COOKIE ? "include" : "omit",
        headers,
      })
      if (!res.ok) throw new Error(`Failed to load campaigns (${res.status})`)
      const data = (await res.json()) as { success: boolean; items: Campaign[] }
      setItems(data.items || [])
    } catch (e: any) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusLower = status.toLowerCase()
    if (statusLower === 'active') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
          {status}
        </Badge>
      )
    } else if (statusLower === 'inactive') {
      return (
        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30">
          {status}
        </Badge>
      )
    } else if (statusLower === 'paused') {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30">
          {status}
        </Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const calculateMetrics = () => {
    const totalCampaigns = items.length
    const totalAllocations = items.reduce((sum, c) => sum + (parseInt(c.allocations || '0') || 0), 0)
    const activeCampaigns = items.filter(c => c.status?.toLowerCase() === 'active').length

    return { totalCampaigns, totalAllocations, activeCampaigns }
  }

  const metrics = calculateMetrics()

  return (
    <SidebarProvider>
      <AgentSidebar />
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
                  <BreadcrumbLink href="/dashboard/agent">Agent</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/agent/campaigns">Campaigns</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Active Campaigns</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
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

          {/* Campaign Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total Campaigns</div>
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-semibold tabular-nums">{metrics.totalCampaigns}</div>
                    )}
                  </div>
                  <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30">
                    <Target className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Active Now</div>
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-semibold tabular-nums">{metrics.activeCampaigns}</div>
                    )}
                  </div>
                  <div className="grid size-10 place-items-center rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                    <Play className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total Allocations</div>
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-semibold tabular-nums">{metrics.totalAllocations}</div>
                    )}
                  </div>
                  <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30">
                    <Phone className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Your Active Campaigns</h2>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No active campaigns assigned</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((campaign) => (
                  <Card key={campaign.id} className="border shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{campaign.campaign_name || 'Untitled Campaign'}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">ID: {campaign.campaign_id ?? campaign.id}</div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-GB') : 'N/A'} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-GB') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {campaign.allocations || '0'} allocations
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {campaign.assigned_to || 'Unassigned'}
                        </span>
                      </div>
                      {campaign.method && (
                        <div className="pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            {campaign.method}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => {
                          setSelectedCampaign(campaign)
                          setDialingDialogOpen(true)
                        }}
                      >
                        <Play className="h-3 w-3" />
                        Start Dialing
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Dialing Method Dialog */}
      <Dialog open={dialingDialogOpen} onOpenChange={setDialingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Dialing Method</DialogTitle>
            <DialogDescription>
              Select how you want to dial for campaign: {selectedCampaign?.campaign_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              size="lg"
              className="h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-transform"
              onClick={() => {
                setDialingDialogOpen(false)
                router.push('/dashboard/agent/dialer/manual')
              }}
            >
              <Hand className="h-8 w-8" />
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">Manual Dialing</span>
                <span className="text-xs font-normal opacity-80">Dial numbers manually with full control</span>
              </div>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-6 flex-col gap-3 hover:scale-[1.02] transition-transform"
              onClick={() => {
                setDialingDialogOpen(false)
                router.push('/dashboard/agent/dialer/automated')
              }}
            >
              <Zap className="h-8 w-8" />
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">Automated Dialing</span>
                <span className="text-xs font-normal opacity-80">Let the system dial automatically</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}