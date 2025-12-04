"use client"

import React from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FileText, Eye, Trash2, Upload, Search, AlertCircle, BookOpen, File, Edit, CheckCircle, XCircle } from 'lucide-react'

export default function PlaybookListPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [loadingId, setLoadingId] = React.useState<string | number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [previewItem, setPreviewItem] = React.useState<any | null>(null)
  const pageSize = 20

  const fetchItems = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
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
      if (!res.ok) {
        setError('Failed to load playbooks')
        return
      }
      const data = await res.json().catch(() => null) as any
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      setError('An error occurred while loading playbooks')
    } finally {
      setLoading(false)
    }
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

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'playbook':
        return <BookOpen className="h-4 w-4" />
      case 'guide':
        return <FileText className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'playbook':
        return 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30'
      case 'guide':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
      case 'template':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusBadge = (status: string) => {
    const isActive = status?.toLowerCase() === 'active'
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${
          isActive 
            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30' 
            : 'bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
        }`}
      >
        {isActive ? (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </>
        )}
      </Badge>
    )
  }

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
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
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search playbooks..." 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
                  className="w-64 pl-8" 
                />
              </div>
              <Button onClick={() => setPage(1)} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button asChild size="sm">
                <a href="/dashboard/manager/playbook/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </a>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-20" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No playbooks found</h3>
                <p className="text-sm text-muted-foreground">
                  {q ? 'Try adjusting your search terms' : 'Get started by uploading your first playbook'}
                </p>
                {!q && (
                  <Button asChild className="mt-4">
                    <a href="/dashboard/manager/playbook/upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Playbook
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((d: any) => (
                <Card key={d.id} className="transition-shadow hover:shadow-md flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getTypeIcon(d.type)}
                        <CardTitle className="text-base truncate">{d.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getTypeBadgeColor(d.type)}>
                        {String(d.type || 'other').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {String(d.visibility || 'org').toUpperCase()}
                      </Badge>
                      {getStatusBadge(d.status || 'active')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {d.description || d.content_richtext || 'No description available'}
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setPreviewItem(d)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <a href={`/dashboard/manager/playbook/${d.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={loadingId === d.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this playbook?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete "{d.title}".
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
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Preview Sheet */}
        <Sheet open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-2">
                {previewItem && getTypeIcon(previewItem.type)}
                <SheetTitle>{previewItem?.title}</SheetTitle>
              </div>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                {previewItem && (
                  <>
                    <Badge variant="outline" className={getTypeBadgeColor(previewItem.type)}>
                      {String(previewItem.type || 'other').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {String(previewItem.visibility || 'org').toUpperCase()}
                    </Badge>
                    {getStatusBadge(previewItem.status || 'active')}
                  </>
                )}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {previewItem?.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{previewItem.description}</p>
                </div>
              )}
              {previewItem?.content_richtext && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Content</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
                    {previewItem.content_richtext}
                  </div>
                </div>
              )}
              {previewItem?.file_url && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">File</h4>
                  <Button asChild variant="outline" className="w-full">
                    <a href={previewItem.file_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      Open File
                    </a>
                  </Button>
                </div>
              )}
              {previewItem?.tags_csv && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewItem.tags_csv.split(',').map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </SidebarInset>
    </SidebarProvider>
  )
}
