"use client"

import React, { useEffect, useMemo, useState } from "react"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card } from "@/components/ui/card"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

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
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
                  <BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager/administration">Administration</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Active Campaigns</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* No Add Campaign button in Active view */}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}
          <Card className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Campaign ID</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Start</th>
                    <th className="py-2 pr-4">End</th>
                    <th className="py-2 pr-4">Allocations</th>
                    <th className="py-2 pr-4">Assigned To</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-3" colSpan={9}>Loading...</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="py-3" colSpan={9}>No active campaigns</td>
                    </tr>
                  ) : (
                    items.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4">{c.id}</td>
                        <td className="py-2 pr-4">{c.campaign_id ?? '-'}</td>
                        <td className="py-2 pr-4">{c.campaign_name ?? '-'}</td>
                        <td className="py-2 pr-4">{c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-2 pr-4">{c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-2 pr-4">{c.allocations ?? '-'}</td>
                        <td className="py-2 pr-4">{c.assigned_to ?? '-'}</td>
                        <td className="py-2 pr-4">
                          {c.status ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                c.status.toLowerCase() === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : c.status.toLowerCase() === 'inactive'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 pr-4">{c.method ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}