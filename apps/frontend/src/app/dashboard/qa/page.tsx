"use client"

import { QaSidebar } from "./components/QaSidebar"
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

export default function QaDashboardPage() {
  return (
    <SidebarProvider>
      <QaSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>QA</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Calls Needing Review</CardTitle>
                <CardDescription>Queue of calls to be QA-checked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">--</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reviewed Today</CardTitle>
                <CardDescription>Calls QA-reviewed today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">--</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Leads Identified</CardTitle>
                <CardDescription>Leads marked from QA reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">--</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent QA Activity</CardTitle>
                <CardDescription>Last few calls you reviewed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Hook this section to your QA review APIs to show recent scores, comments, and lead tags.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Guidelines</CardTitle>
                <CardDescription>Internal QA checklist and SOPs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  You can replace this text with links to your QA playbook or documentation for analysts.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
