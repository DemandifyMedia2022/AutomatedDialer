"use client"

import React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ManagerSidebar } from "../../components/ManagerSidebar"
import { SuperAdminSidebar } from "../../../superadmin/components/SuperAdminSidebar"

import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api"




type ExtItem = {
  ext: string
  status: string
  callerIds: string[]
  callerId: string
  allocated: string
  backup?: string
}

export default function Page() {
  const [items, setItems] = React.useState<ExtItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [savingAll, setSavingAll] = React.useState<boolean>(false)
  const [accountId, setAccountId] = React.useState<string | null>(null)
  const [planId, setPlanId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const [lastAccount, setLastAccount] = React.useState<any>(null)
  const [bulkDid, setBulkDid] = React.useState<string>("")
  const [didOptions, setDidOptions] = React.useState<string[]>([])
  const [allowedDids, setAllowedDids] = React.useState<string[]>([])
  const { toast } = useToast()
  const { user, role, loading: authLoading } = useAuth()
  const isSuperAdmin = role === 'superadmin'
  const isManager = role === 'manager'

  const upsertDid = React.useCallback(async (ext: string, did: string) => {
    if (!ext) return
    try {
      await fetch(`${API_BASE}/api/extension-dids/${encodeURIComponent(ext)}/did`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ did }),
      })
    } catch { }
  }, [])

  const updateItem = (idx: number, patch: Partial<ExtItem>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

    // If callerId is being updated, also update allocated to show the change immediately
    if (patch.callerId !== undefined) {
      setItems(prev => prev.map((it, i) => (i === idx ? { ...it, allocated: patch.callerId || it.allocated } : it)))
    }
  }

  const fetchAccountAndExtensions = React.useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError("")
    try {
      // 1) Get account details with cache-busting
      const accRes = await fetch("/api/telxio/account", {
        method: "POST",
        headers: forceRefresh ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : {}
      })
      const acc = await accRes.json()
      if (!accRes.ok) {
        console.error("Account fetch failed:", acc)
        setItems([])
        const msg = acc?.error || acc?.message || `API Error: ${accRes.status}`
        setError(msg)
        // Also keep the detailed error for debugging display
        setLastAccount(acc)
        return // Stop processing
      }

      setLastAccount(acc)
      // Determine PBX account and planId from payload (handle diagnostic wrappers)
      const accData = acc?.data ?? acc?.get?.body?.data ?? acc?.post?.body?.data ?? acc?.body?.data ?? null
      let pbxAccountId: string | null = accData?.account_id ?? acc?.account_id ?? null
      let planKey = accData?.plan ? Object.keys(accData.plan)[0] : null



      setAccountId(pbxAccountId)
      setPlanId(planKey)
      if (!pbxAccountId || !planKey) {
        setItems([])
        setError('Account details did not include account_id or plan')
        // Do not return yet; we may still try extensions fallback
      }

      // 2) Use extensions directly from account details
      let extArray: string[] = (planKey && Array.isArray(accData?.plan?.[planKey]?.extensions))
        ? (accData.plan[planKey].extensions as any[]).map((e: any) => String(e)).filter(Boolean)
        : []
      // Normalize DID numbers for caller ID options
      let didNumbers: string[] = []
      const rawNumbers = planKey ? accData?.plan?.[planKey]?.numbers : null
      if (Array.isArray(rawNumbers)) {
        for (const n of rawNumbers) {
          if (n == null) continue
          if (typeof n === 'string' || typeof n === 'number') {
            didNumbers.push(String(n))
          } else if (typeof n === 'object') {
            const v = (n as any).number ?? (n as any).did ?? (Array.isArray(n) ? n[0] : null)
            if (v != null) didNumbers.push(String(v))
          }
        }
      }

      if (!extArray.length) {
        setError('No extensions found for this account/plan')
      }

      // 3) Filter extensions if Manager
      let filteredExts = extArray
      let filteringError = ""

      console.log("[DID Page] Filtering for role:", role, { isManager, isSuperAdmin })

      if (isManager) {
        try {
          console.log("[DID Page] Fetching organization extensions from backend...")
          const mappingRes = await fetch(`${API_BASE}/api/extension-dids/dids`, { credentials: 'include' })
          const mappingData = await mappingRes.json()
          if (mappingRes.ok && mappingData.success) {
            const items = (mappingData.items || [])
            const allowedExts = new Set(items.map((i: any) => String(i.extensionId)))
            console.log("[DID Page] Allowed extensions for manager:", Array.from(allowedExts))
            filteredExts = extArray.filter(e => allowedExts.has(e))

            // NEW: Capture the pool of permitted Caller IDs
            if (Array.isArray(mappingData.allowedDids) && mappingData.allowedDids.length > 0) {
              const permitted = mappingData.allowedDids.map(String)
              setAllowedDids(permitted)
              // Intersect account numbers with permitted ones for the bulk dropdown
              const permittedSet = new Set(permitted)
              setDidOptions(didNumbers.filter(n => permittedSet.has(n)))
            } else {
              setDidOptions(didNumbers)
            }
          } else {
            console.error("[DID Page] Mapping fetch failed:", mappingData)
            filteredExts = []
            filteringError = mappingData?.message || "Could not verify allocated extensions."
          }
        } catch (e) {
          console.error("[DID Page] Failed to fetch organization mappings:", e)
          filteredExts = []
          filteringError = "Network error verifying your allocated extensions."
        }
      } else if (!isSuperAdmin && role !== "") {
        // If not superadmin and not manager (and role loaded), hide everything for safety
        console.warn("[DID Page] Unauthorized role attempted view:", role)
        filteredExts = []
        filteringError = "Unauthorized: Access restricted to Managers and Superadmins."
      }

      const targetExts = filteredExts.slice(0, 11) // display up to 11 as requested
      if ((isManager || !isSuperAdmin) && filteringError) {
        setError(filteringError)
      } else if (filteredExts.length === 0 && extArray.length > 0 && isManager) {
        setError("No extensions allocated to your organization found.")
      }

      // 4) Fetch each extension details with cache-busting
      const details = await Promise.all(
        targetExts.map(async (ext: string) => {
          try {
            const res = await fetch(`/api/telxio/extensions/${ext}/details`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(forceRefresh ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : {})
              },
              body: JSON.stringify({ accountId: pbxAccountId, planId: planKey }),
            })
            const data = await res.json().catch(() => ({}))
            const extData = data?.data?.extension || {}
            let callerId = extData?.callerid || data?.data?.callerid || data?.callerid || ""
            let callerIds: string[] = Array.isArray(data?.data?.callerids)
              ? data.data.callerids
              : Array.isArray(data?.callerids)
                ? data.callerids
                : []

            // Use only the current portal data for caller IDs
            callerIds = Array.from(new Set(callerIds || [])).filter(Boolean)

            // If no callerIds from portal, use account numbers as fallback
            if (callerIds.length === 0 && didNumbers.length > 0) {
              callerIds = didNumbers
            }

            const allocated = callerId || (callerIds[0] || "")
            // Initialize editable field to currently allocated DID
            return { ext, status: res.ok ? "OK" : "ERROR", callerId: allocated, callerIds, allocated } as ExtItem
          } catch {
            return { ext, status: "ERROR", callerId: "", callerIds: [], allocated: "" } as ExtItem
          }
        })
      )
      setItems(details)
      // Seed DB with current allocated DIDs for visible extensions
      try { await Promise.all(details.map(d => upsertDid(d.ext, d.allocated || ''))) } catch { }
    } finally {
      setLoading(false)
    }
  }, [isManager, isSuperAdmin, API_BASE, upsertDid])

  React.useEffect(() => {
    if (authLoading) return
    if (!role) return
    fetchAccountAndExtensions()
  }, [authLoading, role, fetchAccountAndExtensions])

  const onSave = async (idx: number) => {
    const it = items[idx]
    const previousAllocated = it.allocated
    const newCallerId = it.callerId

    // Immediately update UI to show the change
    updateItem(idx, { allocated: newCallerId, status: "UPDATING" })

    try {
      const res = await fetch(`/api/telxio/extensions/${it.ext}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, planId, data: { callerid: newCallerId } }),
      })

      const ok = res.ok
      let verifiedCallerId = newCallerId
      try {
        const payload = await res.json()
        verifiedCallerId = payload?.callerid ?? payload?.verify?.data?.extension?.callerid ?? newCallerId

        // Log any API issues for debugging
        if (payload?.meta?.softBypass) {
          console.warn('DID update used soft bypass:', payload.meta)
        }
      } catch (e) {
        console.error('Failed to parse DID update response:', e)
      }

      const finalAlloc = ok ? (verifiedCallerId || newCallerId) : previousAllocated
      updateItem(idx, { status: ok ? "OK" : "ERROR", allocated: finalAlloc, backup: ok ? previousAllocated : it.backup })

      if (ok) {
        // Persist mapping in DB
        void upsertDid(it.ext, finalAlloc || '')
        // Force refresh from PBX to ensure UI mirrors portal state
        void fetchAccountAndExtensions(true)
        toast({
          title: "DID updated",
          description: `Extension ${it.ext} now uses ${finalAlloc}`,
        })
      } else {
        toast({
          title: "Update failed",
          description: `Extension ${it.ext} could not be updated. Check server logs for details.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('DID update error:', error)
      updateItem(idx, { status: "ERROR", allocated: previousAllocated })
      toast({
        title: "Update failed",
        description: `Network error updating extension ${it.ext}`,
        variant: "destructive",
      })
    }
  }

  const onSaveAll = async () => {
    setSavingAll(true)
    try {
      // Attempt bulk API first for consistency with PBX portal
      const payload = {
        accountId,
        planId,
        items: items.map(it => ({ ext: it.ext, data: { callerid: it.callerId } })),
      }
      const res = await fetch(`/api/telxio/extensions/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        // Fallback to per-item updates
        await Promise.all(items.map((_it, idx) => onSave(idx)))
        void fetchAccountAndExtensions()
        toast({
          title: "Bulk update fallback",
          description: "Primary Telxio request failed; ran individual updates instead.",
          variant: "destructive",
        })
        return
      }
      const data = await res.json().catch(() => ({} as any))
      const results = data?.results || {}
      let nextItems: ExtItem[] = []
      setItems(prev => {
        nextItems = prev.map((it) => {
          const r = results[it.ext]
          if (!r) return it
          const ok = r?.ok !== false
          const verified = r?.callerid ?? r?.verify?.data?.extension?.callerid ?? it.callerId
          return {
            ...it,
            status: ok ? "OK" : "ERROR",
            allocated: ok ? (verified || it.callerId) : it.allocated,
            backup: ok ? it.allocated : it.backup,
          }
        })
        return nextItems
      })
      // Persist mappings for all
      try { await Promise.all(nextItems.map(it => upsertDid(it.ext, it.allocated || it.callerId || ''))) } catch { }
      // Final force refresh after bulk to mirror portal
      void fetchAccountAndExtensions(true)
      const failed = Object.values(results).some((r: any) => r?.ok === false)
      toast({
        title: failed ? "Some DIDs failed" : "DIDs updated",
        description: failed ? "Check cards marked ERROR for details." : "All visible extensions refreshed.",
        variant: failed ? "destructive" : "default",
      })
    } finally {
      setSavingAll(false)
    }
  }

  const badge = (label: string) => {
    const colorClass = label === "UPDATING"
      ? "inline-flex items-center rounded-full border bg-blue-200/60 px-2 py-0.5 text-[11px] text-blue-700"
      : label === "ERROR"
        ? "inline-flex items-center rounded-full border bg-red-200/60 px-2 py-0.5 text-[11px] text-red-700"
        : "inline-flex items-center rounded-full border bg-slate-200/60 px-2 py-0.5 text-[11px] text-slate-700"

    return <span className={colorClass}>{label}</span>
  }

  return (
    <SidebarProvider>
      {isSuperAdmin ? <SuperAdminSidebar /> : <ManagerSidebar />}
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
                  <BreadcrumbLink href={isSuperAdmin ? "/dashboard/superadmin" : "/dashboard/manager"}>{isSuperAdmin ? "Super Admin" : "Manager"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={isSuperAdmin ? "/dashboard/superadmin/system" : "/dashboard/manager/call-management"}>{isSuperAdmin ? "System" : "Call Management"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Change DID's</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Select value={bulkDid} onValueChange={setBulkDid} disabled={didOptions.length === 0}>
                <SelectTrigger className="h-9 w-[220px]">
                  <SelectValue placeholder="Select DID" />
                </SelectTrigger>
                <SelectContent>
                  {(allowedDids.length > 0
                    ? didOptions.filter(d => allowedDids.includes(String(d)))
                    : didOptions
                  ).map(did => (
                    <SelectItem key={did} value={did}>{did}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                disabled={!bulkDid || items.length === 0}
                onClick={() => setItems(prev => prev.map(it => ({ ...it, callerId: bulkDid })))}
              >
                Apply to All
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-l font-medium">Manage Extensions</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fetchAccountAndExtensions()} disabled={loading}>
                  {loading ? "Loading..." : "Reload"}
                </Button>
                <Button onClick={onSaveAll} disabled={savingAll || items.length === 0}>
                  {savingAll ? "Updating..." : "Update All"}
                </Button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {error && (
                <div className="col-span-full text-sm text-red-600">{error}</div>
              )}
              {!loading && (error || items.length === 0) && (
                <div className="col-span-full text-xs text-muted-foreground space-y-2">
                  <div>Derived accountId: {accountId || "-"}, planId: {planId || "-"}</div>
                  {true && (
                    <div className="mt-2">
                      <div className="text-[10px] font-mono text-xs text-muted-foreground mb-1">Debug Response:</div>
                      <pre className="max-h-64 overflow-auto rounded border bg-muted p-2 text-[10px] whitespace-pre-wrap break-all">
                        {JSON.stringify(lastAccount, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {items.map((it, idx) => (
                <Card key={`${it.ext}-${it.allocated}-${loading}`} className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-blue-600 text-base font-medium hover:underline cursor-default">
                        {it.ext}
                      </CardTitle>
                      {badge(it.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Allocated DID</div>
                        <div className="text-[12px]">{it.allocated || "-"}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Backup (previous)</div>
                        <div className="text-[12px]">{it.backup || "-"}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Caller ID</div>
                        <Select
                          value={it.callerId}
                          onValueChange={(v) => updateItem(idx, { callerId: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Caller ID" />
                          </SelectTrigger>
                          <SelectContent>
                            {(allowedDids.length > 0
                              ? it.callerIds.filter(cid => allowedDids.includes(String(cid)))
                              : it.callerIds
                            ).map((cid) => (
                              <SelectItem key={cid} value={cid}>{cid}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                      </div>

                      <div className="pt-1">
                        <Button variant="outline" className="w-full" onClick={() => onSave(idx)} disabled={!it.callerId} style={{ color: "blue", borderColor: "blue" }}>Update</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
