"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AgentSidebar } from "../../components/AgentSidebar"

type CampaignRow = {
  id: string | number
  name: string
  campaignId: string | number
  assignTo: string
  allocation: number
  allocationComplete: number
  startDate: string
  endDate: string
}

const ActiveCampaignsPage = () => {
  const [search, setSearch] = React.useState("")
  const [items] = React.useState<CampaignRow[]>([
    // sample rows; replace with API data when available
    { id: 101, name: "Renewals Q4", campaignId: "CMP-1001", assignTo: "Team A", allocation: 500, allocationComplete: 120, startDate: "2025-10-01", endDate: "2025-12-31" },
    { id: 102, name: "Winback", campaignId: "CMP-1002", assignTo: "Employee: John D.", allocation: 200, allocationComplete: 75, startDate: "2025-11-01", endDate: "2026-01-31" },
    { id: 103, name: "Upsell", campaignId: "CMP-1003", assignTo: "Team B", allocation: 300, allocationComplete: 150, startDate: "2025-09-15", endDate: "2025-11-30" },
  ])

  const filtered = React.useMemo(() => {
    const t = search.trim().toLowerCase()
    const sorted = [...items].sort((a, b) => {
      const an = Number(a.id); const bn = Number(b.id)
      const aNum = !Number.isNaN(an); const bNum = !Number.isNaN(bn)
      if (aNum && bNum) return an - bn
      return String(a.id).localeCompare(String(b.id))
    })
    if (!t) return sorted
    return sorted.filter(r =>
      String(r.id).toLowerCase().includes(t) ||
      r.name.toLowerCase().includes(t) ||
      String(r.campaignId).toLowerCase().includes(t) ||
      r.assignTo.toLowerCase().includes(t)
    )
  }, [items, search])

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
                  <BreadcrumbPage>Active</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <Card className="w-full">
            <CardHeader>
              
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-12 items-end">
                <div className="flex flex-col gap-1 lg:col-span-3">
           
                  <Input
                    placeholder="Search "
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex lg:col-span-1">
                  <Button className="mt-6">Search</Button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Campaign ID</TableHead>
                      <TableHead>Assign To</TableHead>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Allocation Complete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                          No records
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((row, idx) => (
                      <TableRow key={String(row.id)} className="hover:bg-accent/50">
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{row.startDate}</TableCell>
                        <TableCell>{row.endDate}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.campaignId}</TableCell>
                        <TableCell>{row.assignTo}</TableCell>
                        <TableCell>{row.allocation}</TableCell>
                        <TableCell>{row.allocationComplete}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ActiveCampaignsPage
