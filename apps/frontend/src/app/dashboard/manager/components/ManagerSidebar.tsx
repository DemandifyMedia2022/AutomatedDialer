"use client"

import * as React from "react"
import { Users, ClipboardList, Settings, Phone, Bot, UserStar, LucideIcon } from "lucide-react"
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

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  badge?: string
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
      title: "Monitoring",
      url: "#",
      icon: Users,
      featureKey: 'manager-monitoring',
      items: [
        { title: "Overview", url: "/dashboard/manager/monitoring" },
        { title: "Track Agent", url: "/dashboard/manager/monitoring/track-agent" },
        { title: "Live Calls", url: "/dashboard/manager/monitoring/live-calls" },
      ],
    },
    {
      title: "Call Management",
      url: "#",
      icon: ClipboardList,
      featureKey: 'manager-call-mgmt',
      items: [
        { title: "Change DID", url: "/dashboard/manager/call-management/change-did" },
        { title: "Call Details", url: "/dashboard/manager/call-management/cdr" },
      ],
    },
    {
      title: "Administration",
      url: "#",
      icon: UserStar,
      featureKey: 'manager-admin',
      items: [
        { title: "Agent", url: "/dashboard/manager/administration/agent" },
        { title: "Campaigns", url: "/dashboard/manager/administration/campaigns" },
        { title: "Automated Dialer", url: "/dashboard/manager/administration/automated" },
      ],
    },
    {
      title: "Playbook",
      url: "/dashboard/manager/playbook",
      icon: ClipboardList,
      featureKey: 'manager-playbook',
      items: [
        { title: "Browse", url: "/dashboard/manager/playbook" },
        { title: "Upload", url: "/dashboard/manager/playbook/upload" },
      ],
    },
    {
      title: "Agentic Dialer",
      url: "/dashboard/manager/agentic-dialing",
      icon: Bot,
      badge: "Beta",
      featureKey: 'manager-agentic',
      items: [
        { title: "Dialer", url: "/dashboard/manager/agentic-dialing" },
        { title: "Campaigns", url: "/dashboard/manager/agentic-dialing/campaigns" },
        { title: "Upload", url: "/dashboard/manager/agentic-dialing/csv" },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/manager/settings",
      icon: Settings,
      featureKey: 'settings',
      items: [
        { title: "General", url: "/dashboard/manager/settings" },
      ],
    },
  ],
}

export function ManagerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavUser user={displayUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
