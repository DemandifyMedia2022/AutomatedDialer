"use client"

import * as React from "react"
import { LucideIcon, PhoneCall, ListCheck, Users, Settings2, Phone } from "lucide-react"
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
import { useAuth } from "@/hooks/useAuth"
import AgentPresenceWidget from "@/components/agent/AgentPresenceWidget"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  featureKey?: string
  items?: {
    title: string
    url: string
    featureKey?: string
  }[]
}

const data: {
  user: { name: string; email: string; avatar: string }
  company: { name: string; logo: LucideIcon }
  navMain: NavItem[]
} = {
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
        { title: "Manual", url: "/dashboard/agent/dialer/manual", featureKey: 'agent-dialer-manual' },
        { title: "Automated", url: "/dashboard/agent/dialer/automated", featureKey: 'agent-dialer-automated' },
        { title: "GSM Dialer", url: "/dashboard/agent/dialer/gsm-dialer", featureKey: 'agent-dialer-gsm' },
      ],
    },
    {
      title: "Campaigns",
      url: "/dashboard/agent/campaigns",
      icon: ListCheck,
      featureKey: 'agent-campaigns',
      items: [
        { title: "Active Campaigns", url: "/dashboard/agent/campaigns/active" },
        { title: "Campaign History", url: "/dashboard/agent/campaigns/campaign-history" },
      ],
    },
    {
      title: "My Calls",
      url: "/dashboard/agent/my-calls",
      icon: Users,
      featureKey: 'agent-calls',
      items: [
        { title: "Call History", url: "/dashboard/agent/my-calls/call-history" },
        { title: "Lead Details", url: "/dashboard/agent/my-calls/lead-details" },
        { title: "Follow-up Calls", url: "/dashboard/agent/my-calls/follow-up-calls" },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/agent/settings",
      icon: Settings2,
      featureKey: 'settings',
      items: [
        { title: "Profile", url: "/dashboard/agent/settings/profile" },
      ],
    },
  ],
}

export function AgentSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const displayUser = {
    name: user?.email
      ? user.email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
      : data.user.name,
    email: user?.email || data.user.email,
    avatar: "",
  }

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
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <AgentPresenceWidget />
        </div>
        <NavUser user={displayUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
