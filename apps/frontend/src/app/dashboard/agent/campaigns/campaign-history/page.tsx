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

type HistoryRow = {
  id: string | number
  name: string
  campaignId: string | number
  assignTo: string
  allocation: number
  allocationComplete: number
  startDate: string
  endDate: string
  remark: "On Time" | "Late"
  campDeliveryDate: string
}

const CampaignHistoryPage = () => {
  const [search, setSearch] = React.useState("")
  const [items] = React.useState<HistoryRow[]>([
    { id: 91, name: "Renewals Q3", campaignId: "CMP-0931", assignTo: "Team A", allocation: 400, allocationComplete: 400, startDate: "2025-07-01", endDate: "2025-09-30", remark: "On Time", campDeliveryDate: "2025-09-25" },
    { id: 92, name: "Cross-sell", campaignId: "CMP-0932", assignTo: "Employee: Priya S.", allocation: 250, allocationComplete: 230, startDate: "2025-06-15", endDate: "2025-08-31", remark: "Late", campDeliveryDate: "2025-09-02" },
    { id: 93, name: "Winback Q2", campaignId: "CMP-0921", assignTo: "Team B", allocation: 320, allocationComplete: 320, startDate: "2025-04-01", endDate: "2025-06-30", remark: "On Time", campDeliveryDate: "2025-06-25" },
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
      r.assignTo.toLowerCase().includes(t) ||
      r.remark.toLowerCase().includes(t) ||
      r.campDeliveryDate.toLowerCase().includes(t)
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
                  <BreadcrumbPage>Campaign History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <Card className="w-full">
           
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 items-end">
                <div className="flex flex-col gap-1 lg:col-span-3">
     
                  <Input
                    placeholder=" Search "
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
                      <TableHead>Camp-Delivery Date</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
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
                        <TableCell>{row.campDeliveryDate}</TableCell>
                        <TableCell>{row.remark}</TableCell>
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

export default CampaignHistoryPage
