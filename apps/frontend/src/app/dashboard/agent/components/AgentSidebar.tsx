"use client"

import * as React from "react"
import { PhoneCall, ListCheck, Users, Settings2, Phone } from "lucide-react"
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
    name: "Agent",
    email: "agent@example.com",
    avatar: "/next.svg",
  },
  company: {
    name: "Automated Dialer",
    logo: Phone,
  },
  navMain: [
    {
      title: "My Calls",
      url: "/dashboard/agent",
      icon: PhoneCall,
      isActive: true,
      items: [
        { title: "Active", url: "#" },
        { title: "Completed", url: "#" },
      ],
    },
    {
      title: "Tasks",
      url: "#",
      icon: ListCheck,
      items: [
        { title: "Today", url: "#" },
        { title: "Upcoming", url: "#" },
      ],
    },
    {
      title: "Leads",
      url: "#",
      icon: Users,
      items: [
        { title: "All Leads", url: "#" },
        { title: "My Leads", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "Profile", url: "#" },
        { title: "Preferences", url: "#" },
      ],
    },
  ],
}

export function AgentSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard/agent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <data.company.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{data.company.name}</span>
                  <span className="truncate text-xs">Agent</span>
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
