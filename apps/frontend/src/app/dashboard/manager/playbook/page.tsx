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

export default function PlaybookListPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
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

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">No documents</Card>
            ) : items.map((d: any) => (
              <Card key={d.id} className="p-4">
                <div className="font-medium truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground">{String(d.type || '').toUpperCase()} • {String(d.visibility || '').toUpperCase()}</div>
                <Separator className="my-2" />
                <div className="text-sm text-muted-foreground line-clamp-2">{d.description || d.content_richtext || '-'}</div>
                {d.file_url ? (
                  <a href={d.file_url} target="_blank" className="text-xs text-primary mt-2 inline-block">Open file</a>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
