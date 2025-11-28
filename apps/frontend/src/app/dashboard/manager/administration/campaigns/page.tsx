"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import * as Dialog from "@radix-ui/react-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarIcon, Check, ChevronsUpDown, Pencil, Trash2, Plus, Activity, Target, Users as UsersIcon, TrendingUp, AlertCircle } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"

type Campaign = {
  id: number
  campaign_id: number | null
  campaign_name: string | null
  start_date: string | null
  end_date: string | null
  allocations: string | null
  assigned_to: string | null
  status: string | null
  method: string | null
  created_at?: string | null
  updated_at?: string | null
}

const API_PREFIX = `${API_BASE}/api`

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    campaign_id: "",
    campaign_name: "",
    start_date: "",
    end_date: "",
    allocations: "",
    assigned_to: "",
    status: "",
    method: [] as string[],
  })

  const [methodFilter, setMethodFilter] = useState("")
  const [statusOpen, setStatusOpen] = useState(false)
  const [assignedToOpen, setAssignedToOpen] = useState(false)

  // Calculate campaign metrics
  const metrics = useMemo(() => {
    const total = items.length
    const active = items.filter(c => c.status?.toLowerCase() === 'active').length
    const inactive = items.filter(c => c.status?.toLowerCase() === 'inactive').length
    const totalAllocations = items.reduce((sum, c) => {
      const num = parseInt(c.allocations || '0')
      return sum + (isNaN(num) ? 0 : num)
    }, 0)
    return { total, active, inactive, totalAllocations }
  }, [items])

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (!USE_AUTH_COOKIE) {
      const t = getToken()
      if (t) h['Authorization'] = `Bearer ${t}`
    }
    return h
  }, [])

  const onDelete = async (id: number) => {
    if (!confirm('Delete this campaign?')) return
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/campaigns/${id}`, {
        method: 'DELETE',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers,
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      await fetchItems()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/campaigns`, {
        method: 'GET',
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers,
      })
      if (!res.ok) throw new Error(`Failed to load campaigns (${res.status})`)
      const data = await res.json() as { success: boolean; items: Campaign[] }
      setItems(data.items || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const onMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value)
    setForm((f) => ({ ...f, method: selected }))
  }

  const onStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target
    setForm((f) => ({ ...f, status: value }))
  }

  const methodOptions = [
    'AG',
    'BANT',
    'Content Syndication',
    'CS',
    'Data',
    'Email Marketing',
    'Event',
    'Form Fill',
    'HQL',
    'NetApp',
    'Webinar',
  ]

  const filteredMethods = methodOptions.filter((m) => m.toLowerCase().includes(methodFilter.toLowerCase()))

  // Available agents for assignment (mock data - replace with actual API call)
  const availableAgents = [
    'team-a',
    'team-b',
    'team-c',
    'agent-john',
    'agent-sarah',
    'agent-mike',
  ]

  const filteredAgents = availableAgents.filter((a) => 
    a.toLowerCase().includes((form.assigned_to || '').toLowerCase())
  )

  const formatDateInput = (d?: string | null) => {
    if (!d) return ""
    const dt = new Date(d)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const payload: any = {
        campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
        campaign_name: form.campaign_name || null,
        start_date: form.start_date ? `${form.start_date}T00:00:00` : null,
        end_date: form.end_date ? `${form.end_date}T00:00:00` : null,
        allocations: form.allocations || null,
        assigned_to: form.assigned_to || null,
        status: form.status || null,
        method: (form.method && form.method.length > 0) ? form.method.join(',') : null,
      }
      const url = editingId ? `${API_PREFIX}/campaigns/${editingId}` : `${API_PREFIX}/campaigns`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setOpen(false)
      setEditingId(null)
      setForm({ campaign_id: "", campaign_name: "", start_date: "", end_date: "", allocations: "", assigned_to: "", status: "", method: [] })
      await fetchItems()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
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
                  <BreadcrumbPage>Campaigns</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Dialog.Root open={open} onOpenChange={(v) => { if (!v) { setEditingId(null); setForm({ campaign_id: "", campaign_name: "", start_date: "", end_date: "", allocations: "", assigned_to: "", status: "", method: [] }) }; setOpen(v) }}>
                <Dialog.Trigger asChild>
                  <Button>
                    <Plus className="mr-2 size-4" />
                    Add Campaign
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 max-h-[90vh] overflow-y-auto">
                    <Dialog.Title className="text-foreground font-semibold text-lg mb-4 flex items-center gap-2">
                      <div className="grid size-8 place-items-center rounded-full border bg-primary/10 text-primary border-primary/20">
                        {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                      </div>
                      {editingId ? 'Edit Campaign' : 'Add Campaign'}
                    </Dialog.Title>
                    <form onSubmit={onSubmit} className="">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-4">
                        <div className="grid gap-2">
                          <Label htmlFor="campaign_id">Campaign ID</Label>
                          <Input id="campaign_id" name="campaign_id" type="number" value={form.campaign_id} onChange={onChange} placeholder="e.g. 1001" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="campaign_name">Campaign Name</Label>
                          <Input id="campaign_name" name="campaign_name" value={form.campaign_name} onChange={onChange} placeholder="e.g. Winter Promo" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="start_date">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button id="start_date" variant="outline" className="h-9 w-full justify-between font-normal">
                                {form.start_date ? new Date(form.start_date).toLocaleDateString() : 'Select date'}
                                <CalendarIcon className="ml-2 size-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={form.start_date ? new Date(form.start_date) : undefined}
                                onSelect={(d) => {
                                  if (!d) return
                                  const y = d.getFullYear()
                                  const m = String(d.getMonth() + 1).padStart(2, '0')
                                  const day = String(d.getDate()).padStart(2, '0')
                                  setForm((f) => ({ ...f, start_date: `${y}-${m}-${day}` }))
                                }}
                                captionLayout="dropdown"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="end_date">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button id="end_date" variant="outline" className="h-9 w-full justify-between font-normal">
                                {form.end_date ? new Date(form.end_date).toLocaleDateString() : 'Select date'}
                                <CalendarIcon className="ml-2 size-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={form.end_date ? new Date(form.end_date) : undefined}
                                onSelect={(d) => {
                                  if (!d) return
                                  const y = d.getFullYear()
                                  const m = String(d.getMonth() + 1).padStart(2, '0')
                                  const day = String(d.getDate()).padStart(2, '0')
                                  setForm((f) => ({ ...f, end_date: `${y}-${m}-${day}` }))
                                }}
                                captionLayout="dropdown"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="allocations">Allocations</Label>
                          <Input id="allocations" name="allocations" value={form.allocations} onChange={onChange} placeholder="e.g. 200 leads" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="assigned_to">Assigned To</Label>
                          <Popover open={assignedToOpen} onOpenChange={setAssignedToOpen}>
                            <PopoverTrigger asChild>
                              <Button id="assigned_to" variant="outline" className="h-9 w-full justify-between font-normal">
                                {form.assigned_to || 'Select agent/team'}
                                <ChevronsUpDown className="size-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-1" align="start">
                              <Input 
                                value={form.assigned_to} 
                                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))} 
                                placeholder="Search or type..." 
                                className="h-9 mb-1"
                              />
                              <div className="h-px bg-border my-1" />
                              <div className="max-h-48 overflow-auto">
                                {filteredAgents.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                                ) : (
                                  filteredAgents.map((agent) => (
                                    <button
                                      key={agent}
                                      type="button"
                                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                                      onClick={() => {
                                        setForm((f) => ({ ...f, assigned_to: agent }))
                                        setAssignedToOpen(false)
                                      }}
                                    >
                                      <UsersIcon className="size-3 opacity-50" />
                                      {agent}
                                      {form.assigned_to === agent && <Check className="ml-auto size-4" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="status">Status</Label>
                          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                            <PopoverTrigger asChild>
                              <Button id="status" variant="outline" className="h-9 w-full justify-between font-normal">
                                {form.status ? (form.status.charAt(0).toUpperCase() + form.status.slice(1)) : 'Select status'}
                                <ChevronsUpDown className="size-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-1" align="start">
                              <button type="button" className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm" onClick={() => { setForm((f)=>({...f, status: ''})); setStatusOpen(false) }}>Clear</button>
                              <div className="h-px bg-border my-1" />
                              <button type="button" className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm" onClick={() => { setForm((f)=>({...f, status: 'active'})); setStatusOpen(false) }}>Active</button>
                              <button type="button" className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm" onClick={() => { setForm((f)=>({...f, status: 'inactive'})); setStatusOpen(false) }}>Inactive</button>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                          <Label htmlFor="method">Method</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={false} className="h-9 w-full justify-between">
                                {form.method.length ? `${form.method.length} selected` : 'Select methods...'}
                                <ChevronsUpDown className="size-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[360px] max-w-[92vw] p-0" align="start">
                              <div className="p-2 border-b">
                                <Input value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} placeholder="Search methods..." className="h-9" />
                              </div>
                              <div className="max-h-64 overflow-auto py-1">
                                {filteredMethods.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">No method found.</div>
                                ) : (
                                  filteredMethods.map((m) => {
                                    const selected = form.method.includes(m)
                                    return (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                          setForm((f) => ({ ...f, method: selected ? f.method.filter(x => x !== m) : [...f.method, m] }))
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                      >
                                        <span>{m}</span>
                                        <Check className={`ml-auto size-4 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                                      </button>
                                    )
                                  })
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="pt-4 sm:col-span-2 flex gap-2">
                          <Button type="submit" className="flex-1">
                            <Check className="mr-2 size-4" />
                            Save Campaign
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setOpen(false)
                              setEditingId(null)
                              setForm({ campaign_id: "", campaign_name: "", start_date: "", end_date: "", allocations: "", assigned_to: "", status: "", method: [] })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Campaign Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30">
                  <Target className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : metrics.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All campaigns</p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <div className="grid size-10 place-items-center rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                  <Activity className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : metrics.active}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currently running</p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive Campaigns</CardTitle>
                <div className="grid size-10 place-items-center rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30">
                  <AlertCircle className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : metrics.inactive}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Paused or ended</p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
                <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-500/30">
                  <TrendingUp className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : metrics.totalAllocations}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leads allocated</p>
              </CardContent>
            </Card>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm transition-shadow hover:shadow-md duration-200">
            <CardHeader>
              <CardTitle className="text-base font-medium">Campaign Management</CardTitle>
              <CardDescription>View and manage all campaigns</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left border-b bg-muted/50">
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">#</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Campaign ID</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Name</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Start</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">End</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Allocations</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Assigned To</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Status</th>
                    <th className="py-3 pr-4 font-semibold text-sm text-muted-foreground">Method</th>
                    <th className="py-3 pr-0 text-right font-semibold text-sm text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="py-12 text-center text-muted-foreground" colSpan={10}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span>Loading campaigns...</span>
                      </div>
                    </td></tr>
                  ) : items.length === 0 ? (
                    <tr><td className="py-12 text-center text-muted-foreground" colSpan={10}>
                      <div className="flex flex-col items-center gap-2">
                        <Target className="size-12 opacity-20" />
                        <span className="font-medium">No campaigns yet</span>
                        <span className="text-xs">Click "Add Campaign" to create your first campaign</span>
                      </div>
                    </td></tr>
                  ) : (
                    items.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/50 transition-colors duration-150">
                        <td className="py-3 pr-4 font-medium text-muted-foreground">{String( (items.findIndex(x=>x.id===c.id)) + 1 )}</td>
                        <td className="py-3 pr-4 font-medium">{c.campaign_id ?? '-'}</td>
                        <td className="py-3 pr-4 font-medium">{c.campaign_name ?? '-'}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-3 pr-4">{c.allocations ?? '-'}</td>
                        <td className="py-3 pr-4">
                          {c.assigned_to ? (
                            <Badge variant="outline" className="font-normal">
                              <UsersIcon className="size-3 mr-1" />
                              {c.assigned_to}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          {c.status ? (
                            <Badge 
                              variant={c.status.toLowerCase() === 'active' ? 'default' : 'secondary'}
                              className={
                                c.status.toLowerCase() === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30'
                              }
                            >
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {c.method ? (
                            <div className="flex flex-wrap gap-1">
                              {c.method.split(',').slice(0, 2).map((m, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {m.trim()}
                                </Badge>
                              ))}
                              {c.method.split(',').length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{c.method.split(',').length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 pr-0 text-right">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More" className="hover:bg-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content align="end" sideOffset={4} className="min-w-[160px] rounded-md border bg-background p-1 shadow-md z-50">
                                <DropdownMenu.Item className="px-3 py-2 rounded hover:bg-muted cursor-pointer flex items-center gap-2 text-sm" onSelect={() => {
                                  setEditingId(c.id)
                                  setForm({
                                    campaign_id: c.campaign_id != null ? String(c.campaign_id) : "",
                                    campaign_name: c.campaign_name || "",
                                    start_date: formatDateInput(c.start_date),
                                    end_date: formatDateInput(c.end_date),
                                    allocations: c.allocations || "",
                                    assigned_to: c.assigned_to || "",
                                    status: c.status || "",
                                    method: c.method ? c.method.split(',').map(s => s.trim()).filter(Boolean) : [],
                                  })
                                  setOpen(true)
                                }}>
                                  <Pencil className="size-4" />
                                  Edit
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className="px-3 py-2 rounded hover:bg-destructive/10 text-destructive cursor-pointer flex items-center gap-2 text-sm" onSelect={() => onDelete(c.id)}>
                                  <Trash2 className="size-4" />
                                  Delete
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}