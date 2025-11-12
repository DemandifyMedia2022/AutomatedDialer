"use client"

import React, { useMemo, useState } from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock3, LogIn, LogOut } from "lucide-react"

type AgentLog = {
  name: string
  firstLogin: string
  lastLogout: string
  duration: string
  status: "Available" | "Offline"
}

const sampleData: AgentLog[] = [
  { name: "Asfiya Pthan", firstLogin: "11:06 AM", lastLogout: "Available", duration: "04:57", status: "Available" },
  { name: "Viresh Kumbhar", firstLogin: "10:45 AM", lastLogout: "10:55 AM", duration: "05:20", status: "Offline" },
  { name: "Pooja Bajpai", firstLogin: "10:25 AM", lastLogout: "Available", duration: "04:15", status: "Available" },
  { name: "Prem Jadhav", firstLogin: "10:28 AM", lastLogout: "Available", duration: "04:19", status: "Available" },
  { name: "Ali Mustafa", firstLogin: "11:11 AM", lastLogout: "Available", duration: "05:02", status: "Available" },
  { name: "Rijo Joy", firstLogin: "09:42 AM", lastLogout: "Available", duration: "03:33", status: "Available" },
]

export default function TrackAgentPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"All" | AgentLog["status"]>("All")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sampleData.filter((row) => {
      const matchesQuery = !q || row.name.toLowerCase().includes(q)
      const matchesStatus = status === "All" || row.status === status
      return matchesQuery && matchesStatus
    })
  }, [query, status])

  const onViewTimestamps = (row: AgentLog) => {
    // placeholder
    console.log("view timestamps", row)
  }

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager/monitoring">Monitoring</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Track Agent</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Employee Login Logs (Today)</CardTitle>
                <div className="hidden md:flex items-center gap-2">
                  <Input
                    placeholder="Search employee..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-56"
                  />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="Available">Available</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead className="w-[160px]">First Login</TableHead>
                      <TableHead className="w-[160px]">Last Logout</TableHead>
                      <TableHead className="w-[120px]">Duration</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[160px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2 text-muted-foreground">
                            <LogIn className="h-4 w-4" />
                            <span>{row.firstLogin}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2 text-muted-foreground">
                            <LogOut className="h-4 w-4" />
                            <span>{row.lastLogout}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            <span>{row.duration}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.status === "Available" ? (
                            <Badge className="bg-green-600 hover:bg-green-700">Available</Badge>
                          ) : (
                            <Badge className="bg-red-600 hover:bg-red-700">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => onViewTimestamps(row)}
                          >
                            View Timestamps
                          </Button>
                        </TableCell>
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

