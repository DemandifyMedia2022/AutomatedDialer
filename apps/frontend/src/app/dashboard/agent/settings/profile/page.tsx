"use client"

import React, { useEffect, useState } from "react"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { User, KeyRound, Shield } from "lucide-react"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function ProfileSettingsPage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  })
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" })
  const [loading, setLoading] = useState(true)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      try {
        const url = `${API_BASE}/api/profile/me`
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
        if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`)
        const data = await res.json()
        if (!cancelled && data?.success && data?.user) {
          setProfile({ name: data.user.username || "", email: data.user.email || "" })
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadMe()
    return () => { cancelled = true }
  }, [])

  const onUpdatePassword = async () => {
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" })
      return
    }
    if (passwords.next !== passwords.confirm) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" })
      return
    }
    if (passwords.next.length < 6) {
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
          currentPassword: passwords.current,
          newPassword: passwords.next
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: "Success", description: "Password updated successfully." })
        setPasswords({ current: "", next: "", confirm: "" })
      } else {
        throw new Error(data.message || "Failed to update password")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <SidebarProvider>
      <AgentSidebar />
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
                  <BreadcrumbLink href="/dashboard/agent">Agent</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/agent/settings">Settings</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Profile</BreadcrumbPage>
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
                  <CardDescription>View your profile and manage security settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background text-muted-foreground cursor-not-allowed">
                    <User className="mr-2 h-4 w-4 opacity-50" />
                    {profile.name || (loading ? 'Loading...' : '')}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Username cannot be changed.</p>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background text-muted-foreground cursor-not-allowed">
                    <span className="mr-2 opacity-50">@</span>
                    {profile.email || (loading ? 'Loading...' : '')}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Contact support to change email.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="current">Current Password</Label>
                    <Input
                      id="current"
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next">New Password</Label>
                    <Input
                      id="next"
                      type="password"
                      value={passwords.next}
                      onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setPasswords({ current: "", next: "", confirm: "" })}>Cancel</Button>
                  <Button onClick={onUpdatePassword} disabled={updatingPassword} className="bg-violet-700 hover:bg-violet-800">
                    {updatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

