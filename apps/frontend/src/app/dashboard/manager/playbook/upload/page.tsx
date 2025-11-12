"use client"

import React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManagerSidebar } from '../../components/ManagerSidebar'
import { API_BASE } from '@/lib/api'
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from '@/lib/auth'

export default function PlaybookUploadPage() {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [type, setType] = React.useState('guide')
  const [visibility, setVisibility] = React.useState('org')
  const [tags, setTags] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [text, setText] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<string | null>(null)

  const submit = async () => {
    setError(null); setOk(null)
    try {
      let credentials: RequestCredentials = 'omit'
      const headers: Record<string, string> = {}
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }

      let res: Response
      if (file) {
        const form = new FormData()
        form.append('type', type)
        form.append('title', title)
        form.append('description', description)
        form.append('visibility', visibility)
        form.append('tags_csv', tags)
        if (text.trim()) form.append('content_richtext', text.trim())
        form.append('file', file)
        res = await fetch(`${API_BASE}/api/documents`, { method: 'POST', body: form, credentials, headers })
      } else {
        const body = JSON.stringify({ type, title, description, visibility, tags_csv: tags, content_richtext: text.trim() })
        res = await fetch(`${API_BASE}/api/documents`, { method: 'POST', credentials, headers: { ...headers, 'Content-Type': 'application/json' }, body })
      }

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      setOk('Uploaded')
      setTitle(''); setDescription(''); setTags(''); setFile(null); setText('')
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    }
  }

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager/playbook">Playbook</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Upload</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {error ? <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card> : null}
          {ok ? <Card className="border-emerald-300 bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</Card> : null}

          <Card className="p-5 space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="playbook">Playbook</SelectItem>
                    <SelectItem value="snippet">Snippet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="org">Org</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sales,pitch" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Upload file (optional)</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>Or paste text (optional)</Label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste content..." className="min-h-[140px]" />
              </div>
            </div>

            <div className="text-right">
              <Button onClick={submit} disabled={!title.trim() || (!file && !text.trim())}>Submit</Button>
            </div>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
