"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Phone, 
  CheckCircle, 
  Target, 
  Clock,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  RefreshCcw
} from "lucide-react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"

interface QaOverviewData {
  callsNeedingReview: number
  reviewedToday: number
  leadsIdentified: number
  recentActivity: Array<{
    id: string
    campaign: string
    auditor: string
    timestamp: string
    score: number
    leadQuality: string
    comments: string
    status: string
    callInfo: {
      username: string
      destination: string
      startTime: string
    } | null
    dqReasons: string[]
  }>
}

export function QaOverviewCards() {
  console.log('🚀 QaOverviewCards component mounted!')
  
  const [data, setData] = React.useState<QaOverviewData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date())
  const [calls, setCalls] = React.useState<any[]>([])

  const fetchCallsAndData = React.useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔄 Starting fetchCallsAndData...')
      
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      
      if (USE_AUTH_COOKIE) {
        credentials = "include"
        const csrfToken = getCsrfTokenFromCookies()
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken
        }
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }

      // Fetch calls data like the Review page
      const todayIso = new Date().toISOString().slice(0, 10)
      const qs = new URLSearchParams({ page: "1", pageSize: "20" })
      qs.set("from", `${todayIso}T00:00:00.000Z`)
      qs.set("to", `${todayIso}T23:59:59.999Z`)
      
      console.log('📞 Fetching calls with params:', qs.toString())
      
      const resCalls = await fetch(`${API_BASE}/api/calls?${qs.toString()}`, { headers, credentials })
      
      console.log('📞 Calls API response:', resCalls.ok, resCalls.status)
      
      if (resCalls.ok) {
        const dataCalls = await resCalls.json()
        const rowsCalls: any[] = dataCalls?.items || []
        
        console.log('📞 Raw calls data:', rowsCalls.length, 'calls')
        console.log('📞 Sample call data:', rowsCalls.slice(0, 2))
        
        // Process calls with audit status like the Review page
        const callsWithAuditStatus = []
        for (const r of rowsCalls) {
          const uniqueId = r.unique_id
          let has_dm_qa_fields = false
          
          console.log(`🔍 Checking call ${r.id}: uniqueId=${uniqueId}, remarks=${r.remarks}`)
          
          if (uniqueId) {
            try {
              const auditRes = await fetch(`${API_BASE}/api/qa/audit/${uniqueId}`, { headers, credentials })
              console.log(`🔍 Audit API response for ${uniqueId}:`, auditRes.ok, auditRes.status)
              
              if (auditRes.ok) {
                const auditData = await auditRes.json()
                has_dm_qa_fields = auditData?.isAudited || false
                console.log(`🔍 Audit data for ${uniqueId}:`, auditData)
              } else {
                console.log(`🔍 Audit API failed for ${uniqueId}`)
              }
            } catch (error) {
              console.error('🔍 Error checking audit status for call:', r.id, error)
            }
          } else {
            console.log(`🔍 No uniqueId for call ${r.id}`)
          }
          
          callsWithAuditStatus.push({
            id: r.id,
            unique_id: r.unique_id ?? null,
            username: r.username ?? null,
            destination: r.destination ?? null,
            start_time: r.start_time,
            recording_url: r.recording_url ?? null,
            remarks: r.remarks ?? null,
            campaign_name: r.campaign_name ?? null,
            reviewed: false,
            reviewer_user_id: null,
            created_at: null,
            has_dm_qa_fields,
          })
        }
        
        console.log('📊 Calls with audit status:', callsWithAuditStatus.map(c => ({
          id: c.id,
          remarks: c.remarks,
          has_dm_qa_fields: c.has_dm_qa_fields
        })))
        
        // Filter for leads only
        const leadCalls = callsWithAuditStatus.filter(call => 
          call.remarks?.toLowerCase() === 'lead'
        )
        
        console.log('🎯 Lead calls only:', leadCalls.length, 'leads')
        console.log('🎯 Lead calls details:', leadCalls)
        
        setCalls(leadCalls)
        
        // Calculate dashboard stats using the same logic as Review page
        const notAuditedCalls = leadCalls.filter(call => !call.has_dm_qa_fields)
        const auditedCalls = leadCalls.filter(call => call.has_dm_qa_fields)
        
        const dashboardStats = {
          callsNeedingReview: notAuditedCalls.length,
          reviewedToday: auditedCalls.length, // All audited leads count as today
          leadsIdentified: leadCalls.length,
          recentActivity: []
        }
        
        console.log('📈 Final dashboard stats:', dashboardStats)
        console.log('📈 Breakdown:', {
          totalLeads: leadCalls.length,
          notAudited: notAuditedCalls.length,
          audited: auditedCalls.length
        })
        
        setData(dashboardStats)
        setLastUpdated(new Date())
      } else {
        console.error('📞 Failed to fetch calls:', resCalls.status)
      }
    } catch (error) {
      console.error('❌ Error fetching QA overview:', error)
      // Set demo data on error
      setData({
        callsNeedingReview: 1,
        reviewedToday: 1,
        leadsIdentified: 2,
        recentActivity: []
      })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    console.log('⚡ useEffect triggered - calling fetchCallsAndData')
    fetchCallsAndData()
  }, [fetchCallsAndData])

  React.useEffect(() => {
    console.log('⏰ Setting up 30-second interval')
    const interval = setInterval(fetchCallsAndData, 30000) // Refresh every 30 seconds
    return () => {
      console.log('🛑 Cleaning up interval')
      clearInterval(interval)
    }
  }, [fetchCallsAndData])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString()
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getQualityBadgeVariant = (quality: string) => {
    switch (quality.toLowerCase()) {
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'destructive'
      default: return 'outline'
    }
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Loading QA overview data...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Needing Review</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.callsNeedingReview}</div>
            <p className="text-xs text-muted-foreground">
              Pending non-audited leads count
            </p>
            {data.callsNeedingReview > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress today</span>
                  <span>{data.reviewedToday}/{data.callsNeedingReview + data.reviewedToday}</span>
                </div>
                <Progress value={(data.reviewedToday / (data.callsNeedingReview + data.reviewedToday)) * 100} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.reviewedToday}</div>
            <p className="text-xs text-muted-foreground">
              Calls QA-reviewed today
            </p>
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">Active today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Identified</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.leadsIdentified}</div>
            <p className="text-xs text-muted-foreground">
              Leads marked from QA reviews
            </p>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {data.reviewedToday > 0 ? `${Math.round((data.leadsIdentified / data.reviewedToday) * 100)}% conversion` : 'No data'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Last few calls you reviewed
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              Updated: {formatTime(lastUpdated)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent QA Activity Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent QA Activity
            </CardTitle>
            <CardDescription>
              Last few calls you reviewed with scores, comments, and lead tags
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={fetchCallsAndData} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent QA activity</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start reviewing calls to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Call #{activity.id}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.campaign}
                        </Badge>
                        <Badge variant={getQualityBadgeVariant(activity.leadQuality)} className="text-xs">
                          {activity.leadQuality}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.auditor}
                        </span>
                        <span>{formatDate(activity.timestamp)}</span>
                        {activity.score !== null && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span className={getScoreColor(activity.score)}>
                              {activity.score}/100
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{activity.comments}</p>
                      {activity.callInfo && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Call from {activity.callInfo.username} to {activity.callInfo.destination}
                        </div>
                      )}
                      {activity.dqReasons && activity.dqReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activity.dqReasons.map((reason: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="ml-4">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guidelines Card */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Guidelines
          </CardTitle>
          <CardDescription>
            QA review guidelines and best practices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Quality Standards</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Score 80+ for compliance</li>
                <li>• Check tone and professionalism</li>
                <li>• Verify lead qualification</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Lead Identification</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Mark qualified leads</li>
                <li>• Add relevant tags</li>
                <li>• Include detailed comments</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Review Process</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Review within 24 hours</li>
                <li>• Provide constructive feedback</li>
                <li>• Follow compliance checklist</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
