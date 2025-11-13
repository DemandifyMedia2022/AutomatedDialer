"use client"

import React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ManagerSidebar } from "../../components/ManagerSidebar"


type ExtItem = {
  ext: string
  status: string
  callerIds: string[]
  callerId: string
  permission: "inbound" | "outbound" | "both"
}

const initialItems: ExtItem[] = [
  { ext: "1033203", status: "UNKNOWN", callerIds: ["442080683948", "13236595567"], callerId: "442080683948", permission: "both" },
  { ext: "1033206", status: "UNKNOWN", callerIds: ["442080683948", "13236595567"], callerId: "442080683948", permission: "both" },
  { ext: "1033209", status: "UNKNOWN", callerIds: ["442080683948"], callerId: "442080683948", permission: "both" },
  { ext: "1033205", status: "UNKNOWN", callerIds: ["442080683948"], callerId: "442080683948", permission: "both" },
  { ext: "1033208", status: "UNKNOWN", callerIds: ["13236595567"], callerId: "13236595567", permission: "both" },
  { ext: "1033207", status: "UNKNOWN", callerIds: ["442080683948"], callerId: "442080683948", permission: "both" },
  { ext: "1033204", status: "UNKNOWN", callerIds: ["13236595567"], callerId: "13236595567", permission: "both" },
  { ext: "1033203", status: "UNKNOWN", callerIds: ["13236595567"], callerId: "13236595567", permission: "both" },
  { ext: "1033202", status: "UNKNOWN", callerIds: ["13236595567"], callerId: "13236595567", permission: "both" },
]

export default function Page() {
  const [items, setItems] = React.useState<ExtItem[]>(initialItems)

  const updateItem = (idx: number, patch: Partial<ExtItem>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const onSave = (idx: number) => {
    const it = items[idx]
    // TODO: wire API call to save CallerID / Permission for the extension
    console.log("update:", it)
  }

  const badge = (label: string) => (
    <span className="inline-flex items-center rounded-full border bg-slate-200/60 px-2 py-0.5 text-[11px] text-slate-700">{label}</span>
  )

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
                  <BreadcrumbPage>Change DID's</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-l font-medium">Manage Extensions</h1>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it, idx) => (
                <Card key={`${it.ext}-${idx}`} className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-blue-600 text-base font-medium hover:underline cursor-default">
                        {it.ext}
                      </CardTitle>
                      {badge(it.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Caller ID</div>
                        <Select
                          value={it.callerId}
                          onValueChange={(v) => updateItem(idx, { callerId: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Caller ID" />
                          </SelectTrigger>
                          <SelectContent>
                            {it.callerIds.map((cid) => (
                              <SelectItem key={cid} value={cid}>{cid}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Calls Allowed</div>
                        <Select
                          value={it.permission}
                          onValueChange={(v: any) => updateItem(idx, { permission: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Permission" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inbound">Inbound</SelectItem>
                            <SelectItem value="outbound">Outbound</SelectItem>
                            <SelectItem value="both">Inbound & Outbound</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-1">
                        <Button variant="outline" className="w-full" onClick={() => onSave(idx)}  style={{color:"blue", borderColor:"blue"}}>Update</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
