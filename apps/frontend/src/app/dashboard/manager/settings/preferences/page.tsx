"use client"

import React, { useEffect, useState } from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Save, Palette, Layout, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

interface UserPreferences {
  theme: string
  language: string
  dateFormat: string
  timeFormat: string
  compactMode: boolean
  showAnimations: boolean
  autoRefresh: boolean
  refreshInterval: string
}

export default function PreferencesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "system",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    compactMode: false,
    showAnimations: true,
    autoRefresh: true,
    refreshInterval: "30",
  })

  useEffect(() => {
    // Load preferences from API
    const loadPreferences = async () => {
      try {
        const url = `${API_BASE}/api/manager/preferences`
        const headers: Record<string, string> = {}
        if (!USE_AUTH_COOKIE) {
          const t = getToken()
          if (t) headers["Authorization"] = `Bearer ${t}`
        }
        const res = await fetch(url, {
          method: "GET",
          headers,
          credentials: USE_AUTH_COOKIE ? "include" : "same-origin",
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.success && data?.preferences) {
            setPreferences({ ...preferences, ...data.preferences })
          }
        }
      } catch (error) {
        // Use default preferences if API fails
      } finally {
        setLoading(false)
      }
    }
    loadPreferences()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = `${API_BASE}/api/manager/preferences`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (!USE_AUTH_COOKIE) {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(url, {
        method: "PUT",
        headers,
        credentials: USE_AUTH_COOKIE ? "include" : "same-origin",
        body: JSON.stringify(preferences),
      })
      
      if (res.ok) {
        toast({
          title: "Preferences saved",
          description: "Your preferences have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save preferences")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager/settings">Settings</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Preferences</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          {/* Appearance */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30">
                  <Palette className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of your dashboard</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) => setPreferences({ ...preferences, theme: value })}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Format */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30">
                  <Layout className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Display Format</CardTitle>
                  <CardDescription>Configure date, time, and layout preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={preferences.dateFormat}
                    onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select
                    value={preferences.timeFormat}
                    onValueChange={(value) => setPreferences({ ...preferences, timeFormat: value })}
                  >
                    <SelectTrigger id="timeFormat">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compactMode" className="text-base">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Use a more compact layout with reduced spacing</p>
                </div>
                <Switch
                  id="compactMode"
                  checked={preferences.compactMode}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, compactMode: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                  <Zap className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Performance</CardTitle>
                  <CardDescription>Optimize dashboard performance and behavior</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showAnimations" className="text-base">Show Animations</Label>
                    <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                  </div>
                  <Switch
                    id="showAnimations"
                    checked={preferences.showAnimations}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, showAnimations: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoRefresh" className="text-base">Auto-refresh Data</Label>
                    <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                  </div>
                  <Switch
                    id="autoRefresh"
                    checked={preferences.autoRefresh}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, autoRefresh: checked })}
                  />
                </div>
                {preferences.autoRefresh && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                      <Select
                        value={preferences.refreshInterval}
                        onValueChange={(value) => setPreferences({ ...preferences, refreshInterval: value })}
                      >
                        <SelectTrigger id="refreshInterval">
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">1 minute</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
