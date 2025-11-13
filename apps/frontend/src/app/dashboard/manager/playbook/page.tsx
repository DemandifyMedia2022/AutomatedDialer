"use client"

import React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ManagerSidebar } from '../components/ManagerSidebar'
import { API_BASE } from '@/lib/api'
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from '@/lib/auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function PlaybookListPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [loadingId, setLoadingId] = React.useState<string | number | null>(null)
  const pageSize = 20

  const fetchItems = React.useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q) qs.set('q', q)
      const res = await fetch(`${API_BASE}/api/documents?${qs.toString()}`, { headers, credentials })
      if (!res.ok) return
      const data = await res.json().catch(() => null) as any
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch {}
  }, [q, page])

  React.useEffect(() => { fetchItems() }, [fetchItems])

  const deleteItem = React.useCallback(async (id: string | number) => {
    if (!id) return
    try {
      setLoadingId(id)
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: 'DELETE', headers, credentials })
      if (res.ok) {
        await fetchItems()
      }
    } finally {
      setLoadingId(null)
    }
  }, [fetchItems])

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Playbook</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
              <Button onClick={() => setPage(1)}>Search</Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-3 pt-0">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.length === 0 ? (
              <Card className="p-3 text-sm text-muted-foreground">No documents</Card>
            ) : items.map((d: any) => (
              <Card key={d.id} className="p-3">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{String(d.type || '').toUpperCase()} • {String(d.visibility || '').toUpperCase()}</div>
                <Separator className="my-1" />
                <div className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">{d.description || d.content_richtext || '-'}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {d.file_url ? (
                    <Button asChild variant="outline">
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer">View</a>
                    </Button>
                  ) : <span className="text-[10px] text-muted-foreground">No file</span>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={loadingId === d.id}>Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this playbook?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone and will permanently remove the playbook.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingId === d.id}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteItem(d.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={loadingId === d.id}
                        >
                          {loadingId === d.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
