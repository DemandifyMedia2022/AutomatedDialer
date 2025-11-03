"use client"

import * as React from "react"
import { Users, ClipboardList, BarChart3, Settings2, Phone } from "lucide-react"
import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Manager",
    email: "manager@example.com",
    avatar: "/next.svg",
  },
  company: {
    name: "Automated Dialer",
    logo: Phone,
  },
  navMain: [
    {
      title: "Overview",
      url: "/dashboard/manager",
      icon: BarChart3,
      isActive: true,
      items: [
        { title: "KPIs", url: "#" },
        { title: "Trends", url: "#" },
      ],
    },
    {
      title: "Monitoring",
      url: "#",
      icon: Users,
      items: [
        { title: "Track Agent", url: "/dashboard/manager/monitoring/track-agent" },
        { title: "Live Calls", url: "/dashboard/manager/monitoring/live-calls" },
      ],
    },
    {
      title: "Call Management",
      url: "#",
      icon: ClipboardList,
      items: [
        { title: "Change DID", url: "/dashboard/manager/call-management/change-did" },
        { title: "Call Details", url: "/dashboard/manager/call-management/cdr" },
      ],
    },
    {
      title: "Administration",
      url: "#",
      icon: Settings2,
      items: [
        { title: "Agent", url: "/dashboard/manager/administration/agent" },
        { title: "Campaigns", url: "/dashboard/manager/administration/campaigns" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "Profile", url: "/dashboard/manager/settings/profile" },
        { title: "Preferences", url: "/dashboard/manager/settings/preferences" },
      ],
    },
  ],
}

export function ManagerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard/manager">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <data.company.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{data.company.name}</span>
                  <span className="truncate text-xs">Manager</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
