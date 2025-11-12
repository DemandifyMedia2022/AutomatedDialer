"use client"

import React, { useMemo, useState } from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, History } from "lucide-react"

type CdrRow = {
  id: number
  extension: string
  destination: string
  source: string
  startTime: string
  endTime: string
  durationSec: number
  disposition: "ANSWERED" | "NO ANSWER" | "BUSY"
}

const sampleRows: CdrRow[] = [
  { id: 1013204, extension: "97464664446", destination: "13236595567", source: "13236595567", startTime: "2025-11-12 04:32:22", endTime: "2025-11-12 04:43:11", durationSec: 109, disposition: "ANSWERED" },
  { id: 1013204, extension: "97455549319", destination: "13236595567", source: "13236595567", startTime: "2025-11-12 04:40:55", endTime: "2025-11-12 04:41:46", durationSec: 50, disposition: "NO ANSWER" },
  { id: 1013204, extension: "97455549319", destination: "13236595567", source: "13236595567", startTime: "2025-11-12 04:41:15", endTime: "2025-11-12 04:42:42", durationSec: 83, disposition: "ANSWERED" },
  { id: 1013208, extension: "919920082097", destination: "13236595567", source: "13236595567", startTime: "2025-11-12 04:56:48", endTime: "2025-11-12 04:57:27", durationSec: 39, disposition: "NO ANSWER" },
]

export default function CdrPage() {
  const [tab, setTab] = useState("history")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [phone, setPhone] = useState("")
  const [extension, setExtension] = useState("")
  const [callType, setCallType] = useState<string>("all")

  const filtered = useMemo(() => {
    // Simple client-side filter demo
    return sampleRows.filter((r) => {
      const byPhone = !phone || r.extension.includes(phone) || r.destination.includes(phone)
      const byExt = !extension || r.source.includes(extension) || r.extension.includes(extension)
      const byStatus = status === "all" || r.disposition === status
      const byType = callType === "all" // placeholder
      const byFrom = !fromDate || r.startTime >= fromDate
      const byTo = !toDate || r.startTime <= toDate
      return byPhone && byExt && byStatus && byType && byFrom && byTo
    })
  }, [phone, extension, status, callType, fromDate, toDate])

  const onSearch = () => {}
  const onReset = () => {
    setFromDate("")
    setToDate("")
    setStatus("all")
    setPhone("")
    setExtension("")
    setCallType("")
  }
  const onDownloadRow = (row: CdrRow) => {
    console.log("download row", row)
  }
  const onDownloadRange = () => {
    console.log("download range", { fromDate, toDate })
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
                  <BreadcrumbLink href="/dashboard/manager/call-management">Call Management</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>CDR</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader className="pb-0" />
            <CardContent>
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="mb-4 mt-0 flex gap-2 rounded-md border bg-muted/50 p-1">
                  <TabsTrigger
                    value="history"
                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                  >
                    <History className="h-4 w-4" />
                    Call History
                  </TabsTrigger>
                  <TabsTrigger
                    value="download"
                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-4 mt-3 pt-3">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-9">
                    <div className="lg:col-span-3 space-y-1">
                      <Label>From Date</Label>
                      <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="lg:col-span-3 space-y-1">
                      <Label>To Date</Label>
                      <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <div className="lg:col-span-3 space-y-1">
                      <Label>Phone No.</Label>
                      <Input placeholder="Enter Name" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="lg:col-span-3 space-y-1">
                      <Label>Extension</Label>
                      <Input placeholder="Enter Caller ID" value={extension} onChange={(e) => setExtension(e.target.value)} />
                    </div>
                    <div className="lg:col-span-3 space-y-1">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="ANSWERED">ANSWERED</SelectItem>
                          <SelectItem value="NO ANSWER">NO ANSWER</SelectItem>
                          <SelectItem value="BUSY">BUSY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="lg:col-span-3 space-y-1">
                      <Label>Call Type</Label>
                      <Select value={callType} onValueChange={setCallType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Call Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="inbound">Inbound</SelectItem>
                          <SelectItem value="outbound">Outbound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={onSearch}>Search</Button>
                    <Button variant="outline" onClick={onReset}>Reset</Button>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">ID</TableHead>
                          <TableHead className="w-[140px]">Extension</TableHead>
                          <TableHead className="w-[180px]">Destination Number</TableHead>
                          <TableHead className="w-[160px]">Source</TableHead>
                          <TableHead className="w-[180px]">Start Time</TableHead>
                          <TableHead className="w-[180px]">End Time</TableHead>
                          <TableHead className="w-[130px]">Call Duration</TableHead>
                          <TableHead className="w-[140px]">Call Disposition</TableHead>
                          <TableHead className="w-[120px] text-center">Download</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((row, idx) => (
                          <TableRow key={`${row.id}-${idx}`}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{row.extension}</TableCell>
                            <TableCell>{row.destination}</TableCell>
                            <TableCell>{row.source}</TableCell>
                            <TableCell>{row.startTime}</TableCell>
                            <TableCell>{row.endTime}</TableCell>
                            <TableCell>{row.durationSec} Sec</TableCell>
                            <TableCell>
                              {row.disposition === "ANSWERED" ? (
                                <Badge className="bg-green-600 hover:bg-green-700">ANSWERED</Badge>
                              ) : row.disposition === "BUSY" ? (
                                <Badge className="bg-yellow-600 hover:bg-yellow-700">BUSY</Badge>
                              ) : (
                                <Badge className="bg-gray-500 hover:bg-gray-600">NO ANSWER</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="outline" onClick={() => onDownloadRow(row)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                              No records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-center gap-1 pt-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Button key={i} variant={i === 0 ? "default" : "outline"} size="sm" className={i === 0 ? "bg-blue-600 hover:bg-blue-700" : ""}>
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="download" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
                    <div className="lg:col-span-3 space-y-1">
                      <Label>From Date</Label>
                      <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="lg:col-span-3 space-y-1">
                      <Label>To Date</Label>
                      <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onDownloadRange}>Download</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

