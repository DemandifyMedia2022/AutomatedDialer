"use client"

import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '@/lib/api'
import { USE_AUTH_COOKIE, getCsrfTokenFromCookies } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { SuperAdminSidebar } from '../components/SuperAdminSidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

type User = {
  id: number
  username: string | null
  usermail: string | null
  role: string | null
  status: string | null
  created_at: string
}

type UsersResponse = { success: true; users: User[] }
type CreateResponse = { success: true; user: User }
type ApiError = { success: false; message: string; issues?: any }

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])

  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'agent' })
  const [submitting, setSubmitting] = useState(false)

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (USE_AUTH_COOKIE) {
      const csrf = getCsrfTokenFromCookies()
      if (csrf) h['X-CSRF-Token'] = csrf
    }
    return h
  }, [])

  async function fetchUsers() {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'GET',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
      })
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`)
      const data = (await res.json()) as UsersResponse
      setUsers(data.users)
    } catch (e: any) {
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers,
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as ApiError
        throw new Error(err.message || 'Create failed')
      }
      const data = (await res.json()) as CreateResponse
      setUsers((prev) => [data.user, ...prev])
      setForm({ username: '', email: '', password: '', role: 'agent' })
    } catch (e: any) {
      setError(e?.message || 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Delete this user?')) return
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: 'DELETE',
        headers,
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
      })
      if (!res.ok) {
        const err = (await res.json()) as ApiError
        throw new Error(err.message || 'Delete failed')
      }
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  return (
    <SidebarProvider>
      <SuperAdminSidebar />
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
                  <BreadcrumbLink href="/dashboard/superadmin">Super Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Users</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchUsers() }} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="text-sm font-medium mb-4">Add User</div>
              <form onSubmit={onCreate} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="Jane Doe" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••" minLength={6} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select id="role" className="w-full border rounded px-3 py-2 bg-background" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="agent">Agent</option>
                    <option value="manager">Manager</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Adding...' : 'Add User'}
                </Button>
              </form>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-medium mb-4">All Users</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Username</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Loading...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No users found</td></tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{u.id}</td>
                          <td className="py-2 pr-4">{u.username || '-'}</td>
                          <td className="py-2 pr-4">{u.usermail || '-'}</td>
                          <td className="py-2 pr-4">{u.role || '-'}</td>
                          <td className="py-2 pr-4">{u.status || '-'}</td>
                          <td className="py-2 pr-4">{new Date(u.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-4">
                            <Button variant="destructive" size="sm" onClick={() => onDelete(u.id)}>Delete</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
