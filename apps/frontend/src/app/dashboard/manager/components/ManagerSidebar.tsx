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
      title: "Teams",
      url: "#",
      icon: Users,
      items: [
        { title: "Agents", url: "#" },
        { title: "Performance", url: "#" },
      ],
    },
    {
      title: "Queues",
      url: "#",
      icon: ClipboardList,
      items: [
        { title: "Active Queues", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "Routing", url: "#" },
        { title: "Notifications", url: "#" },
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
