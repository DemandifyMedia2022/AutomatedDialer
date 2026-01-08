"use client"

import { ChevronRight, Lock, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useDemoRestrictions } from "@/hooks/useDemoRestrictions"
import { cn } from "@/lib/utils"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
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
  }[]
}) {
  const { isFeatureLocked } = useDemoRestrictions();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isItemLocked = item.featureKey ? isFeatureLocked(item.featureKey) : false;

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(isItemLocked && "opacity-50 cursor-not-allowed grayscale-[0.5]")}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5 min-w-0 shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                    {isItemLocked ? (
                      <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubLocked = subItem.featureKey ? isFeatureLocked(subItem.featureKey) : isItemLocked;

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className={cn(isSubLocked && "opacity-50 cursor-not-allowed grayscale-[0.5]")}
                          >
                            <a
                              href={isSubLocked ? "#" : subItem.url}
                              onClick={(e) => {
                                if (isSubLocked) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <div className="flex items-center w-full">
                                <span>{subItem.title}</span>
                                {isSubLocked && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
                              </div>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
