"use client"
import React, { useState, useEffect, useCallback } from 'react'
import Dialpad from '../../components/Dialpad'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Clock, FileText, Search, Trash2, Mic, MicOff, AlertCircle, PhoneCall } from 'lucide-react'
import { format } from 'date-fns'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"

const API_PREFIX = `${API_BASE}/api`

const timeAgo = (iso?: string | null) => {
    try {
        if (!iso) return 'just now'
        const t = new Date(iso).getTime()
        if (!isFinite(t)) return 'just now'
        const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
        if (s < 5) return 'just now'
        if (s < 60) return `${s} sec ago`
        const m = Math.floor(s / 60)
        if (m < 60) return m === 1 ? '1 min ago' : `${m} mins ago`
        const h = Math.floor(m / 60)
        if (h < 24) return h === 1 ? '1 hr ago' : `${h} hrs ago`
        const d = Math.floor(h / 24)
        return d === 1 ? '1 day ago' : `${d} days ago`
    } catch { return 'just now' }
}

export default function Dialer() {
    // Call History State
    const [callHistory, setCallHistory] = useState<any[]>([])

    // Notes State
    const [notes, setNotes] = useState<Array<{ id: string; text: string; phone?: string; at: string }>>([])
    const [newNote, setNewNote] = useState("")

    // Docs State
    const [docs, setDocs] = useState<any[]>([])
    const [docsLoading, setDocsLoading] = useState(false)
    const [docQuery, setDocQuery] = useState("")
    const [previewDoc, setPreviewDoc] = useState<any | null>(null)

    const fetchHistory = useCallback(async () => {
        try {
            const headers: Record<string, string> = {}
            let credentials: RequestCredentials = 'omit'
            if (USE_AUTH_COOKIE) {
                credentials = 'include'
                const csrf = getCsrfTokenFromCookies()
                if (csrf) headers['X-CSRF-Token'] = csrf
            } else {
                const t = getToken()
                if (t) headers['Authorization'] = `Bearer ${t}`
            }
            const res = await fetch(`${API_PREFIX}/calls/mine?page=1&pageSize=5`, { headers, credentials })
            if (!res.ok) return
            const data = await res.json().catch(() => null) as any
            const list = Array.isArray(data?.items)
                ? data.items
                : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
            setCallHistory(list)
        } catch { }
    }, [])

    const fetchNotes = useCallback(async () => {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            let credentials: RequestCredentials = 'omit'
            if (USE_AUTH_COOKIE) {
                credentials = 'include'
                const csrf = getCsrfTokenFromCookies()
                if (csrf) headers['X-CSRF-Token'] = csrf
            } else {
                const t = getToken()
                if (t) headers['Authorization'] = `Bearer ${t}`
            }

            // Fetch recent notes (limit 20)
            const qs = new URLSearchParams()
            qs.set('limit', '20')

            const res = await fetch(`${API_PREFIX}/notes?${qs.toString()}`, { headers, credentials })
            if (!res.ok) return
            const data = await res.json().catch(() => null) as any
            const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
            const mapped = items.map((n: any) => ({
                id: String(n.id),
                text: String(n.body || ''),
                phone: n.phone_e164 || undefined,
                at: (n.created_at || new Date().toISOString()).slice(0, 16).replace('T', ' ')
            }))
            setNotes(mapped)
        } catch { }
    }, [])

    const addNote = async () => {
        if (!newNote.trim()) return
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            let credentials: RequestCredentials = 'omit'
            if (USE_AUTH_COOKIE) {
                credentials = 'include'
                const csrf = getCsrfTokenFromCookies()
                if (csrf) headers['X-CSRF-Token'] = csrf
            } else {
                const t = getToken()
                if (t) headers['Authorization'] = `Bearer ${t}`
            }

            const payload = { title: newNote.trim().slice(0, 80), body: newNote.trim(), tags_csv: '' }
            const res = await fetch(`${API_PREFIX}/notes`, { method: 'POST', headers, credentials, body: JSON.stringify(payload) })
            if (!res.ok) throw new Error('Failed to save note')
            const saved = await res.json()
            const mapped = {
                id: String(saved.id),
                text: String(saved.body || newNote.trim()),
                phone: saved.phone_e164 || undefined,
                at: (saved.created_at || new Date().toISOString()).slice(0, 16).replace('T', ' ')
            }
            setNotes((n) => [mapped, ...n])
            setNewNote("")
        } catch { }
    }

    const removeNote = async (id: string) => {
        try {
            const headers: Record<string, string> = {}
            let credentials: RequestCredentials = 'omit'
            if (USE_AUTH_COOKIE) {
                credentials = 'include'
                const csrf = getCsrfTokenFromCookies()
                if (csrf) headers['X-CSRF-Token'] = csrf
            } else {
                const t = getToken()
                if (t) headers['Authorization'] = `Bearer ${t}`
            }
            const res = await fetch(`${API_PREFIX}/notes/${encodeURIComponent(id)}`, { method: 'DELETE', headers, credentials })
            if (!res.ok) throw new Error('Failed to delete note')
            setNotes((n) => n.filter((x) => x.id !== id))
        } catch { }
    }

    const fetchDocs = useCallback(async () => {
        try {
            setDocsLoading(true)
            const headers: Record<string, string> = {}
            let credentials: RequestCredentials = 'omit'
            if (USE_AUTH_COOKIE) { credentials = 'include' }
            else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }

            const qs = new URLSearchParams({ page: '1', pageSize: '12' })
            if (docQuery) qs.set('q', docQuery)

            const res = await fetch(`${API_PREFIX}/documents?${qs.toString()}`, { headers, credentials })
            if (!res.ok) { setDocs([]); return }
            const data = await res.json().catch(() => null) as any
            setDocs(Array.isArray(data?.items) ? data.items : [])
        } catch { setDocs([]) } finally { setDocsLoading(false) }
    }, [docQuery])

    // Initial fetch
    useEffect(() => {
        fetchHistory()
        fetchNotes()
        fetchDocs()
    }, [fetchHistory, fetchNotes, fetchDocs])


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
                                    <BreadcrumbLink href="/dashboard/agent">Dialer</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>GSM Dialer</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div >
                </header>

                <div className="flex flex-1 flex-col gap-2 p-4 pt-0 h-[calc(100vh-4rem)]">
                    <div className="space-y-6 h-full flex flex-col">
                        <div className="grid gap-6 lg:grid-cols-3 flex-1 h-full min-h-0">
                            {/* Left Column: Dialpad + History */}
                            <div className="lg:col-span-1">
                                <Dialpad>
                                    <Separator className="my-3" />
                                    <div className="text-sm font-medium mb-2">Recent Calls</div>
                                    <div className="space-y-2 text-sm">
                                        {callHistory.length === 0 ? (
                                            <div className="text-xs text-muted-foreground p-2 text-center">No recent calls</div>
                                        ) : callHistory.slice(0, 5).map((h: any, i: number) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <PhoneCall className="h-4 w-4 text-primary shrink-0" />
                                                    <div className="truncate font-medium">{h.destination || h.phone || h.number || "Unknown"}</div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                                    {h.disposition ? (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${h.disposition === 'Answered' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                                                            h.disposition === 'Busy' ? 'bg-orange-500/10 text-orange-700 border border-orange-500/20' :
                                                                h.disposition === 'No Answer' ? 'bg-slate-500/10 text-slate-700 border border-slate-500/20' :
                                                                    'bg-muted text-foreground/80 border border-border'
                                                            }`}>
                                                            {h.disposition}
                                                        </span>
                                                    ) : null}
                                                    <div className="text-xs text-muted-foreground">{timeAgo(h.end_time || h.start_time || null)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Dialpad>
                            </div>

                            {/* Right Column: Notes + Documents */}
                            <div className="lg:col-span-2 space-y-3 h-full overflow-y-auto pb-4">
                                {/* Notes */}
                                <Card className="p-0 transition-shadow hover:shadow-md">
                                    <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
                                        <div className="font-semibold text-base">Notes</div>
                                        <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                                            {notes.length} notes
                                        </div>
                                    </div>
                                    <Separator />
                                    <Tabs defaultValue="all" className="px-5 py-4">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="all">All Notes</TabsTrigger>
                                            <TabsTrigger value="new">+ New Note</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="all" className="mt-4">
                                            <ScrollArea className="h-[220px] pr-3">
                                                <div className="space-y-2">
                                                    {notes.length === 0 ? (
                                                        <div className="text-sm text-muted-foreground text-center py-8">No notes yet</div>
                                                    ) : notes.map((n) => (
                                                        <Card key={n.id} className="p-3 flex items-start justify-between transition-all hover:shadow-sm hover:border-primary/30">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm">{n.text}</div>
                                                                <div className="mt-1.5 text-xs text-muted-foreground">{n.phone ? `${n.phone} · ` : ""}{n.at}</div>
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => removeNote(n.id)}
                                                                className="ml-2 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>
                                        <TabsContent value="new" className="mt-4">
                                            <div className="space-y-3">
                                                <Textarea
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    placeholder="Write a quick note..."
                                                    className="min-h-[120px]"
                                                />
                                                <div className="text-right">
                                                    <Button
                                                        onClick={addNote}
                                                        className="transition-all hover:shadow-md active:scale-95"
                                                        disabled={!newNote.trim()}
                                                    >
                                                        Save Note
                                                    </Button>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </Card>

                                {/* Documents */}
                                <Card className="p-0 transition-shadow hover:shadow-md">
                                    <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
                                        <div className="font-semibold text-base">Shared Documents</div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Input
                                                    placeholder="Search documents..."
                                                    value={docQuery}
                                                    onChange={(e) => setDocQuery(e.target.value)}
                                                    className="pl-8 w-64"
                                                />
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => fetchDocs()}
                                                disabled={docsLoading}
                                                className="transition-all hover:bg-primary/10 hover:border-primary/50"
                                            >
                                                Search
                                            </Button>
                                        </div>
                                    </div>
                                    <Separator />
                                    {previewDoc ? (
                                        <div className="p-5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPreviewDoc(null)}
                                                className="self-start mb-4"
                                            >
                                                ← Back to list
                                            </Button>
                                            <div className="border rounded-md p-4 bg-white dark:bg-zinc-950 max-h-[400px] overflow-auto">
                                                <h3 className="text-lg font-bold mb-4">{previewDoc.title}</h3>
                                                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewDoc.content }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-5 space-y-2">
                                            {docsLoading ? (
                                                <Card className="p-4 text-sm text-muted-foreground text-center">Loading…</Card>
                                            ) : docs.length === 0 ? (
                                                <Card className="p-4 text-sm text-muted-foreground text-center">No documents found</Card>
                                            ) : (
                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                    {docs.map((d: any) => (
                                                        <Card key={d.id} className="p-4 transition-all hover:shadow-md hover:border-primary/30">
                                                            <div className="font-medium truncate text-base">{d.title}</div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-muted">{String(d.type || '').toUpperCase()}</span>
                                                                {' • '}
                                                                <span className="px-1.5 py-0.5 rounded bg-muted">{String(d.visibility || '').toUpperCase()}</span>
                                                            </div>
                                                            <Separator className="my-2" />
                                                            <div className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                                                {d.description || d.content_richtext || '-'}
                                                            </div>
                                                            <div className="mt-3 text-right">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setPreviewDoc(d)}
                                                                    className="transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-95"
                                                                >
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
