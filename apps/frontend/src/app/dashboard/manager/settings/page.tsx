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
import { Shield, User, KeyRound, Save, Settings as SettingsIcon, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

interface ManagerSettings {
  teamName: string
  organizationName: string
  timezone: string
  autoAssignCampaigns: boolean
  requireApprovalForCalls: boolean
  extensions: string[]
  dids: string[]
}

interface UserProfile {
  id: number
  username: string
  email: string
  role: string
}

export default function ManagerSettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" })
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [settings, setSettings] = useState<ManagerSettings>({
    teamName: "",
    organizationName: "",
    timezone: "America/New_York",
    autoAssignCampaigns: false,
    requireApprovalForCalls: false,
    extensions: [],
    dids: [],
  })
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  useEffect(() => {
    // Load settings and profile
    const loadData = async () => {
      try {
        const headers: Record<string, string> = {}
        if (!USE_AUTH_COOKIE) {
          const t = getToken()
          if (t) headers["Authorization"] = `Bearer ${t}`
        }
        const options = { headers, credentials: USE_AUTH_COOKIE ? "include" as RequestCredentials : "same-origin" as RequestCredentials }

        const [settingsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/manager/settings`, options),
          fetch(`${API_BASE}/api/profile/me`, options)
        ])

        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data?.success && data?.settings) {
            setSettings({ ...settings, ...data.settings })
          }
        }

        if (profileRes.ok) {
          const data = await profileRes.json()
          if (data?.success && data?.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        // Use default settings if API fails
      } finally {
        setLoading(false)
      }
    }
    loadData()
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

  const handlePasswordUpdate = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" })
      return
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" })
      return
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" })
      return
    }

    setUpdatingPassword(true)
    try {
      const url = `${API_BASE}/api/profile/me`
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (!USE_AUTH_COOKIE) {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        credentials: USE_AUTH_COOKIE ? "include" : "same-origin",
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: "Success", description: "Password updated successfully." })
        setPasswordForm({ current: "", new: "", confirm: "" })
        setIsPasswordDialogOpen(false)
      } else {
        throw new Error(data.message || "Failed to update password")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const url = `${API_BASE}/api/profile/me`
      const headers: Record<string, string> = {}
      if (!USE_AUTH_COOKIE) {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(url, {
        method: "DELETE",
        headers,
        credentials: USE_AUTH_COOKIE ? "include" : "same-origin",
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: "Account Deleted", description: "Your account has been deleted." })
        window.location.href = "/login"
      } else {
        throw new Error(data.message || "Failed to delete account")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
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
          {/* Account & Security */}
          <Card className="transition-shadow hover:shadow-md duration-200 border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30">
                  <Shield className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Account & Security</CardTitle>
                  <CardDescription>Manage your profile and security settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background text-muted-foreground cursor-not-allowed">
                    <User className="mr-2 h-4 w-4 opacity-50" />
                    {user?.username || 'Loading...'}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Username cannot be changed.</p>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background text-muted-foreground cursor-not-allowed">
                    <span className="mr-2 opacity-50">@</span>
                    {user?.email || 'Loading...'}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Contact support to change email.</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> Security
                  </h4>
                  <p className="text-xs text-muted-foreground">Update your password to keep your account secure.</p>
                </div>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <KeyRound className="h-4 w-4" /> Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and a new one to update your account access.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPass">Current Password</Label>
                        <Input
                          id="currentPass"
                          type="password"
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                          placeholder="••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPass">New Password</Label>
                        <Input
                          id="newPass"
                          type="password"
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                          placeholder="Min 6 characters"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPass">Confirm New Password</Label>
                        <Input
                          id="confirmPass"
                          type="password"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          placeholder="Min 6 characters"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handlePasswordUpdate} disabled={updatingPassword}>
                        {updatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

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
                  <Label htmlFor="teamName">Team Name / Organization</Label>
                  <Input
                    id="teamName"
                    value={settings.teamName}
                    onChange={(e) => setSettings({ ...settings, teamName: e.target.value })}
                    placeholder="Enter team name"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Official: {settings.organizationName || 'Loading...'}</p>
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
                      <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure Details (Extensions & DIDs) */}
          <Card className="transition-shadow hover:shadow-md duration-200 border-l-4 border-l-amber-500">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30">
                  <SettingsIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-medium text-base">Allocated Resources</CardTitle>
                  <CardDescription>View your organization's extensions and phone numbers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Allocated Extensions
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[100px] content-start">
                    {settings.extensions.length > 0 ? (
                      settings.extensions.map((ext) => (
                        <div key={ext} className="px-2.5 py-1 rounded-full bg-background border text-xs font-medium shadow-sm flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-500"></span>
                          {ext}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic p-2">No extensions allocated.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">These extensions are available for your agents.</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Allocated Caller IDs (DIDs)
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[100px] content-start">
                    {settings.dids.length > 0 ? (
                      settings.dids.map((did) => (
                        <div key={did} className="px-2.5 py-1 rounded-full bg-background border text-xs font-medium shadow-sm flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-blue-500"></span>
                          {did}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic p-2">No DIDs allocated.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">These numbers can be used as Caller IDs.</p>
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
