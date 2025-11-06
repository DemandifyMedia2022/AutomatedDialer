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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreVertical } from 'lucide-react'

type User = {
  id: number
  username: string | null
  usermail: string | null
  role: string | null
  status: string | null
  created_at: string
  unique_user_id?: string | null
  extension?: string | null
}

type UsersResponse = { success: true; users: User[] }
type CreateResponse = { success: true; user: User }
type ApiError = { success: false; message: string; issues?: any }
type ExtRow = { extensionId: string }

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])

  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'agent', extension: '' })
  const [submitting, setSubmitting] = useState(false)
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)
  const [query, setQuery] = useState('')
  const [availableExts, setAvailableExts] = useState<ExtRow[]>([])
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set())

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
    // load available extensions for dropdowns
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/extensions/available`, { credentials: USE_AUTH_COOKIE ? 'include' : 'omit' })
        if (res.ok) {
          const data = await res.json() as { success: true; extensions: ExtRow[] }
          setAvailableExts(data.extensions)
        }
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      // Require extension if role is agent
      if (form.role === 'agent' && !form.extension) {
        throw new Error('Please select an extension for the agent')
      }
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers,
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          extension: form.extension || undefined,
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as ApiError
        throw new Error(err.message || 'Create failed')
      }
      const data = (await res.json()) as CreateResponse
      setUsers((prev) => [data.user as User, ...prev])
      setForm({ username: '', email: '', password: '', role: 'agent', extension: '' })
      setConfirmCreate(false)
      setOpenCreate(false)
      // refresh available extensions after assignment
      try {
        const res2 = await fetch(`${API_BASE}/api/extensions/available`, { credentials: USE_AUTH_COOKIE ? 'include' : 'omit' })
        if (res2.ok) setAvailableExts(((await res2.json()) as any).extensions)
      } catch {}
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

  async function updateUser(id: number, patch: Partial<{ role: string; extension: string }>) {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: 'PATCH',
        headers,
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = (await res.json()) as ApiError
        throw new Error(err.message || 'Update failed')
      }
      const data = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)))
      // refresh available extensions after (re)assignment
      try {
        const res2 = await fetch(`${API_BASE}/api/extensions/available`, { credentials: USE_AUTH_COOKIE ? 'include' : 'omit' })
        if (res2.ok) setAvailableExts(((await res2.json()) as any).extensions)
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.username, u.usermail, u.unique_user_id, u.role, u.extension]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [users, query])

  const toTitle = (s?: string | null) => {
    if (!s) return '-'
    const v = String(s)
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
  }

  const fmtDate = (s?: string | null) => {
    if (!s) return '-'
    const d = new Date(s)
    return isNaN(d.getTime()) ? '-' : d.toLocaleString()
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
            <div className="ml-auto flex items-center gap-2">
              <Input
                placeholder="Search users..."
                className="w-64"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchUsers() }} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button size="sm" onClick={() => setOpenCreate(true)}>Add User</Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Centered Modal */}
          {openCreate ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setOpenCreate(false)} />
              <Card className="relative z-10 w-[92vw] max-w-md p-5">
                <div className="text-base font-semibold mb-2">Add User</div>
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
                    <Label htmlFor="extension">Extension</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button id="extension" variant="outline" className="justify-between">
                          {form.extension ? form.extension : 'Select extension'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                        {availableExts.length === 0 ? (
                          <DropdownMenuItem disabled>No extensions available</DropdownMenuItem>
                        ) : (
                          availableExts.map((ex) => (
                            <DropdownMenuItem key={ex.extensionId} onClick={() => setForm((f) => ({ ...f, extension: ex.extensionId }))}>
                              {ex.extensionId}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="justify-between">{toTitle(form.role)}<span className="sr-only">select</span></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(['agent','manager','superadmin'] as const).map(r => (
                          <DropdownMenuItem key={r} onClick={() => setForm((f) => ({ ...f, role: r }))}>{toTitle(r)}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="confirm" checked={confirmCreate} onCheckedChange={(v) => setConfirmCreate(Boolean(v))} />
                    <Label htmlFor="confirm" className="text-sm text-muted-foreground">I confirm to create this user</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting || !confirmCreate} className="flex-1">
                      {submitting ? 'Adding...' : 'Add User'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => !submitting && setOpenCreate(false)} className="flex-1">Cancel</Button>
                  </div>
                </form>
              </Card>
            </div>
          ) : null}
          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <Card className="p-5">
            <div className="text-sm font-medium mb-4">All Users</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Username</th>
                    <th className="py-2 pr-4">User ID</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Extension</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">No users found</td></tr>
                  ) : (
                    filtered.map((u, idx) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{idx + 1}</td>
                        <td className="py-2 pr-4">{u.username || '-'}</td>
                        <td className="py-2 pr-4 font-mono">{u.unique_user_id || '-'}</td>
                        <td className="py-2 pr-4">{u.usermail || '-'}</td>
                        <td className="py-2 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!editingIds.has(u.id)}>{toTitle(u.role)}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Change role</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {['agent','manager','superadmin'].map((r) => (
                                <DropdownMenuItem key={r} onClick={() => updateUser(u.id, { role: r })}>{toTitle(r)}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="py-2 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!editingIds.has(u.id)} className="w-32 justify-between">
                                {u.extension || 'Unassigned'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                              <DropdownMenuItem onClick={() => updateUser(u.id, { extension: '' })}>Unassigned</DropdownMenuItem>
                              {/* include current extension if not in available list */}
                              {u.extension && !availableExts.some(ex => ex.extensionId === u.extension) ? (
                                <DropdownMenuItem onClick={() => updateUser(u.id, { extension: u.extension! })}>{u.extension}</DropdownMenuItem>
                              ) : null}
                              {availableExts.map((ex) => (
                                <DropdownMenuItem key={ex.extensionId} onClick={() => updateUser(u.id, { extension: ex.extensionId })}>
                                  {ex.extensionId}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="py-2 pr-4">{toTitle(u.status)}</td>
                        <td className="py-2 pr-4">{fmtDate(u.created_at)}</td>
                        <td className="py-2 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditingIds((prev) => {
                                  const n = new Set(prev)
                                  if (n.has(u.id)) n.delete(u.id)
                                  else n.add(u.id)
                                  return n
                                })
                              }}>{editingIds.has(u.id) ? 'Stop Editing' : 'Edit'}</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(u.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
