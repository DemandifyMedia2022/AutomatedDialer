"use client"

import * as React from "react"
import { QaSidebar } from "../components/QaSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

type CallRow = {
  id: number | string
  destination: string | null
  start_time: string
  disposition: string | null
}

export default function QaCallReviewPage() {
  const [calls, setCalls] = React.useState<CallRow[]>([])
  const [loadingCalls, setLoadingCalls] = React.useState(false)
  const [selectedCallId, setSelectedCallId] = React.useState<number | string | null>(null)
  const [overallScore, setOverallScore] = React.useState("")
  const [toneScore, setToneScore] = React.useState("")
  const [complianceScore, setComplianceScore] = React.useState("")
  const [isLead, setIsLead] = React.useState(false)
  const [leadQuality, setLeadQuality] = React.useState("none")
  const [leadTags, setLeadTags] = React.useState("")
  const [comments, setComments] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [loadingReview, setLoadingReview] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const fetchCalls = React.useCallback(async () => {
    setLoadingCalls(true)
    setMessage(null)
    try {
      const qs = new URLSearchParams({ page: "1", pageSize: "20" })
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/calls?${qs.toString()}`, { headers, credentials })
      if (!res.ok) {
        setCalls([])
        return
      }
      const data = await res.json()
      const rows: any[] = data?.items || []
      setCalls(
        rows.map((r) => ({
          id: r.id,
          destination: r.destination ?? null,
          start_time: r.start_time,
          disposition: (r.disposition || "") as string,
        }))
      )
    } catch {
      setCalls([])
    } finally {
      setLoadingCalls(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const resetForm = () => {
    setOverallScore("")
    setToneScore("")
    setComplianceScore("")
    setIsLead(false)
    setLeadQuality("none")
    setLeadTags("")
    setComments("")
    setMessage(null)
  }

  const loadReview = async (callId: number | string) => {
    setSelectedCallId(callId)
    resetForm()
    setLoadingReview(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/qa/reviews/${callId}`, { headers, credentials })
      if (res.status === 404) {
        return
      }
      if (!res.ok) {
        setMessage("Failed to load existing review")
        return
      }
      const data = await res.json()
      const r = data?.review
      if (!r) return
      setOverallScore(r.overall_score != null ? String(r.overall_score) : "")
      setToneScore(r.tone_score != null ? String(r.tone_score) : "")
      setComplianceScore(r.compliance_score != null ? String(r.compliance_score) : "")
      setIsLead(!!r.is_lead)
      setLeadQuality(r.lead_quality || "none")
      setLeadTags(r.lead_tags_csv || "")
      setComments(r.comments || "")
    } catch {
      setMessage("Failed to load existing review")
    } finally {
      setLoadingReview(false)
    }
  }

  const saveReview = async () => {
    if (!selectedCallId) return
    setSaving(true)
    setMessage(null)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const body = {
        overall_score: overallScore ? Number(overallScore) : null,
        tone_score: toneScore ? Number(toneScore) : null,
        compliance_score: complianceScore ? Number(complianceScore) : null,
        is_lead: isLead,
        lead_quality: leadQuality,
        lead_tags_csv: leadTags,
        comments: comments || null,
      }
      const res = await fetch(`${API_BASE}/api/qa/reviews/${selectedCallId}`, {
        method: "POST",
        headers,
        credentials,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setMessage("Failed to save review")
        return
      }
      setMessage("Review saved")
    } catch {
      setMessage("Failed to save review")
    } finally {
      setSaving(false)
    }
  }

  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "-"
    try {
      const d = new Date(iso)
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(d.getUTCDate()).padStart(2, "0")
      const hh = String(d.getUTCHours()).padStart(2, "0")
      const mi = String(d.getUTCMinutes()).padStart(2, "0")
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
    } catch {
      return iso
    }
  }

  return (
    <SidebarProvider>
      <QaSidebar />
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
                  <BreadcrumbLink href="/dashboard/qa">QA</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Call Review</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Call Review Queue</CardTitle>
              <CardDescription>Select a call and apply QA scores, notes, and lead tags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing the most recent 20 calls accessible to QA.
                </div>
                <Button size="sm" variant="outline" onClick={fetchCalls} disabled={loadingCalls}>
                  {loadingCalls ? "Refreshing…" : "Refresh"}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Call ID</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Destination</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Start (UTC)</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Disposition</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {calls.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                            {loadingCalls ? "Loading…" : "No calls found"}
                          </td>
                        </tr>
                      )}
                      {calls.map((c) => (
                        <tr key={String(c.id)} className={selectedCallId === c.id ? "bg-muted/40" : undefined}>
                          <td className="px-3 py-2">{c.id}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate">{c.destination || "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(c.start_time)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{c.disposition || "-"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant={selectedCallId === c.id ? "default" : "outline"}
                              onClick={() => loadReview(c.id)}
                              disabled={loadingReview && selectedCallId === c.id}
                            >
                              {loadingReview && selectedCallId === c.id ? "Loading…" : "Review"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">QA Review</div>
                  {!selectedCallId && (
                    <div className="text-xs text-muted-foreground">Select a call from the table to begin reviewing.</div>
                  )}
                  {selectedCallId && (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">Reviewing call ID {String(selectedCallId)}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs mb-1">Overall score</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={overallScore}
                            onChange={(e) => setOverallScore(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Tone score</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={toneScore}
                            onChange={(e) => setToneScore(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Compliance score</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={complianceScore}
                            onChange={(e) => setComplianceScore(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="rounded border border-input"
                            checked={isLead}
                            onChange={(e) => setIsLead(e.target.checked)}
                          />
                          Mark as lead
                        </label>
                        <Input
                          className="h-8 max-w-[120px]"
                          placeholder="Quality (e.g. hot)"
                          value={leadQuality}
                          onChange={(e) => setLeadQuality(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Lead tags (comma separated)</label>
                        <Input
                          placeholder="product-interest, follow-up"
                          value={leadTags}
                          onChange={(e) => setLeadTags(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1">Comments</label>
                        <textarea
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-muted-foreground min-h-[1.25rem]">
                          {message}
                        </div>
                        <Button size="sm" onClick={saveReview} disabled={saving}>
                          {saving ? "Saving…" : "Save review"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
