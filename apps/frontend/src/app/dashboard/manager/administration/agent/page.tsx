"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import * as Dialog from "@radix-ui/react-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ChevronDownIcon, PlusIcon, RefreshCcw, Search as SearchIcon, CheckCircle, XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type DateRange } from "react-day-picker"

type User = {
  id: number
  username: string | null
  usermail: string | null
  role: string | null
  status: string | null
  created_at?: string | null
  unique_user_id?: string | null
  extension: string | null
}

type ExtRow = { extensionId: string; assignedCount?: number }

const API_PREFIX = `${API_BASE}/api`

export default function AgentPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [from, setFrom] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })
  const [totals, setTotals] = useState<Record<number, number>>({})

  const [q, setQ] = useState<string>("")

  const [viewUser, setViewUser] = useState<User | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editExt, setEditExt] = useState<string>("")
  const [editName, setEditName] = useState<string>("")
  const [editEmail, setEditEmail] = useState<string>("")
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active')

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', extension: '' })
  const [availableExts, setAvailableExts] = useState<ExtRow[]>([])
  const [confirmCreate, setConfirmCreate] = useState(false)

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (!USE_AUTH_COOKIE) {
      const t = getToken()
      if (t) h['Authorization'] = `Bearer ${t}`
    }
    return h
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/staff/agents`, {
        method: 'GET',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers,
      })
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`)
      const data = await res.json() as { success: boolean; users: User[] }
      const list = (data.users || [])
      setUsers(list)
      // Kick off totals fetch
      await computeTotals(list)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const fetchExtensions = async () => {
    try {
      const res = await fetch(`${API_PREFIX}/staff/agents/extensions`, {
        method: 'GET',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers,
      })
      if (res.ok) {
        const data = await res.json() as { success: boolean; extensions: ExtRow[] }
        setAvailableExts(data.extensions || [])
      }
    } catch {}
  }

  const computeTotals = async (list: User[]) => {
    const entries = await Promise.all(list.map(async (u) => {
      const uname = (u.username || '').trim()
      if (!uname) return [u.id, 0] as const
      const params = new URLSearchParams()
      params.set('username', uname)
      if (from) params.set('from', new Date(`${from}T00:00:00.000`).toISOString())
      if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString())
      try {
        const res = await fetch(`${API_PREFIX}/staff/agents/call-count?${params.toString()}`, {
          method: 'GET',
          credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
          headers,
        })
        if (!res.ok) throw new Error('')
        const data = await res.json() as { total?: number }
        return [u.id, Number(data?.total || 0)] as const
      } catch {
        return [u.id, 0] as const
      }
    }))
    const map: Record<number, number> = {}
    for (const [id, count] of entries) map[id] = count
    setTotals(map)
  }

  useEffect(() => { fetchUsers(); fetchExtensions() }, [])

  useEffect(() => {
    if (users.length) { computeTotals(users) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const onDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return
    setError(null)
    try {
      const csrfToken = USE_AUTH_COOKIE ? (document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] || '') : ''
      const reqHeaders: Record<string,string> = { ...headers }
      if (USE_AUTH_COOKIE && csrfToken) reqHeaders['X-CSRF-Token'] = csrfToken
      const res = await fetch(`${API_PREFIX}/staff/agents/${id}`, {
        method: 'DELETE',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers: reqHeaders,
      })
      if (!res.ok) {
        let msg = `Delete failed (${res.status})`
        try { const j = await res.json(); if (j?.message) msg = j.message } catch {}
        throw new Error(msg)
      }
      await fetchUsers()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditExt(u.extension || "")
    setEditName(u.username || '')
    setEditEmail(u.usermail || '')
    setEditStatus((u.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active')
  }

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setError(null)
    try {
      const csrfToken = USE_AUTH_COOKIE ? (document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] || '') : ''
      const reqHeaders: Record<string,string> = { ...headers }
      if (USE_AUTH_COOKIE && csrfToken) reqHeaders['X-CSRF-Token'] = csrfToken
      const res = await fetch(`${API_PREFIX}/staff/agents/${editUser.id}`, {
        method: 'PATCH',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers: reqHeaders,
        body: JSON.stringify({
          username: editName || undefined,
          email: editEmail || undefined,
          status: editStatus,
          extension: (editExt ?? '').trim(),
        })
      })
      if (!res.ok) {
        let msg = `Update failed (${res.status})`
        try { const j = await res.json(); if (j?.message) msg = j.message } catch {}
        throw new Error(msg)
      }
      setEditUser(null)
      await fetchUsers(); await fetchExtensions()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    }
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      const csrfToken = USE_AUTH_COOKIE ? (document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] || '') : ''
      const reqHeaders: Record<string,string> = { ...headers }
      if (USE_AUTH_COOKIE && csrfToken) reqHeaders['X-CSRF-Token'] = csrfToken
      const res = await fetch(`${API_PREFIX}/staff/agents`, {
        method: 'POST',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers: reqHeaders,
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          extension: form.extension,
        })
      })
      if (!res.ok) {
        let msg = `Create failed (${res.status})`
        try { const j = await res.json(); if (j?.message) msg = j.message } catch {}
        throw new Error(msg)
      }
      setCreateOpen(false)
      setForm({ username: '', email: '', password: '', extension: '' })
      await fetchUsers(); await fetchExtensions()
    } catch (e: any) {
      setError(e?.message || 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const visible = users.filter(u => {
    const query = q.toLowerCase()
    return (
      (u.username || '').toLowerCase().includes(query) ||
      (u.usermail || '').toLowerCase().includes(query) ||
      (u.extension || '').toLowerCase().includes(query)
    )
  })

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
                  <BreadcrumbLink href="/dashboard/manager/administration">Administration</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Agents</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}

          <Card className="p-4 shadow-sm">
            <div className="mb-4 rounded-md border bg-muted/20 p-3 relative">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="dates" variant="outline" className="h-9 w-full sm:w-[280px] justify-between font-normal">
                        {range?.from && range?.to
                          ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                          : "Select date"}
                        <ChevronDownIcon className="ml-2 size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={range}
                        captionLayout="dropdown"
                        onSelect={(r) => {
                          setRange(r)
                          const f = r?.from ? new Date(r.from) : undefined
                          const t = r?.to ? new Date(r.to) : r?.from ? new Date(r.from) : undefined
                          if (f) setFrom(f.toISOString().slice(0,10))
                          if (t) setTo(t.toISOString().slice(0,10))
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="relative w-full sm:max-w-[420px]">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9"
                    placeholder="Search users..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 justify-end absolute right-3 top-3">
                  <Button size="sm" onClick={() => setCreateOpen(true)}>Add Agent <PlusIcon className="size-4" /></Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchUsers} aria-label="Refresh">
                          <RefreshCcw className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left border-b bg-muted/10">
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Username</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Extension</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Total Calls</th>
                    <th className="py-3 pr-0 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="py-8 text-center text-muted-foreground" colSpan={5}>Loading…</td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td className="py-8 text-center text-muted-foreground" colSpan={5}>No users found</td></tr>
                  ) : (
                    visible.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-muted/30 even:bg-muted/5">
                        <td className="py-2.5 pr-4">{u.username ?? '-'}</td>
                        <td className="py-2.5 pr-4">{u.extension ?? '-'}</td>
                        <td className="py-2.5 pr-4">
                          {u.status ? (
                            u.status.toLowerCase() === 'active' ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </span>
                            ) : u.status.toLowerCase() === 'inactive' ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="mr-1 h-3 w-3" />
                                Inactive
                              </span>
                            ) : (
                              <span>{u.status}</span>
                            )
                          ) : '-'}
                        </td>
                        <td className="py-2.5 pr-4">{totals[u.id] ?? 0}</td>
                        <td className="py-2.5 pr-0 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More">
                                ⋯
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4} className="min-w-[160px] rounded-md border bg-background p-1 shadow-md">
                              <DropdownMenuItem className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => setViewUser(u)}>View</DropdownMenuItem>
                              <DropdownMenuItem className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => openEdit(u)}>Edit</DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 h-px bg-border" />
                              <DropdownMenuItem className="px-2 py-1.5 rounded hover:bg-red-100 text-red-700 cursor-pointer" onSelect={() => onDelete(u.id)}>Delete</DropdownMenuItem>
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

        {/* View Dialog */}
        <Dialog.Root open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg focus:outline-none">
              <Dialog.Title className="text-foreground font-semibold mb-2">User Details</Dialog.Title>
              {viewUser && (
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Username:</span> {viewUser.username ?? '-'}</div>
                  <div><span className="font-medium">Email:</span> {viewUser.usermail ?? '-'}</div>
                  <div><span className="font-medium">Role:</span> {viewUser.role ?? '-'}</div>
                  <div><span className="font-medium">Status:</span> {viewUser.status ?? '-'}</div>
                  <div><span className="font-medium">Extension:</span> {viewUser.extension ?? '-'}</div>
                  <div><span className="font-medium">Unique ID:</span> {viewUser.unique_user_id ?? '-'}</div>
                  <div><span className="font-medium">Total Calls (current filter):</span> {totals[viewUser.id] ?? 0}</div>
                </div>
              )}
              <div className="mt-4 flex justify-end"><Button onClick={() => setViewUser(null)}>Close</Button></div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Edit Dialog */}
        <Dialog.Root open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg focus:outline-none">
              <Dialog.Title className="text-foreground font-semibold mb-2">Edit User</Dialog.Title>
              <form onSubmit={onSaveEdit} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit_name">Username</Label>
                  <Input id="edit_name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input id="edit_email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="justify-between">{editStatus === 'active' ? 'Active' : 'Inactive'}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[160px] p-1">
                      {(['active','inactive'] as const).map(s => (
                        <DropdownMenuItem key={s} onClick={() => setEditStatus(s)} className="px-2 py-1.5">
                          {s === 'active' ? 'Active' : 'Inactive'}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_ext">Extension</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button id="edit_ext" variant="outline" className="justify-between">{editExt || 'Select extension'}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-64 overflow-auto min-w-[180px] p-1">
                      <DropdownMenuItem onClick={() => setEditExt("")}>Unassigned</DropdownMenuItem>
                      {availableExts.map(ex => {
                        const isCurrent = (editExt || '') === ex.extensionId
                        const count = ex.assignedCount ?? 0
                        const isFull = count >= 10 && !isCurrent
                        const label = isFull ? `${ex.extensionId} (Full)` : ex.extensionId
                        return (
                          <DropdownMenuItem key={ex.extensionId} disabled={isFull} onClick={() => !isFull && setEditExt(ex.extensionId)} className="px-2 py-1.5">
                            {label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Create Agent Dialog */}
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg focus:outline-none">
              <Dialog.Title className="text-foreground font-semibold mb-2">Add Agent</Dialog.Title>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="create_name">Username</Label>
                  <Input id="create_name" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Jane Doe" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create_email">Email</Label>
                  <Input id="create_email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create_password">Password</Label>
                  <Input id="create_password" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" minLength={6} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create_ext">Extension</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button id="create_ext" variant="outline" className="justify-between">{form.extension || 'Select extension'}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-64 overflow-auto min-w-[180px] p-1">
                      {availableExts.filter(ex => (ex.assignedCount ?? 0) < 10).length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No extensions available</div>
                      ) : (
                        availableExts.filter(ex => (ex.assignedCount ?? 0) < 10).map(ex => (
                          <DropdownMenuItem key={ex.extensionId} onClick={() => setForm(f => ({ ...f, extension: ex.extensionId }))} className="px-2 py-1.5">
                            {ex.extensionId}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <input id="confirm_create" type="checkbox" checked={confirmCreate} onChange={(e) => setConfirmCreate(e.target.checked)} />
                  <Label htmlFor="confirm_create" className="text-sm text-muted-foreground">I confirm to create this agent</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={creating || !confirmCreate}>{creating ? 'Adding…' : 'Add'}</Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </SidebarInset>
    </SidebarProvider>
  )
}