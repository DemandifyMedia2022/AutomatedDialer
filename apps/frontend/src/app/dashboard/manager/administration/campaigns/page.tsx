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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarIcon, Check, ChevronsUpDown, Pencil, Trash2, Plus } from "lucide-react"
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
            <div className="ml-auto">
              <Dialog.Root open={open} onOpenChange={(v) => { if (!v) { setEditingId(null); setForm({ campaign_id: "", campaign_name: "", start_date: "", end_date: "", allocations: "", assigned_to: "", status: "", method: [] }) }; setOpen(v) }}>
                <Dialog.Trigger asChild>
                  <Button>
                    <Plus className="mr-2 size-4" />
                    Add Campaign
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
                    <Dialog.Title className="text-foreground font-semibold mb-2">{editingId ? 'Edit Campaign' : 'Add Campaign'}</Dialog.Title>
                    <form onSubmit={onSubmit} className="">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                          <Input id="assigned_to" name="assigned_to" value={form.assigned_to} onChange={onChange} placeholder="e.g. team-a" />
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
                        <div className="pt-2 sm:col-span-2">
                          <Button type="submit" className="w-full">Save</Button>
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
          {error && (
            <Card className="border-red-300 bg-red-50 text-red-800 p-3 text-sm">{error}</Card>
          )}
          <Card className="p-4 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left border-b bg-muted/10">
                    <th className="py-3 pr-4 font-medium text-muted-foreground">ID</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Campaign ID</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Start</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">End</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Allocations</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Assigned To</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Method</th>
                    <th className="py-3 pr-0 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="py-8 text-center text-muted-foreground" colSpan={10}>Loading…</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td className="py-8 text-center text-muted-foreground" colSpan={10}>No campaigns</td></tr>
                  ) : (
                    items.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/30 even:bg-muted/5">
                        <td className="py-2.5 pr-4">{String( (items.findIndex(x=>x.id===c.id)) + 1 )}</td>
                        <td className="py-2.5 pr-4">{c.campaign_id ?? '-'}</td>
                        <td className="py-2.5 pr-4">{c.campaign_name ?? '-'}</td>
                        <td className="py-2.5 pr-4">{c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-2.5 pr-4">{c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-2.5 pr-4">{c.allocations ?? '-'}</td>
                        <td className="py-2.5 pr-4">{c.assigned_to ?? '-'}</td>
                        <td className="py-2.5 pr-4">
                          {c.status ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                c.status.toLowerCase() === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : c.status.toLowerCase() === 'inactive'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 pr-4">{c.method ?? '-'}</td>
                        <td className="py-2.5 pr-0 text-right">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More">⋯</Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content align="end" sideOffset={4} className="min-w-[160px] rounded-md border bg-background p-1 shadow-md">
                                <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => {
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
                                }}>Edit</DropdownMenu.Item>
                                <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-red-100 text-red-700 cursor-pointer" onSelect={() => onDelete(c.id)}>Delete</DropdownMenu.Item>
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
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}