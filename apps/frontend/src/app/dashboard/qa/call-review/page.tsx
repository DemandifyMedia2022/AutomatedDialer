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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar } from "@/components/ui/calendar"
import { Download, Pause, Play, RefreshCcw, ChevronDownIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
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
  disposition: string | null
  recording_url?: string | null
}

export default function QaCallReviewPage() {
  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [calls, setCalls] = React.useState<CallRow[]>([])
  const [loadingCalls, setLoadingCalls] = React.useState(false)
  const [selectedCallId, setSelectedCallId] = React.useState<number | string | null>(null)
  const [fromDate, setFromDate] = React.useState(() => todayIso)
  const [toDate, setToDate] = React.useState(() => todayIso)
  const [userFilter, setUserFilter] = React.useState("all")
  const [userComboOpen, setUserComboOpen] = React.useState(false)
  const [userNames, setUserNames] = React.useState<string[]>([])
  const [comments, setComments] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [loadingReview, setLoadingReview] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [fQaStatus, setFQaStatus] = React.useState("")
  const [fDqReason1, setFDqReason1] = React.useState("")
  const [fDqReason2, setFDqReason2] = React.useState("")
  const [fDqReason3, setFDqReason3] = React.useState("")
  const [fDqReason4, setFDqReason4] = React.useState("")
  const [fQaComments, setFQaComments] = React.useState("")
  const [fCallRating, setFCallRating] = React.useState("")
  const [fCallNotes, setFCallNotes] = React.useState("")
  const [feedback, setFeedback] = React.useState("")
  const [fCallLinks, setFCallLinks] = React.useState("")
  const [fQaName, setFQaName] = React.useState("")
  const [fAuditDate, setFAuditDate] = React.useState("")
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })
  const [transcript, setTranscript] = React.useState<any | null>(null)
  const [transcriptLoading, setTranscriptLoading] = React.useState(false)
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)

  const fetchCalls = React.useCallback(async () => {
    setLoadingCalls(true)
    setMessage(null)
    try {
      const toIso = (d: string, endOfDay = false) => {
        if (!d) return ""
        return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`
      }
      const qs = new URLSearchParams({ page: "1", pageSize: "20" })
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
              disposition: r.disposition ?? null,
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
          disposition: (r.disposition || "") as string,
          recording_url: r.recording_url ?? null,
        }))
      )
    } catch {
      setCalls([])
    } finally {
      setLoadingCalls(false)
    }
  }, [fromDate, toDate, userFilter])

  const toAbsUrl = (url?: string | null) => {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`
  }

  const guessExt = (ct: string | null) => {
    if (!ct) return ".webm"
    const map: Record<string, string> = {
      "audio/webm": ".webm",
      "audio/ogg": ".ogg",
      "audio/mpeg": ".mp3",
      "audio/wav": ".wav",
      "video/webm": ".webm",
    }
    return map[ct] || ".webm"
  }

  const downloadRecording = React.useCallback(
    async (url: string, id: string | number) => {
      if (!url) return
      try {
        const res = await fetch(toAbsUrl(url), { credentials: USE_AUTH_COOKIE ? "include" : "omit" })
        if (!res.ok) throw new Error(String(res.status))
        const contentType = res.headers.get("content-type")
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = objectUrl
        a.download = `recording_${id}${guessExt(contentType)}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
      } catch {
        // swallow download errors silently
      }
    },
    [toAbsUrl]
  )

  const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
    <div className="flex items-end gap-[1.5px] h-4 w-20">
      {[0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.8, 1].map((height, i) => (
        <span
          key={i}
          style={{
            height: `${height * 100}%`,
            animation: active ? `wave 0.7s ${0.05 * i}s infinite ease-in-out` : "none",
            animationFillMode: active ? "both" : "forwards",
          }}
          className="w-[1.5px] bg-foreground/70 rounded-sm origin-bottom"
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
          100% { transform: scaleY(0.4); }
        }
      `}</style>
    </div>
  )

  const CompactAudio: React.FC<{ src: string; name: string | number }> = ({ src, name }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null)
    const [playing, setPlaying] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [duration, setDuration] = React.useState(0)

    const toggle = () => {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) audio.play()
      else audio.pause()
    }

    React.useEffect(() => {
      const audio = audioRef.current
      if (!audio) return
      const onPlay = () => setPlaying(true)
      const onPause = () => setPlaying(false)
      const onTime = () => {
        setProgress(audio.currentTime)
        setDuration(audio.duration || 0)
      }
      audio.addEventListener("play", onPlay)
      audio.addEventListener("pause", onPause)
      audio.addEventListener("timeupdate", onTime)
      audio.addEventListener("loadedmetadata", onTime)
      return () => {
        audio.removeEventListener("play", onPlay)
        audio.removeEventListener("pause", onPause)
        audio.removeEventListener("timeupdate", onTime)
        audio.removeEventListener("loadedmetadata", onTime)
      }
    }, [])

    return (
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded border border-input p-1.5 text-foreground hover:bg-accent"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" strokeWidth={2.5} /> : <Play className="h-4 w-4 ml-0.5" strokeWidth={2.5} />}
        </button>
        <WaveBars active={playing} />
        <span className="text-xs text-muted-foreground tabular-nums">{Math.floor(progress)}s</span>
        <audio ref={audioRef} src={toAbsUrl(src)} preload="none" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="rounded border border-input p-1.5 text-muted-foreground hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadRecording(src, name)
                }}
                aria-label="Download recording"
              >
                <Download className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  React.useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const setTodayRange = () => {
    const today = new Date()
    const iso = today.toISOString().slice(0, 10)
    setRange({ from: today, to: today })
    setFromDate(iso)
    setToDate(iso)
  }

  const handleRangeSelect = (r: DateRange | undefined) => {
    setRange(r)
    const from = r?.from ? new Date(r.from) : undefined
    const to = r?.to ? new Date(r.to) : r?.from ? new Date(r.from) : undefined
    setFromDate(from ? from.toISOString().slice(0, 10) : "")
    setToDate(to ? to.toISOString().slice(0, 10) : "")
  }

  const filterLabel = fromDate && toDate ? `${fromDate} – ${toDate}` : "All dates"
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
    setComments("")
    setMessage(null)
    setFQaStatus("")
    setFDqReason1("")
    setFDqReason2("")
    setFDqReason3("")
    setFDqReason4("")
    setFQaComments("")
    setFCallRating("")
    setFCallNotes("")
    setFeedback("")
    setFCallLinks("")
    setFQaName("")
    setFAuditDate("")
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
          setComments(r.comments || "")
          setFQaStatus(r.f_qa_status || "")
          setFDqReason1(r.f_dq_reason1 || "")
          setFDqReason2(r.f_dq_reason2 || "")
          setFDqReason3(r.f_dq_reason3 || "")
          setFDqReason4(r.f_dq_reason4 || "")
          setFQaComments(r.f_qa_comments || "")
          setFCallRating(r.f_call_rating != null ? String(r.f_call_rating) : "")
          setFCallNotes(r.f_call_notes || "")
          setFeedback(r.feedback || "")
          setFCallLinks(r.f_call_links || "")
          setFQaName(r.f_qa_name || "")
          setFAuditDate(r.f_audit_date ? String(r.f_audit_date).slice(0, 10) : "")
        }
      }
    } catch {
      setMessage("Failed to load existing review")
    } finally {
      setLoadingReview(false)
    }
    await loadTranscript(callId)
  }

  const openReviewDialog = (callId: number | string) => {
    setReviewDialogOpen(true)
    loadReview(callId)
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
        comments: comments || null,
        f_qa_status: fQaStatus || null,
        f_dq_reason1: fDqReason1 || null,
        f_dq_reason2: fDqReason2 || null,
        f_dq_reason3: fDqReason3 || null,
        f_dq_reason4: fDqReason4 || null,
        f_qa_comments: fQaComments || null,
        f_call_rating: fCallRating ? Number(fCallRating) : null,
        f_call_notes: fCallNotes || null,
        feedback: feedback || null,
        f_call_links: fCallLinks || null,
        f_qa_name: fQaName || null,
        f_audit_date: fAuditDate || null,
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

  const downloadSelectedRecording = async () => {
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
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-between gap-2 w-[220px]">
                        {filterLabel}
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={range}
                        captionLayout="dropdown"
                        onSelect={handleRangeSelect}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Use the picker to adjust the date window. Default shows today&apos;s calls.</span>
                    <Button variant="outline" size="sm" onClick={setTodayRange}>
                      Today
                    </Button>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={fetchCalls} disabled={loadingCalls} className="gap-2">
                  {loadingCalls ? (
                    "Refreshing…"
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4" /> Refresh
                    </>
                  )}
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Call ID</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Destination</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Start (UTC)</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Disposition</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recording</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calls.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                          {loadingCalls ? "Loading…" : "No calls found"}
                        </td>
                      </tr>
                    )}
                    {calls.map((c) => (
                      <tr key={String(c.id)} className={selectedCallId === c.id ? "bg-muted/40" : undefined}>
                        <td className="px-3 py-2">{c.id}</td>
                        <td className="px-3 py-2 max-w-[140px] truncate">{c.destination || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(c.start_time)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{c.disposition || "-"}</td>
                        <td className="px-3 py-2 min-w-[220px]">
                          {c.recording_url ? (
                            <CompactAudio src={c.recording_url} name={c.id} />
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant={selectedCallId === c.id ? "default" : "outline"}
                            onClick={() => openReviewDialog(c.id)}
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

              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                Click <strong>Review</strong> on any call to open the QA form in a dialog and capture detailed audit data.
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          setReviewDialogOpen(open)
          if (!open) {
            setSelectedCallId(null)
            setMessage(null)
            setLoadingReview(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Call Review</DialogTitle>
            <DialogDescription>
              {selectedCallId ? `Reviewing call ID ${selectedCallId}` : "Select a call from the queue to begin."}
            </DialogDescription>
          </DialogHeader>

          {loadingReview ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading review…</div>
          ) : !selectedCallId ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Choose a call from the queue to open the QA review form.
            </div>
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Recording</div>
                  {selectedCall?.recording_url ? (
                    <div className="space-y-1">
                      <audio controls src={selectedCall.recording_url} className="w-full">
                        Your browser does not support the audio element.
                      </audio>
                      <Button variant="outline" size="sm" onClick={downloadSelectedRecording}>
                        Download recording
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No recording available for this call.</div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Transcript</div>
                  <div className="min-h-[120px] max-h-[240px] overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-xs md:text-sm">
                    {transcriptLoading && <div>Loading transcript…</div>}
                    {!transcriptLoading && transcriptError && <div className="text-red-500">{transcriptError}</div>}
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
                                    <span className="font-semibold text-[11px] mr-1">{isAgent ? "Agent" : "Prospect"}:</span>
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
                    <Button variant="outline" size="sm" className="mt-1" onClick={downloadTranscriptText}>
                      Download transcript
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs mb-1">QA status</label>
                  <Input value={fQaStatus} onChange={(e) => setFQaStatus(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 1</label>
                  <Input value={fDqReason1} onChange={(e) => setFDqReason1(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 2</label>
                  <Input value={fDqReason2} onChange={(e) => setFDqReason2(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 3</label>
                  <Input value={fDqReason3} onChange={(e) => setFDqReason3(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 4</label>
                  <Input value={fDqReason4} onChange={(e) => setFDqReason4(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Call rating</label>
                  <Input type="number" min={0} max={10} value={fCallRating} onChange={(e) => setFCallRating(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">QA name</label>
                  <Input value={fQaName} onChange={(e) => setFQaName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Audit date</label>
                  <Input type="date" value={fAuditDate} onChange={(e) => setFAuditDate(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs mb-1">QA comments</label>
                  <textarea
                    className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={fQaComments}
                    onChange={(e) => setFQaComments(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs mb-1">General comments</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs mb-1">Call notes</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={fCallNotes}
                    onChange={(e) => setFCallNotes(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs mb-1">Feedback</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs mb-1">Call links</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={fCallLinks}
                    onChange={(e) => setFCallLinks(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-muted-foreground min-h-[1.25rem]">{message}</div>
                <Button size="sm" onClick={saveReview} disabled={saving}>
                  {saving ? "Saving…" : "Save review"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
    </>
  )
}
