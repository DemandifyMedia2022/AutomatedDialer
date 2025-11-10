"use client"

import * as React from "react"
import { PhoneCall, ListCheck, Users, Settings2, Phone, Bot } from "lucide-react"
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
      title: "Dialer",
      url: "/dashboard/agent/dialer",
      icon: PhoneCall,
      isActive: true,
      items: [
        { title: "Manual", url: "/dashboard/agent/dialer/manual" },
        { title: "Automated", url: "/dashboard/agent/dialer/automated" },
      ],
    },
    {
      title: "Campaigns",
      url: "/dashboard/agent/campaigns",
      icon: ListCheck,
      items: [
        { title: "Active Campaigns", url: "/dashboard/agent/campaigns/active" },
        { title: "Campaign History", url: "/dashboard/agent/campaigns/campaign-history" },
      ],
    },
    {
      title: "My Calls",
      url: "/dashboard/agent/my-calls",
      icon: Users,
      items: [
        { title: "Call History", url: "/dashboard/agent/my-calls/call-history" },
        { title: "Lead Details", url: "/dashboard/agent/my-calls/lead-details" },
      ],
    },
        {
      title: "Agentic Dialing",
      url: "/dashboard/agent/agentic-dialing",
      icon: Bot,
      isActive: true,
      items: [
        { title: "Calls", url: "/dashboard/agent/agentic-dialing" },
        { title: "CSV", url: "/dashboard/agent/agentic-dialing/csv" },
        { title: "Campaigns", url: "/dashboard/agent/agentic-dialing/campaigns" },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/agent/settings",
      icon: Settings2,
      items: [
        { title: "Profile", url: "/dashboard/agent/settings/profile" },
        { title: "Preferences", url: "/dashboard/agent/settings/preferences" },
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
