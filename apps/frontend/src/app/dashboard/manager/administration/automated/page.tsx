"use client"

import React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ManagerSidebar } from '../../components/ManagerSidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { API_BASE as API_PREFIX } from '@/lib/api'
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from '@/lib/auth'

type Sheet = { id: number; name: string; size: number; mtime: number; active?: boolean; assignedUserIds?: number[]; campaign_name?: string }

export default function AutomatedAdminPage() {
  const [sheets, setSheets] = React.useState<Sheet[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [assignOpen, setAssignOpen] = React.useState<null | Sheet>(null)
  const [assignCsv, setAssignCsv] = React.useState('')
  const [agents, setAgents] = React.useState<Array<{ id:number; username:string }>>([])
  const [assignIds, setAssignIds] = React.useState<number[]>([])
  const [assignComboOpen, setAssignComboOpen] = React.useState(false)
  const [campaigns, setCampaigns] = React.useState<Array<{id: number; campaign_name: string}>>([])
  const [selectedCampaign, setSelectedCampaign] = React.useState<number | null>(null)

  const buildAuth = React.useCallback(() => {
    const headers: Record<string, string> = {}
    let credentials: RequestCredentials = 'omit'
    if (USE_AUTH_COOKIE) { credentials = 'include'; const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf }
    else { const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}` }
    return { headers, credentials }
  }, [])

  const fetchCampaigns = React.useCallback(async () => {
    try {
      const { headers, credentials } = buildAuth()
      const res = await fetch(`${API_PREFIX}/api/campaigns`, { headers, credentials })
      if (!res.ok) return setCampaigns([])
      const data = await res.json().catch(() => null as any)
      const items = Array.isArray(data?.items) ? data.items : []
      setCampaigns(items.map((x: any) => ({ id: Number(x.id), campaign_name: String(x.campaign_name || '') })))
    } catch { setCampaigns([]) }
  }, [buildAuth])

  const fetchSheets = React.useCallback(async () => {
    try {
      const { headers, credentials } = buildAuth()
      const res = await fetch(`${API_PREFIX}/api/dialer-sheets`, { headers, credentials })
      if (!res.ok) return setSheets([])
      const data = await res.json().catch(() => null as any)
      const items = Array.isArray(data?.items) ? data.items : []

      const sheetsWithCampaigns = items.map((x: any) => {
        // If campaign_name is not in the response, try to find it in the campaigns list
        let campaignName = x.campaign_name || '';
        if (!campaignName && x.campaign_id) {
          const campaign = campaigns.find(c => c.id === x.campaign_id);
          campaignName = campaign?.campaign_name || '';
        }

        return {
          id: Number(x.id),
          name: String(x.name || ''),
          size: Number(x.size || 0),
          mtime: Number(x.mtime || 0),
          active: !!x.active,
          campaign_id: x.campaign_id || null,
          campaign_name: campaignName,
          assignedUserIds: x.assignedUserIds || []
        };
      });

      setSheets(sheetsWithCampaigns);
    } catch { setSheets([]) }
  }, [buildAuth])

  React.useEffect(() => {
    fetchSheets();
    fetchCampaigns();
  }, [fetchSheets, fetchCampaigns])

  React.useEffect(() => {
    ;(async () => {
      try {
        const { headers, credentials } = buildAuth()
        const r = await fetch(`${API_PREFIX}/api/staff/agents`, { headers, credentials })
        if (!r.ok) return
        const data = await r.json().catch(()=>null as any)
        const list: any[] = data?.users || []
        setAgents(list.map(u => ({ id: Number(u.id), username: String(u.username || u.usermail || u.unique_user_id || '') })))
      } catch {}
    })()
  }, [buildAuth])

  const onUpload = async () => {
    if (!file || selectedCampaign === null) return
    const form = new FormData();
    form.append('file', file);
    form.append('campaign_id', selectedCampaign.toString());

    // Get the selected campaign name
    const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
    const campaignName = selectedCampaignData?.campaign_name || '';

    const { headers, credentials } = buildAuth()
    setIsUploading(true)
    try {
      const res = await fetch(`${API_PREFIX}/api/dialer-sheets/upload`, { method: 'POST', headers, credentials, body: form })
      if (res.ok) {
        const data = await res.json();
        // Update the sheets list with the new sheet including campaign name
        setSheets(prev => [{
          ...data,
          campaign_name: campaignName,
          campaign_id: selectedCampaign,
          size: file.size,
          mtime: Date.now(),
          active: false
        }, ...prev]);

        setFile(null);
        setSelectedCampaign(null);
        (document.getElementById('sheet-file') as HTMLInputElement | null)?.value && ((document.getElementById('sheet-file') as HTMLInputElement).value = '');
      }
    } finally { setIsUploading(false) }
  }

  const onActivate = async (id: number) => {
    const { headers, credentials } = buildAuth()
    await fetch(`${API_PREFIX}/api/dialer-sheets/${id}/activate`, { method: 'POST', headers, credentials })
    fetchSheets()
  }

  const onAssign = async () => {
    if (!assignOpen) return
    const ids = (assignIds.length ? assignIds : assignCsv.split(/[\s,]+/).map(s=>Number(s)).filter(n=>Number.isFinite(n)))
    const { headers, credentials } = buildAuth(); headers['Content-Type'] = 'application/json'
    const res = await fetch(`${API_PREFIX}/api/dialer-sheets/${assignOpen.id}/assign`, { method: 'POST', headers, credentials, body: JSON.stringify({ agentIds: ids }) })
    if (res.ok) { setAssignOpen(null); setAssignCsv(''); setAssignIds([]); setAssignComboOpen(false); fetchSheets() }
  }

  const onDelete = async (id: number) => {
    const { headers, credentials } = buildAuth()
    await fetch(`${API_PREFIX}/api/dialer-sheets/${id}`, { method: 'DELETE', headers, credentials })
    fetchSheets()
  }

  const fmtSize = (n: number) => {
    if (!n) return '0B'
    const u = ['B','KB','MB','GB']; let i=0; let v=n; while (v>=1024 && i<u.length-1) { v/=1024; i++ } return `${v.toFixed(1)} ${u[i]}`
  }
  const fmtTime = (ms: number) => { try { return new Date(ms).toLocaleString() } catch { return '' } }

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard/manager/administration">Administration</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>Automated Dialer Sheets</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV/XLSX</CardTitle>
              <CardDescription>Manage lists for automated dialing. Assign sheets to agents and activate the current sheet.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-64">
                    <select
                      id="campaign-select"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedCampaign || ''}
                      onChange={(e) => setSelectedCampaign(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Select a campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.campaign_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 max-w-md">
                    <Input
                      id="sheet-file"
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Button
                      onClick={onUpload}
                      disabled={!file || isUploading || selectedCampaign === null}
                      className="whitespace-nowrap"
                    >
                      {isUploading ? 'Uploading…' : 'Upload File'}
                    </Button>
                  </div>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sheets</CardTitle>
              <CardDescription>Activate a sheet, assign to agents, or delete if not active.</CardDescription>
            </CardHeader>
            <CardContent>
              {sheets.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No sheets uploaded.</div>
              ) : (
                <div className="divide-y rounded border">
                  {sheets.map((s) => (
                    <div key={s.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {s.campaign_name && (
                              <span className="font-medium text-foreground">{s.campaign_name} • </span>
                            )}
                            <div className="font-medium truncate">{s.name}</div>
                            {s.active ? <Badge className="ml-2">Active</Badge> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmtSize(s.size)} • {fmtTime(s.mtime)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant={s.active ? 'default' : 'outline'} onClick={()=>onActivate(s.id)}>{s.active ? 'Active' : 'Activate'}</Button>
                        <Dialog open={assignOpen?.id === s.id} onOpenChange={(o)=>{ setAssignOpen(o ? s : null); setAssignCsv(''); setAssignIds([]); setAssignComboOpen(false) }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">Assign</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign to agents</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">Select agents by username</div>
                              <Popover open={assignComboOpen} onOpenChange={setAssignComboOpen}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={assignComboOpen} className="w-full justify-between">
                                    {assignIds.length ? `${assignIds.length} selected` : 'Select agents...'}
                                    <ChevronsUpDown className="opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search username..." className="h-9" />
                                    <CommandList>
                                      <CommandEmpty>No users found.</CommandEmpty>
                                      <CommandGroup>
                                        {agents.map((u) => {
                                          const selected = assignIds.includes(u.id)
                                          return (
                                            <CommandItem
                                              key={u.id}
                                              value={`${u.username} ${u.id}`}
                                              onSelect={() => {
                                                setAssignIds((prev) => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])
                                              }}
                                            >
                                              {u.username || `User ${u.id}`}
                                              <Check className={cn('ml-auto', selected ? 'opacity-100' : 'opacity-0')} />
                                            </CommandItem>
                                          )
                                        })}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Separator />
                              <div className="text-xs text-muted-foreground">Or enter agent user IDs (comma separated)</div>
                              <Input value={assignCsv} onChange={(e)=>setAssignCsv(e.target.value)} placeholder="e.g., 3,7,12" />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={()=>{ setAssignOpen(null); setAssignCsv('') }}>Cancel</Button>
                              <Button onClick={onAssign}>Save</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this sheet?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone. You cannot delete an active sheet.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={()=>onDelete(s.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

