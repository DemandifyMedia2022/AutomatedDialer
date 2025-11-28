"use client"

import React, { useEffect, useState } from "react"
import { ManagerSidebar } from "../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Save, Settings as SettingsIcon, Bell, Users, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

interface ManagerSettings {
  teamName: string
  timezone: string
  workingHoursStart: string
  workingHoursEnd: string
  notificationEmail: boolean
  notificationSms: boolean
  notificationInApp: boolean
  autoAssignCampaigns: boolean
  requireApprovalForCalls: boolean
  dailyReportTime: string
}

export default function ManagerSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<ManagerSettings>({
    teamName: "",
    timezone: "America/New_York",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    notificationEmail: true,
    notificationSms: false,
    notificationInApp: true,
    autoAssignCampaigns: false,
    requireApprovalForCalls: false,
    dailyReportTime: "08:00",
  })

  useEffect(() => {
    // Load settings from API
    const loadSettings = async () => {
      try {
        const url = `${API_BASE}/api/manager/settings`
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
          if (data?.success && data?.settings) {
            setSettings({ ...settings, ...data.settings })
          }
        }
      } catch (error) {
        // Use default settings if API fails
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = `${API_BASE}/api/manager/settings`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (!USE_AUTH_COOKIE) {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(url, {
        method: "PUT",
        headers,
        credentials: USE_AUTH_COOKIE ? "include" : "same-origin",
        body: JSON.stringify(settings),
      })
      
      if (res.ok) {
        toast({
          title: "Settings saved",
          description: "Your manager settings have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          {/* Team Configuration */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                  <Users className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Team Configuration</CardTitle>
                  <CardDescription>Manage your team settings and preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={settings.teamName}
                    onChange={(e) => setSettings({ ...settings, teamName: e.target.value })}
                    placeholder="Enter team name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30">
                  <Clock className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Working Hours</CardTitle>
                  <CardDescription>Set your team's standard working hours</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">Start Time</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={settings.workingHoursStart}
                    onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">End Time</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={settings.workingHoursEnd}
                    onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30">
                  <Bell className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificationEmail" className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="notificationEmail"
                    checked={settings.notificationEmail}
                    onCheckedChange={(checked) => setSettings({ ...settings, notificationEmail: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificationSms" className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    id="notificationSms"
                    checked={settings.notificationSms}
                    onCheckedChange={(checked) => setSettings({ ...settings, notificationSms: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificationInApp" className="text-base">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications in the application</p>
                  </div>
                  <Switch
                    id="notificationInApp"
                    checked={settings.notificationInApp}
                    onCheckedChange={(checked) => setSettings({ ...settings, notificationInApp: checked })}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="dailyReportTime">Daily Report Time</Label>
                  <Input
                    id="dailyReportTime"
                    type="time"
                    value={settings.dailyReportTime}
                    onChange={(e) => setSettings({ ...settings, dailyReportTime: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">Time to receive daily performance reports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Management */}
          <Card className="transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30">
                  <SettingsIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Campaign Management</CardTitle>
                  <CardDescription>Configure campaign-related settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoAssignCampaigns" className="text-base">Auto-assign Campaigns</Label>
                    <p className="text-sm text-muted-foreground">Automatically assign new campaigns to available agents</p>
                  </div>
                  <Switch
                    id="autoAssignCampaigns"
                    checked={settings.autoAssignCampaigns}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoAssignCampaigns: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="requireApprovalForCalls" className="text-base">Require Call Approval</Label>
                    <p className="text-sm text-muted-foreground">Require manager approval before agents can make calls</p>
                  </div>
                  <Switch
                    id="requireApprovalForCalls"
                    checked={settings.requireApprovalForCalls}
                    onCheckedChange={(checked) => setSettings({ ...settings, requireApprovalForCalls: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
