"use client"

import * as React from "react"
import { QaSidebar } from "../../components/QaSidebar"
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
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

type QaSummary = {
  totalReviews: number
  avgOverall: number | null
  avgTone: number | null
  avgCompliance: number | null
  leads: { quality: string; count: number }[]
}

export default function QaReportsPage() {
  const [summary, setSummary] = React.useState<QaSummary | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSummary = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/qa/reports/summary`, { headers, credentials })
      if (!res.ok) {
        setError("Failed to load QA summary")
        setSummary(null)
        return
      }
      const data = await res.json()
      setSummary(data?.data ?? null)
    } catch {
      setError("Failed to load QA summary")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const fmt = (n: number | null) => (n == null ? "-" : n.toFixed(1))

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
                  <BreadcrumbPage>QA Reports</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quality Reports</h2>
            <Button size="sm" variant="outline" onClick={fetchSummary} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Reviews</CardTitle>
                <CardDescription>Calls that have at least one QA review.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{summary ? summary.totalReviews : "-"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Scores</CardTitle>
                <CardDescription>Overall / tone / compliance (0–100).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>Overall: <span className="font-medium">{summary ? fmt(summary.avgOverall) : "-"}</span></div>
                  <div>Tone: <span className="font-medium">{summary ? fmt(summary.avgTone) : "-"}</span></div>
                  <div>Compliance: <span className="font-medium">{summary ? fmt(summary.avgCompliance) : "-"}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leads by Quality</CardTitle>
                <CardDescription>Counts of QA-marked leads.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {(summary?.leads || []).length === 0 && <div className="text-muted-foreground">No leads yet.</div>}
                  {(summary?.leads || []).map((l) => (
                    <div key={l.quality} className="flex justify-between">
                      <span className="capitalize">{l.quality || "none"}</span>
                      <span className="font-medium">{l.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
