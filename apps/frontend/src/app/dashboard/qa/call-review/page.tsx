"use client"

import * as React from "react"
import { QaSidebar } from "../components/QaSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken } from "@/lib/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type CallRow = {
  id: number | string
  username: string | null
  destination: string | null
  start_time: string
  recording_url?: string | null
}

export default function QaCallReviewPage() {
  const [calls, setCalls] = React.useState<CallRow[]>([])
  const [loadingCalls, setLoadingCalls] = React.useState(false)
  const [selectedCallId, setSelectedCallId] = React.useState<number | string | null>(null)
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [userFilter, setUserFilter] = React.useState("all")
  const [userComboOpen, setUserComboOpen] = React.useState(false)
  const [userNames, setUserNames] = React.useState<string[]>([])
  const [overallScore, setOverallScore] = React.useState("")
  const [toneScore, setToneScore] = React.useState("")
  const [complianceScore, setComplianceScore] = React.useState("")
  const [isLead, setIsLead] = React.useState(false)
  const [leadQuality, setLeadQuality] = React.useState("none")
  const [leadTags, setLeadTags] = React.useState("")
  const [comments, setComments] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [loadingReview, setLoadingReview] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [transcript, setTranscript] = React.useState<any | null>(null)
  const [transcriptLoading, setTranscriptLoading] = React.useState(false)
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = React.useState(false)

  const fetchCalls = React.useCallback(async () => {
    setLoadingCalls(true)
    setMessage(null)
    try {
      const qs = new URLSearchParams()
      const toIso = (d: string, endOfDay = false) => {
        try {
          if (!d) return ""
          return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`
        } catch {
          return d
        }
      }
      if (fromDate) qs.set("from", toIso(fromDate))
      if (toDate) qs.set("to", toIso(toDate, true))
      if (userFilter !== "all") qs.set("username", userFilter)
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/qa/leads?${qs.toString()}`, { headers, credentials })
      if (res.ok) {
        const data = await res.json()
        const rows: any[] = data?.items || []
        if (rows.length > 0) {
          setCalls(
            rows.map((r) => ({
              id: r.call_id,
              username: r.username ?? null,
              destination: r.destination ?? null,
              start_time: r.start_time,
              recording_url: r.recording_url ?? null,
            }))
          )
          return
        }
      }

      // Fallback: if there are no QA-marked leads yet, list recent calls so QA can start reviewing
      const qsCalls = new URLSearchParams()
      if (fromDate) qsCalls.set("from", toIso(fromDate))
      if (toDate) qsCalls.set("to", toIso(toDate, true))
      if (userFilter !== "all") qsCalls.set("username", userFilter)
      const resCalls = await fetch(`${API_BASE}/api/calls?${qsCalls.toString()}`, { headers, credentials })
      if (!resCalls.ok) {
        setCalls([])
        return
      }
      const dataCalls = await resCalls.json()
      const rowsCalls: any[] = dataCalls?.items || []
      setCalls(
        rowsCalls.map((r) => ({
          id: r.id,
          username: r.username ?? null,
          destination: r.destination ?? null,
          start_time: r.start_time,
          recording_url: r.recording_url ?? null,
        }))
      )
    } catch {
      setCalls([])
    } finally {
      setLoadingCalls(false)
    }
  }, [fromDate, toDate, userFilter])

  React.useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  // Load list of users for the user filter (QA can filter calls by agent/user)
  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users`, {
          credentials: USE_AUTH_COOKIE ? "include" : "omit",
        })
        if (!res.ok) return
        const data = await res.json()
        const names: string[] = []
        const list: any[] = data?.users || []
        for (const u of list) {
          const name = u?.username || u?.usermail || u?.unique_user_id || u?.name || u?.email
          if (name) names.push(String(name))
        }
        setUserNames(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)))
      } catch {}
    })()
  }, [])

  const resetForm = () => {
    setOverallScore("")
    setToneScore("")
    setComplianceScore("")
    setIsLead(false)
    setLeadQuality("none")
    setLeadTags("")
    setComments("")
    setMessage(null)
    setTranscript(null)
    setTranscriptError(null)
  }

  const loadTranscript = async (callId: number | string) => {
    setTranscriptLoading(true)
    setTranscriptError(null)
    setTranscript(null)
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/transcription/call/${callId}`, { headers, credentials })
      if (!res.ok) {
        if (res.status === 404) {
          setTranscript({ metadata: null, segments: [] })
        } else {
          throw new Error(String(res.status))
        }
      } else {
        const data = (await res.json().catch(() => null)) as any
        setTranscript(data?.data ?? null)
      }
    } catch {
      setTranscriptError("Failed to load transcript")
    } finally {
      setTranscriptLoading(false)
    }
  }

  const loadReview = async (callId: number | string) => {
    setSelectedCallId(callId)
    resetForm()
    setLoadingReview(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const res = await fetch(`${API_BASE}/api/qa/reviews/${callId}`, { headers, credentials })
      if (res.status === 404) {
        // No existing review; keep empty form so QA can create a new one
        setMessage("No existing review found. You can create a new review for this call.")
      } else if (!res.ok) {
        setMessage("Failed to load existing review")
      } else {
        const data = await res.json()
        const r = data?.review
        if (r) {
          setOverallScore(r.overall_score != null ? String(r.overall_score) : "")
          setToneScore(r.tone_score != null ? String(r.tone_score) : "")
          setComplianceScore(r.compliance_score != null ? String(r.compliance_score) : "")
          setIsLead(!!r.is_lead)
          setLeadQuality(r.lead_quality || "none")
          setLeadTags(r.lead_tags_csv || "")
          setComments(r.comments || "")
        }
      }
    } catch {
      setMessage("Failed to load existing review")
    } finally {
      setLoadingReview(false)
    }
    await loadTranscript(callId)
    setReviewOpen(true)
  }

  const saveReview = async () => {
    if (!selectedCallId) return
    setSaving(true)
    setMessage(null)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      const body = {
        overall_score: overallScore ? Number(overallScore) : null,
        tone_score: toneScore ? Number(toneScore) : null,
        compliance_score: complianceScore ? Number(complianceScore) : null,
        is_lead: isLead,
        lead_quality: leadQuality,
        lead_tags_csv: leadTags,
        comments: comments || null,
      }
      const res = await fetch(`${API_BASE}/api/qa/reviews/${selectedCallId}`, {
        method: "POST",
        headers,
        credentials,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setMessage("Failed to save review")
        return
      }
      setMessage("Review saved")
    } catch {
      setMessage("Failed to save review")
    } finally {
      setSaving(false)
    }
  }

  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "-"
    try {
      const d = new Date(iso)
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(d.getUTCDate()).padStart(2, "0")
      const hh = String(d.getUTCHours()).padStart(2, "0")
      const mi = String(d.getUTCMinutes()).padStart(2, "0")
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
    } catch {
      return iso
    }
  }

  const selectedCall = React.useMemo(
    () => calls.find((c) => String(c.id) === String(selectedCallId)) || null,
    [calls, selectedCallId]
  )

  const downloadRecording = async () => {
    if (!selectedCall || !selectedCall.recording_url) return
    try {
      const res = await fetch(selectedCall.recording_url, { credentials: USE_AUTH_COOKIE ? "include" : "omit" })
      if (!res.ok) throw new Error(String(res.status))
      const ct = res.headers.get("content-type")
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const ext = ct && ct.includes("mpeg") ? ".mp3" : ct && ct.includes("wav") ? ".wav" : ".webm"
      a.href = objectUrl
      a.download = `recording_${selectedCall.id}${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setMessage("Failed to download recording")
    }
  }

  const downloadTranscriptText = () => {
    if (!transcript) return
    let text = ""
    if (transcript.metadata?.full_transcript) {
      text = String(transcript.metadata.full_transcript ?? "")
    } else if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
      text = transcript.segments
        .map((s: any, idx: number) => {
          const rawSpeaker = typeof s.speaker === "string" ? s.speaker.toLowerCase() : ""
          let speakerLabel: "Agent" | "Prospect"
          if (rawSpeaker === "agent" || rawSpeaker === "prospect") {
            speakerLabel = rawSpeaker === "agent" ? "Agent" : "Prospect"
          } else {
            speakerLabel = idx % 2 === 0 ? "Agent" : "Prospect"
          }
          const body = typeof s.text === "string" ? s.text : ""
          return `${speakerLabel}: ${body}`.trim()
        })
        .join("\n")
    }
    text = text.trim()
    if (!text) return
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transcript_${selectedCallId ?? "call"}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
    <SidebarProvider>
      <QaSidebar />
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
                  <BreadcrumbLink href="/dashboard/qa">QA</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Call Review</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Call Review Queue</CardTitle>
              <CardDescription>Select a call and apply QA scores, notes, and lead tags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <span>From:</span>
                    <Input
                      type="date"
                      className="h-8 w-[140px]"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <span>To:</span>
                    <Input
                      type="date"
                      className="h-8 w-[140px]"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userComboOpen}
                        className="h-8 w-[200px] justify-between text-xs md:text-sm"
                      >
                        {userFilter === "all" ? "All users" : userFilter}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search user..." className="h-8" />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setUserFilter("all")
                                setUserComboOpen(false)
                              }}
                            >
                              All users
                              <Check className={`ml-auto h-4 w-4 ${userFilter === "all" ? "opacity-100" : "opacity-0"}`} />
                            </CommandItem>
                            {userNames.map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  setUserFilter(name)
                                  setUserComboOpen(false)
                                }}
                              >
                                {name}
                                <Check className={`ml-auto h-4 w-4 ${userFilter === name ? "opacity-100" : "opacity-0"}`} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" variant="outline" onClick={fetchCalls} disabled={loadingCalls}>
                    {loadingCalls ? "Refreshing…" : "Apply"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing calls that already have QA reviews marked as leads. Adjust date range and user as needed.
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Call ID</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">User</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Destination</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Start (UTC)</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {calls.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                            {loadingCalls ? "Loading…" : "No calls found"}
                          </td>
                        </tr>
                      )}
                      {calls.map((c) => (
                        <tr key={String(c.id)} className={selectedCallId === c.id ? "bg-muted/40" : undefined}>
                          <td className="px-3 py-2">{c.id}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate">{c.username || "-"}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate">{c.destination || "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(c.start_time)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant={selectedCallId === c.id ? "default" : "outline"}
                              onClick={() => loadReview(c.id)}
                              disabled={loadingReview && selectedCallId === c.id}
                            >
                              {loadingReview && selectedCallId === c.id ? "Loading…" : "Review"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>

      <Dialog
        open={reviewOpen && selectedCallId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewOpen(false)
            setSelectedCallId(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>QA Review</DialogTitle>
            <DialogDescription>
              Review the call recording and transcript, then answer the QA questions and mark lead details.
            </DialogDescription>
          </DialogHeader>

          {!selectedCallId && (
            <div className="text-xs text-muted-foreground">Select a call from the table to begin reviewing.</div>
          )}
          {selectedCallId && (
            <div className="mt-2 rounded-lg border bg-card max-h-[70vh] overflow-y-auto p-4 space-y-4">
              <div className="text-xs text-muted-foreground">Reviewing call ID {String(selectedCallId)}</div>

              {selectedCall?.recording_url ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium">Recording</div>
                  <audio
                    controls
                    src={selectedCall.recording_url}
                    className="w-full"
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={downloadRecording}
                  >
                    Download recording
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No recording available for this call.</div>
              )}

              <div className="space-y-1">
                <div className="text-xs font-medium">Transcript</div>
                <div className="min-h-[120px] max-h-[260px] overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-xs md:text-sm">
                  {transcriptLoading && <div>Loading transcript…</div>}
                  {!transcriptLoading && transcriptError && (
                    <div className="text-red-500">{transcriptError}</div>
                  )}
                  {!transcriptLoading && !transcriptError && transcript && (
                    <div className="space-y-1">
                      {transcript.metadata?.full_transcript && (
                        <p className="whitespace-pre-wrap break-words">{transcript.metadata.full_transcript}</p>
                      )}
                      {!transcript.metadata?.full_transcript &&
                        Array.isArray(transcript.segments) &&
                        transcript.segments.length > 0 && (
                          <div className="space-y-1">
                            {transcript.segments.map((s: any, idx: number) => {
                              const rawSpeaker = typeof s.speaker === "string" ? s.speaker.toLowerCase() : ""
                              let speaker: "agent" | "prospect"
                              if (rawSpeaker === "agent" || rawSpeaker === "prospect") {
                                speaker = rawSpeaker as "agent" | "prospect"
                              } else {
                                speaker = idx % 2 === 0 ? "agent" : "prospect"
                              }
                              const isAgent = speaker === "agent"
                              return (
                                <div key={idx} className={isAgent ? "text-right" : "text-left"}>
                                  <span className="font-semibold text-[11px] mr-1">
                                    {isAgent ? "Agent" : "Prospect"}:
                                  </span>
                                  <span className="text-[11px] md:text-xs">{s.text}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      {!transcript.metadata?.full_transcript &&
                        (!transcript.segments || transcript.segments.length === 0) && (
                          <div className="text-muted-foreground">No transcript available yet.</div>
                        )}
                    </div>
                  )}
                  {!transcriptLoading && !transcriptError && !transcript && (
                    <div className="text-muted-foreground">No transcript loaded.</div>
                  )}
                </div>
                {!transcriptLoading && !transcriptError && transcript && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={downloadTranscriptText}
                  >
                    Download transcript
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs mb-1">Overall score</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={overallScore}
                    onChange={(e) => setOverallScore(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Tone score</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={toneScore}
                    onChange={(e) => setToneScore(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Compliance score</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={complianceScore}
                    onChange={(e) => setComplianceScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="rounded border border-input"
                    checked={isLead}
                    onChange={(e) => setIsLead(e.target.checked)}
                  />
                  Mark as lead
                </label>
                <Input
                  className="h-8 max-w-[160px]"
                  placeholder="Quality (e.g. hot)"
                  value={leadQuality}
                  onChange={(e) => setLeadQuality(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Lead tags (comma separated)</label>
                <Input
                  placeholder="product-interest, follow-up"
                  value={leadTags}
                  onChange={(e) => setLeadTags(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Comments</label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground min-h-[1.25rem]">
                  {message}
                </div>
                <Button size="sm" onClick={saveReview} disabled={saving}>
                  {saving ? "Saving…" : "Save review"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
