"use client"

import * as React from "react"
import { ClipboardList, BarChart3, Settings, Phone, LucideIcon } from "lucide-react"
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
    name: "QA Analyst",
    email: "qa@example.com",
    avatar: "/next.svg",
  },
  company: {
    name: "Automated Dialer",
    logo: Phone,
  },
  navMain: [
    {
      title: "QA Workbench",
      url: "#",
      icon: ClipboardList,
      featureKey: 'qa-workbench',
      items: [
        { title: "Call Review", url: "/dashboard/qa/call-review", featureKey: 'qa-review' },
        { title: "Transcripts", url: "/dashboard/qa/transcripts", featureKey: 'qa-transcripts' },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: BarChart3,
      featureKey: 'qa-analytics',
      items: [
        { title: "QA Reports", url: "/dashboard/qa/analytics/reports" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      featureKey: 'settings',
      items: [
        { title: "Profile", url: "/dashboard/qa/settings/profile" },
      ],
    },
  ],
}

export function QaSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const displayUser = {
    name: user?.username || (user?.email
      ? user.email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
      : data.user.name),
    email: user?.email || data.user.email,
    avatar: "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard/qa">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <data.company.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{data.company.name}</span>
                  <span className="truncate text-xs">QA Analyst</span>
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
