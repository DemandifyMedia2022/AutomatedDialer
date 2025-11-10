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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

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

const API_PREFIX = `${API_BASE}/api`

export default function AgentPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [from, setFrom] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [totals, setTotals] = useState<Record<number, number>>({})

  const [viewUser, setViewUser] = useState<User | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editExt, setEditExt] = useState<string>("")

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

  const computeTotals = async (list: User[]) => {
    const entries = await Promise.all(list.map(async (u) => {
      const ext = (u.extension || '').trim()
      // Backend /api/calls supports filtering by extension (not by username/usermail)
      if (!ext) return [u.id, 0] as const
      const params = new URLSearchParams()
      params.set('extension', ext)
      if (from) {
        const fromIso = new Date(`${from}T00:00:00.000`).toISOString()
        params.set('from', fromIso)
      }
      if (to) {
        const toIso = new Date(`${to}T23:59:59.999`).toISOString()
        params.set('to', toIso)
      }
      params.set('pageSize', '1')
      try {
        const res = await fetch(`${API_PREFIX}/calls?${params.toString()}`, {
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

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (users.length) { computeTotals(users) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const onRefreshTotals = async () => {
    await computeTotals(users)
  }

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
        body: JSON.stringify({ extension: editExt || undefined })
      })
      if (!res.ok) {
        let msg = `Update failed (${res.status})`
        try { const j = await res.json(); if (j?.message) msg = j.message } catch {}
        throw new Error(msg)
      }
      setEditUser(null)
      await fetchUsers()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
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

          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="grid gap-1">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <Button onClick={onRefreshTotals}>Refresh Totals</Button>
                <Button variant="secondary" onClick={fetchUsers}>Reload Users</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Username</th>
                    <th className="py-2 pr-4">Extension</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Total Calls</th>
                    <th className="py-2 pr-0 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="py-3" colSpan={5}>Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td className="py-3" colSpan={5}>No users</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-4">{u.username ?? '-'}</td>
                        <td className="py-2 pr-4">{u.extension ?? '-'}</td>
                        <td className="py-2 pr-4">
                          {u.status ? (
                            u.status.toLowerCase() === 'active' ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                            ) : u.status.toLowerCase() === 'inactive' ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Inactive</span>
                            ) : (
                              <span>{u.status}</span>
                            )
                          ) : '-'}
                        </td>
                        <td className="py-2 pr-4">{totals[u.id] ?? 0}</td>
                        <td className="py-2 pr-0 text-right">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button variant="ghost">⋯</Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content className="min-w-[160px] rounded-md border bg-background p-1 shadow-md">
                              <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => setViewUser(u)}>View</DropdownMenu.Item>
                              <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => openEdit(u)}>Edit</DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-border" />
                              <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-red-100 text-red-700 cursor-pointer" onSelect={() => onDelete(u.id)}>Delete</DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Root>
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
                  <Label htmlFor="edit_ext">Extension</Label>
                  <Input id="edit_ext" value={editExt} onChange={(e) => setEditExt(e.target.value)} placeholder="e.g. 1001" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </SidebarInset>
    </SidebarProvider>
  )
}