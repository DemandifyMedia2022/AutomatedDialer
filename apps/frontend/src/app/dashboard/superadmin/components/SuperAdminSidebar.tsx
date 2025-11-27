"use client"

import * as React from "react"
import {
  Users,
  Phone,
  Server,
  Code2,
  Shield,
  BarChart3,
} from "lucide-react"
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

const data = {
  user: {
    name: "Super Admin",
    email: "superadmin@example.com",
    avatar: "/next.svg",
  },
  company: {
    name: "Automated Dialer",
    logo: Phone,
  },
  navMain: [
    // Pages that are implemented:
    {
      title: "Analytics",
      url: "/dashboard/superadmin/analytics",
      icon: BarChart3,
      isActive: true,
      items: [
        { title: "Business Intelligence", url: "/dashboard/superadmin/analytics" },
        { title: "Platform Usage", url: "/dashboard/superadmin/analytics/platform-usage" },
      ],
    },
    {
      title: "Users",
      url: "/dashboard/superadmin/users",
      icon: Users,
      items: [
        { title: "All Users", url: "/dashboard/superadmin/users" },
        { title: "Roles & Permissions", url: "/dashboard/superadmin/users/roles" },
      ],
    },
    {
      title: "System",
      url: "/dashboard/superadmin/system",
      icon: Server,
      items: [
        { title: "Health Monitoring", url: "/dashboard/superadmin/system/health" },
        // Not implemented yet:
        // { title: "Database", url: "/dashboard/superadmin/system/database" },
        // { title: "Resources", url: "/dashboard/superadmin/system/resources" },
        // { title: "Integrations", url: "/dashboard/superadmin/system/integrations" },
      ],
    },
    {
      title: "Developer",
      url: "/dashboard/superadmin/developer",
      icon: Code2,
      items: [
        { title: "API Explorer", url: "/dashboard/superadmin/developer/api-explorer" },
        { title: "Activity Feed", url: "/dashboard/superadmin/developer/activity-feed" },
        // Not implemented yet:
        // { title: "Error Logs", url: "/dashboard/superadmin/developer/error-logs" },
        // { title: "Feature Flags", url: "/dashboard/superadmin/developer/feature-flags" },
        // { title: "Query Console", url: "/dashboard/superadmin/developer/query-console" },
      ],
    },
    {
      title: "Security",
      url: "/dashboard/superadmin/security",
      icon: Shield,
      items: [
        { title: "Audit Logs", url: "/dashboard/superadmin/security/audit-logs" },
        // Not implemented yet:
        // { title: "Active Sessions", url: "/dashboard/superadmin/security/sessions" },
        // { title: "Access Control", url: "/dashboard/superadmin/security/access-control" },
      ],
    },
    // Not implemented yet:
    // {
    //   title: "Settings",
    //   url: "/dashboard/superadmin/settings",
    //   icon: Settings2,
    //   items: [
    //     { title: "General", url: "/dashboard/superadmin/settings/general" },
    //     { title: "Notifications", url: "/dashboard/superadmin/settings/notifications" },
    //     { title: "Data Export", url: "/dashboard/superadmin/settings/export" },
    //   ],
    // },
  ],
}

export function SuperAdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const displayUser = {
    name: user?.email
      ? user.email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .split(" ")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
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
              <a href="/dashboard/superadmin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <data.company.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{data.company.name}</span>
                  <span className="truncate text-xs">Super Admin</span>
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
