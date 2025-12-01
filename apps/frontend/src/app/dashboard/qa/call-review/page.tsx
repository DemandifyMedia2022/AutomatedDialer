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
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CallRow = {
  id: number | string
  unique_id?: string | null
  username: string | null
  destination: string | null
  start_time: string
  recording_url?: string | null
  remarks?: string | null
  campaign_name?: string | null
  reviewed?: boolean
  reviewer_user_id?: number | null
  created_at?: string | null
  has_dm_qa_fields?: boolean
}

export default function QaCallReviewPage() {
  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [calls, setCalls] = React.useState<any[]>([])
  const [selectedCallId, setSelectedCallId] = React.useState<number | string | null>(null)
  const [loadingCalls, setLoadingCalls] = React.useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [loadingReview, setLoadingReview] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [campaigns, setCampaigns] = React.useState<string[]>([])
  const [selectedCampaign, setSelectedCampaign] = React.useState("all")
  const [fromDate, setFromDate] = React.useState(() => todayIso)
  const [toDate, setToDate] = React.useState(() => todayIso)
  const [userFilter, setUserFilter] = React.useState("all")
  const [userComboOpen, setUserComboOpen] = React.useState(false)
  const [userNames, setUserNames] = React.useState<string[]>([])
  const [comments, setComments] = React.useState("")
  const [fQaStatus, setFQaStatus] = React.useState("")
  const [fDqReason1, setFDqReason1] = React.useState("")
  const [fDqReason2, setFDqReason2] = React.useState("")
  const [fDqReason3, setFDqReason3] = React.useState("")
  const [fDqReason4, setFDqReason4] = React.useState("")
  const [fQaComments, setFQaComments] = React.useState("")
  const [fCallRating, setFCallRating] = React.useState("")
  const [fCallNotes, setFCallNotes] = React.useState("")
  const [fCallLinks, setFCallLinks] = React.useState("")
  const [fQaName, setFQaName] = React.useState("")
  const [fAuditDate, setFAuditDate] = React.useState("")
  const [fEmailStatus, setFEmailStatus] = React.useState("")
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })
  const [transcript, setTranscript] = React.useState<any | null>(null)
  const [transcriptLoading, setTranscriptLoading] = React.useState(false)
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)
  
  // DM Form fields
  const [dmFormData, setDmFormData] = React.useState<any | null>(null)
  const [dmFormLoading, setDmFormLoading] = React.useState(false)

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
      console.log('QA leads response status:', res.status)
      // Always use fallback to show all calls with audit status
      // This ensures we see both audited and not audited calls

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
      console.log('Fallback calls response:', rowsCalls.length, 'items')
      
      // For fallback calls, check audit status for each call
      const callsWithAuditStatus = []
      for (const r of rowsCalls) {
        console.log('Processing call:', r.id, 'remarks:', r.remarks, 'unique_id:', r.unique_id)
        const uniqueId = r.unique_id
        let has_dm_qa_fields = false
        
        if (uniqueId) {
          try {
            const auditStatus = await checkAuditStatus(uniqueId)
            has_dm_qa_fields = auditStatus?.isAudited || false
          } catch (error) {
            console.error('Error checking audit status for call:', r.id, error)
          }
        }
        
        callsWithAuditStatus.push({
          id: r.id,
          unique_id: r.unique_id ?? null,
          username: r.username ?? null,
          destination: r.destination ?? null,
          start_time: r.start_time,
          recording_url: r.recording_url ?? null,
          remarks: r.remarks ?? null,
          campaign_name: r.campaign_name ?? null,
          reviewed: false, // Fallback calls are not yet reviewed
          reviewer_user_id: null,
          created_at: null,
          has_dm_qa_fields, // Check actual audit status
        })
      }
      
      console.log('All calls before filtering:', callsWithAuditStatus.map(c => ({ id: c.id, remarks: c.remarks, campaign: c.campaign_name, audited: c.has_dm_qa_fields })))
      const filteredCalls = callsWithAuditStatus.filter(call => {
        const remarks = call.remarks?.trim().toLowerCase()
        const isLead = remarks === "lead"
        const matchesCampaign = selectedCampaign === "all" || call.campaign_name === selectedCampaign
        
        // If a specific campaign is selected, show only not audited leads
        const showNotAuditedOnly = selectedCampaign !== "all"
        const isNotAudited = !call.has_dm_qa_fields
        
        return isLead && matchesCampaign && (showNotAuditedOnly ? isNotAudited : true)
      })
      console.log('Final filtered calls:', filteredCalls.length, 'items')
      setCalls(filteredCalls)
    } catch {
      setCalls([])
    } finally {
      setLoadingCalls(false)
    }
  }, [fromDate, toDate, userFilter, selectedCampaign])

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
  // Load list of campaigns for the campaign filter
  React.useEffect(() => {
    ;(async () => {
      try {
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = "omit"
        if (USE_AUTH_COOKIE) {
          credentials = "include"
        } else {
          const t = getToken()
          if (t) headers["Authorization"] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/campaigns`, {
          headers,
          credentials,
        })
        if (!res.ok) return
        const data = await res.json()
        const campaignList: string[] = []
        const list: any[] = data?.items || []
        for (const c of list) {
          const name = c?.campaign_name
          if (name) campaignList.push(String(name))
        }
        setCampaigns(Array.from(new Set(campaignList)).sort((a, b) => a.localeCompare(b)))
      } catch {}
    })()
  }, [])

  // Load list of users for the user filter (QA can filter calls by agent/user)
  React.useEffect(() => {
    ;(async () => {
      try {
        const headers: Record<string, string> = {}
        let credentials: RequestCredentials = "omit"
        if (USE_AUTH_COOKIE) {
          credentials = "include"
          const csrfToken = getCsrfTokenFromCookies()
          if (csrfToken) {
            headers["X-CSRF-Token"] = csrfToken
          }
        } else {
          const t = getToken()
          if (t) headers["Authorization"] = `Bearer ${t}`
        }
        const res = await fetch(`${API_BASE}/api/users`, {
          headers,
          credentials,
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
    setFCallLinks("")
    // Don't reset QA Name - keep the logged user's name
    setFAuditDate("")
    setFEmailStatus("")
    setTranscript(null)
    setTranscriptError(null)
    setDmFormData(null)
    setIsEditMode(false)
    // Re-populate QA Name if it was cleared
    fetchAndSetQaName()
  }

  // Function to fetch logged username and populate QA Name field
  const fetchAndSetQaName = React.useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers, credentials })
      if (res.ok) {
        const data = await res.json().catch(() => null) as any
        const username = data?.user?.username
        if (username && username.trim()) {
          setFQaName(username.trim())
          console.log('QA Name auto-populated:', username)
        }
      }
    } catch (error) {
      console.error('Failed to fetch logged username for QA Name:', error)
    }
  }, [])

  // Auto-populate QA Name when component mounts
  React.useEffect(() => {
    fetchAndSetQaName()
  }, [fetchAndSetQaName])

  const loadDmFormData = async (callId: number | string) => {
    setDmFormLoading(true)
    setDmFormData(null)
    
    // Find the call data to get the unique_id
    const callData = calls.find(c => String(c.id) === String(callId))
    const uniqueId = callData?.unique_id
    
    if (!uniqueId) {
      console.log('No unique_id found for call:', callId)
      setDmFormData(null)
      setDmFormLoading(false)
      return
    }
    
    console.log('Loading DM Form Data for unique_id:', uniqueId)
    console.log('API URL:', `${API_BASE}/api/dm-form/unique/${uniqueId}`)
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      
      const res = await fetch(`${API_BASE}/api/dm-form/unique/${uniqueId}`, { headers, credentials })
      console.log('API Response status:', res.status)
      
      if (!res.ok) {
        if (res.status === 404) {
          console.log('No DM form data found for this unique_id')
          setDmFormData(null)
        } else {
          const errorText = await res.text().catch(() => 'Unknown error')
          console.error('API Error:', errorText)
          throw new Error(`HTTP ${res.status}: ${errorText}`)
        }
      } else {
        const data = (await res.json().catch(() => null)) as any;
        console.log('DM Form found:', data?.success)
        if (data?.success && data?.data) {
          console.log('Form data keys:', Object.keys(data.data))
          setDmFormData(data.data);
        } else {
          setDmFormData(null)
        }
      }
    } catch (error) {
      console.error('Error loading DM form data:', error)
      setDmFormData(null)
    } finally {
      setDmFormLoading(false)
    }
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
        const csrfToken = getCsrfTokenFromCookies()
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken
        }
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      
      // Find the call data to get the unique_id
      const callData = calls.find(c => String(c.id) === String(callId))
      const uniqueId = callData?.unique_id
      
      let hasAuditData = false
      
      // Check audit status using the new audit endpoint
      if (uniqueId) {
        try {
          const auditStatus = await checkAuditStatus(uniqueId)
          if (auditStatus?.success && auditStatus?.isAudited && auditStatus?.auditData) {
            hasAuditData = true
            console.log('Loading audit data:', auditStatus.auditData)
            
            const auditData = auditStatus.auditData
            // Set all the audit fields
            setFQaStatus(auditData.qa_status || "")
            setFEmailStatus(auditData.email_status || "")
            setFDqReason1(auditData.dq_reason1 || "")
            setFDqReason2(auditData.dq_reason2 || "")
            setFDqReason3(auditData.dq_reason3 || "")
            setFDqReason4(auditData.dq_reason4 || "")
            setFCallRating(auditData.call_rating || "")
            setFQaName(auditData.qa_name || "")
            setFAuditDate(auditData.audit_date ? String(auditData.audit_date).slice(0, 10) : "")
            setFQaComments(auditData.qa_comments || "")
            setFCallNotes(auditData.call_notes || "")
            setFCallLinks(auditData.call_links || "")
            
            // If QA Name is empty in existing audit, set it to current logged user
            if (!auditData.qa_name || auditData.qa_name.trim() === "") {
              await fetchAndSetQaName()
            }
          }
        } catch (error) {
          console.error('Error checking audit status:', error)
        }
      }
      
      // Also check traditional QA review for backward compatibility
      const res = await fetch(`${API_BASE}/api/qa/reviews/${callId}`, { headers, credentials })
      
      if (res.ok) {
        const data = await res.json()
        const r = data?.review
        if (r && !hasAuditData) {
          // Only load QA review if we don't already have audit data
          console.log('Loading QA review data:', r)
          setComments(r.comments || "")
        }
      }
      
      // Set edit mode based on whether we have audit data
      setIsEditMode(hasAuditData)
      
      if (hasAuditData) {
        setMessage("Existing audit data found. You can edit the audit.")
      } else {
        setMessage("No existing audit found. You can create a new audit for this call.")
        // Ensure QA Name is set for new audits
        await fetchAndSetQaName()
      }
      
    } catch {
      setMessage("Failed to load existing audit")
      setIsEditMode(false)
      // Still try to set QA Name even on error
      await fetchAndSetQaName()
    } finally {
      setLoadingReview(false)
    }
    await loadTranscript(callId)
    await loadDmFormData(callId)
  }

  const openReviewDialog = (callId: number | string) => {
    setReviewDialogOpen(true)
    loadReview(callId)
  }

  const checkAuditStatus = async (uniqueId: string) => {
    try {
      const headers: Record<string, string> = {}
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
        const csrfToken = getCsrfTokenFromCookies()
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken
        }
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      
      const res = await fetch(`${API_BASE}/api/qa/audit/${uniqueId}`, { headers, credentials })
      if (res.ok) {
        const data = await res.json()
        return data
      }
      return null
    } catch (error) {
      console.error('Error checking audit status:', error)
      return null
    }
  }

  const saveReview = async () => {
    if (!selectedCallId) return
    setSaving(true)
    setMessage(null)
    
    // Ensure QA Name is set before saving
    if (!fQaName || fQaName.trim() === "") {
      await fetchAndSetQaName()
    }
    
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      let credentials: RequestCredentials = "omit"
      if (USE_AUTH_COOKIE) {
        credentials = "include"
        const csrfToken = getCsrfTokenFromCookies()
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken
        }
      } else {
        const t = getToken()
        if (t) headers["Authorization"] = `Bearer ${t}`
      }
      
      // Find the call data to get the unique_id
      const callData = calls.find(c => String(c.id) === String(selectedCallId))
      const uniqueId = callData?.unique_id
      
      if (!uniqueId) {
        setMessage("Cannot save audit: No unique ID found for this call")
        return
      }
      
      // Save audit data using the new audit endpoint
      const auditBody = {
        qa_status: fQaStatus || null,
        email_status: fEmailStatus || null,
        dq_reason1: fDqReason1 || null,
        dq_reason2: fDqReason2 || null,
        dq_reason3: fDqReason3 || null,
        dq_reason4: fDqReason4 || null,
        call_rating: fCallRating || null,
        qa_name: fQaName || null,
        audit_date: fAuditDate || null,
        qa_comments: fQaComments || null,
        call_notes: fCallNotes || null,
        call_links: fCallLinks || null,
      }
      
      const auditRes = await fetch(`${API_BASE}/api/qa/audit/${uniqueId}`, {
        method: "POST",
        headers,
        credentials,
        body: JSON.stringify(auditBody),
      })
      
      if (!auditRes.ok) {
        const errorData = await auditRes.json().catch(() => ({}))
        setMessage(errorData.message || "Failed to save audit data")
        return
      }
      
      // Also save the traditional QA review for backward compatibility
      const qaBody = {
        comments: comments || null,
        overall_score: null,
        tone_score: null,
        compliance_score: null,
        is_lead: true,
        lead_quality: "qualified",
        lead_tags_csv: "",
        disposition_override: null,
        issues_json: null,
        agent_user_id: null,
      }
      
      const qaRes = await fetch(`${API_BASE}/api/qa/reviews/${selectedCallId}`, {
        method: "POST",
        headers,
        credentials,
        body: JSON.stringify(qaBody),
      })
      
      if (!qaRes.ok) {
        console.warn("Failed to save QA review, but audit data was saved")
      }
      
      setMessage(isEditMode ? "Audit updated successfully" : "Audit created successfully")
      
      // Refresh the calls list to update audit status
      await fetchCalls()
      
      // If a specific campaign is selected and we just completed an audit, auto-advance to next not audited lead
      if (selectedCampaign !== "all" && !isEditMode) {
        setTimeout(() => {
          const nextNotAuditedCall = calls.find(call => !call.has_dm_qa_fields && call.id !== selectedCallId)
          if (nextNotAuditedCall) {
            console.log('Auto-advancing to next lead:', nextNotAuditedCall.id)
            openReviewDialog(nextNotAuditedCall.id)
          } else {
            console.log('No more not audited leads in this campaign')
            setMessage("All leads in this campaign have been audited!")
          }
        }, 1500) // Wait 1.5 seconds to show success message
      }
      
    } catch {
      setMessage("Failed to save audit")
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
              <CardDescription>
                {selectedCampaign === "all" 
                  ? "Select a call and apply QA scores, notes, and lead tags." 
                  : `Auditing queue for ${selectedCampaign}. Only not audited leads are shown for one-by-one processing.`}
              </CardDescription>
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

              {/* Campaign Filter */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Campaign:</label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign} value={campaign}>
                          {campaign}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Queue Status for Campaign-specific auditing */}
              {selectedCampaign !== "all" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900">Audit Queue Status</h3>
                      <p className="text-sm text-blue-700">
                        Campaign: <strong>{selectedCampaign}</strong> | 
                        Not Audited Leads: <strong>{calls.filter(c => !c.has_dm_qa_fields).length}</strong> | 
                        Total Leads: <strong>{calls.length}</strong>
                      </p>
                    </div>
                    {calls.filter(c => !c.has_dm_qa_fields).length > 0 && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const firstNotAudited = calls.find(c => !c.has_dm_qa_fields)
                          if (firstNotAudited) {
                            openReviewDialog(firstNotAudited.id)
                          }
                        }}
                      >
                        Start Auditing
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Call ID</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Destination</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Campaign</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Start (UTC)</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Remarks</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Audit Status</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recording</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calls.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                          {loadingCalls ? "Loading…" : "No calls found"}
                        </td>
                      </tr>
                    )}
                    {calls.map((c) => (
                      <tr key={String(c.id)} className={selectedCallId === c.id ? "bg-muted/40" : undefined}>
                        <td className="px-3 py-2">{c.id}</td>
                        <td className="px-3 py-2 max-w-[140px] truncate">{c.destination || "-"}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate">{c.campaign_name || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(c.start_time)}</td>
                        <td className="px-3 py-2 max-w-[150px] truncate">{c.remarks || "-"}</td>
                        <td className="px-3 py-2">
                          {c.has_dm_qa_fields ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Audited
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Not Audited
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          {c.recording_url ? (
                            <CompactAudio src={c.recording_url} name={c.id} />
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {(c.reviewed || c.has_dm_qa_fields) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 font-medium">Lead Reviewed</span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openReviewDialog(c.id)}
                                disabled={loadingReview && selectedCallId === c.id}
                              >
                                {loadingReview && selectedCallId === c.id ? "Loading…" : "Edit QA"}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant={selectedCallId === c.id ? "default" : "outline"}
                              onClick={() => openReviewDialog(c.id)}
                              disabled={loadingReview && selectedCallId === c.id}
                            >
                              {loadingReview && selectedCallId === c.id ? "Loading…" : "Review Lead"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                {selectedCampaign === "all" 
                  ? "Click <strong>Review Lead</strong> to create a new audit. Each lead can only be audited once. Use <strong>Edit QA</strong> to modify existing audits."
                  : `Campaign audit mode: Only not audited leads from ${selectedCampaign} are shown. Complete audits one by one - the system will automatically advance to the next lead.`}
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
            setIsEditMode(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Audit" : "New Audit"}</DialogTitle>
            <DialogDescription>
              {selectedCallId ? (isEditMode ? `Editing existing audit for call ID ${selectedCallId}` : `Creating new audit for call ID ${selectedCallId}. Each lead can only be audited once.`) : "Select a call from the queue to begin."}
            </DialogDescription>
          </DialogHeader>

          {loadingReview ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading audit…</div>
          ) : !selectedCallId ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Choose a call from the queue to open the audit form.
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
                  <Select value={fQaStatus} onValueChange={setFQaStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select QA status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Disqualified">Disqualified</SelectItem>
                      <SelectItem value="Client - Rejects">Client - Rejects</SelectItem>
                      <SelectItem value="Qualified for Campaign">Qualified for Campaign</SelectItem>
                      <SelectItem value="Approval">Approval</SelectItem>
                      <SelectItem value="Under Review for Email/ Phone number">Under Review for Email/ Phone number</SelectItem>
                      <SelectItem value="Under Review for call discrepancy">Under Review for call discrepancy</SelectItem>
                      <SelectItem value="Approval Denied">Approval Denied</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs mb-1">Email status</label>
                  <Select value={fEmailStatus} onValueChange={setFEmailStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Email Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sent for Verification">Sent for Verification</SelectItem>
                      <SelectItem value="Valid">Valid</SelectItem>
                      <SelectItem value="Catch- All">Catch- All</SelectItem>
                      <SelectItem value="Invalid">Invalid</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                      <SelectItem value="Do not Mail">Do not Mail</SelectItem>
                      <SelectItem value="Abuse">Abuse</SelectItem>
                      <SelectItem value="Appended">Appended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 1</label>
                  <Select value={fDqReason1} onValueChange={setFDqReason1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select DQ reason 1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client Suppression">Client Suppression</SelectItem>
                      <SelectItem value="Communication skills">Communication skills</SelectItem>
                      <SelectItem value="Consent Missing">Consent Missing</SelectItem>
                      <SelectItem value="CQ not answered">CQ not answered</SelectItem>
                      <SelectItem value="CQ not asked">CQ not asked</SelectItem>
                      <SelectItem value="CTPS/TPS">CTPS/TPS</SelectItem>
                      <SelectItem value="Dead Contact">Dead Contact</SelectItem>
                      <SelectItem value="Disposition not available">Disposition not available</SelectItem>
                      <SelectItem value="Disqualified by MIS">Disqualified by MIS</SelectItem>
                      <SelectItem value="DNC">DNC</SelectItem>
                      <SelectItem value="Domain Limit Exceeded">Domain Limit Exceeded</SelectItem>
                      <SelectItem value="WP title not read">WP title not read</SelectItem>
                      <SelectItem value="Same Prospect Duplicate">Same Prospect Duplicate</SelectItem>
                      <SelectItem value="Email Bounce back">Email Bounce back</SelectItem>
                      <SelectItem value="Incomplete Call">Incomplete Call</SelectItem>
                      <SelectItem value="Incomplete data/ Incorrect Data">Incomplete data/ Incorrect Data</SelectItem>
                      <SelectItem value="Incorrect Call Approach">Incorrect Call Approach</SelectItem>
                      <SelectItem value="Incorrect WP Pitched">Incorrect WP Pitched</SelectItem>
                      <SelectItem value="Internal Suppression">Internal Suppression</SelectItem>
                      <SelectItem value="Invalid Answer">Invalid Answer</SelectItem>
                      <SelectItem value="Invalid Disposition">Invalid Disposition</SelectItem>
                      <SelectItem value="Invalid Email">Invalid Email</SelectItem>
                      <SelectItem value="Invalid Employee Size">Invalid Employee Size</SelectItem>
                      <SelectItem value="Invalid Geo">Invalid Geo</SelectItem>
                      <SelectItem value="Invalid Industry">Invalid Industry</SelectItem>
                      <SelectItem value="Invalid Job Title">Invalid Job Title</SelectItem>
                      <SelectItem value="Invalid Phone Number">Invalid Phone Number</SelectItem>
                      <SelectItem value="Invalid Revenue">Invalid Revenue</SelectItem>
                      <SelectItem value="Invalid Zip Code">Invalid Zip Code</SelectItem>
                      <SelectItem value="Invalid Profile">Invalid Profile</SelectItem>
                      <SelectItem value="Invalid Details">Invalid Details</SelectItem>
                      <SelectItem value="Link not found">Link not found</SelectItem>
                      <SelectItem value="Mobile phone number">Mobile phone number</SelectItem>
                      <SelectItem value="NAICS/SIC code mismatch">NAICS/SIC code mismatch</SelectItem>
                      <SelectItem value="Not an RPC">Not an RPC</SelectItem>
                      <SelectItem value="Not From TAL">Not From TAL</SelectItem>
                      <SelectItem value="Not interested">Not interested</SelectItem>
                      <SelectItem value="Personal/Generic email address">Personal/Generic email address</SelectItem>
                      <SelectItem value="Suspect profile">Suspect profile</SelectItem>
                      <SelectItem value="Tollfree number">Tollfree number</SelectItem>
                      <SelectItem value="Voice log Missing">Voice log Missing</SelectItem>
                      <SelectItem value="No longer with the company">No longer with the company</SelectItem>
                      <SelectItem value="Proper Value Proposition not shared on call">Proper Value Proposition not shared on call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 2</label>
                  <Select value={fDqReason2} onValueChange={setFDqReason2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select DQ reason 2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client Suppression">Client Suppression</SelectItem>
                      <SelectItem value="Communication skills">Communication skills</SelectItem>
                      <SelectItem value="Consent Missing">Consent Missing</SelectItem>
                      <SelectItem value="CQ not answered">CQ not answered</SelectItem>
                      <SelectItem value="CQ not asked">CQ not asked</SelectItem>
                      <SelectItem value="CTPS/TPS">CTPS/TPS</SelectItem>
                      <SelectItem value="Dead Contact">Dead Contact</SelectItem>
                      <SelectItem value="Disposition not available">Disposition not available</SelectItem>
                      <SelectItem value="Disqualified by MIS">Disqualified by MIS</SelectItem>
                      <SelectItem value="DNC">DNC</SelectItem>
                      <SelectItem value="Domain Limit Exceeded">Domain Limit Exceeded</SelectItem>
                      <SelectItem value="WP title not read">WP title not read</SelectItem>
                      <SelectItem value="Same Prospect Duplicate">Same Prospect Duplicate</SelectItem>
                      <SelectItem value="Email Bounce back">Email Bounce back</SelectItem>
                      <SelectItem value="Incomplete Call">Incomplete Call</SelectItem>
                      <SelectItem value="Incomplete data/ Incorrect Data">Incomplete data/ Incorrect Data</SelectItem>
                      <SelectItem value="Incorrect Call Approach">Incorrect Call Approach</SelectItem>
                      <SelectItem value="Incorrect WP Pitched">Incorrect WP Pitched</SelectItem>
                      <SelectItem value="Internal Suppression">Internal Suppression</SelectItem>
                      <SelectItem value="Invalid Answer">Invalid Answer</SelectItem>
                      <SelectItem value="Invalid Disposition">Invalid Disposition</SelectItem>
                      <SelectItem value="Invalid Email">Invalid Email</SelectItem>
                      <SelectItem value="Invalid Employee Size">Invalid Employee Size</SelectItem>
                      <SelectItem value="Invalid Geo">Invalid Geo</SelectItem>
                      <SelectItem value="Invalid Industry">Invalid Industry</SelectItem>
                      <SelectItem value="Invalid Job Title">Invalid Job Title</SelectItem>
                      <SelectItem value="Invalid Phone Number">Invalid Phone Number</SelectItem>
                      <SelectItem value="Invalid Revenue">Invalid Revenue</SelectItem>
                      <SelectItem value="Invalid Zip Code">Invalid Zip Code</SelectItem>
                      <SelectItem value="Invalid Profile">Invalid Profile</SelectItem>
                      <SelectItem value="Invalid Details">Invalid Details</SelectItem>
                      <SelectItem value="Link not found">Link not found</SelectItem>
                      <SelectItem value="Mobile phone number">Mobile phone number</SelectItem>
                      <SelectItem value="NAICS/SIC code mismatch">NAICS/SIC code mismatch</SelectItem>
                      <SelectItem value="Not an RPC">Not an RPC</SelectItem>
                      <SelectItem value="Not From TAL">Not From TAL</SelectItem>
                      <SelectItem value="Not interested">Not interested</SelectItem>
                      <SelectItem value="Personal/Generic email address">Personal/Generic email address</SelectItem>
                      <SelectItem value="Suspect profile">Suspect profile</SelectItem>
                      <SelectItem value="Tollfree number">Tollfree number</SelectItem>
                      <SelectItem value="Voice log Missing">Voice log Missing</SelectItem>
                      <SelectItem value="No longer with the company">No longer with the company</SelectItem>
                      <SelectItem value="Proper Value Proposition not shared on call">Proper Value Proposition not shared on call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 3</label>
                  <Select value={fDqReason3} onValueChange={setFDqReason3}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select DQ reason 3" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client Suppression">Client Suppression</SelectItem>
                      <SelectItem value="Communication skills">Communication skills</SelectItem>
                      <SelectItem value="Consent Missing">Consent Missing</SelectItem>
                      <SelectItem value="CQ not answered">CQ not answered</SelectItem>
                      <SelectItem value="CQ not asked">CQ not asked</SelectItem>
                      <SelectItem value="CTPS/TPS">CTPS/TPS</SelectItem>
                      <SelectItem value="Dead Contact">Dead Contact</SelectItem>
                      <SelectItem value="Disposition not available">Disposition not available</SelectItem>
                      <SelectItem value="Disqualified by MIS">Disqualified by MIS</SelectItem>
                      <SelectItem value="DNC">DNC</SelectItem>
                      <SelectItem value="Domain Limit Exceeded">Domain Limit Exceeded</SelectItem>
                      <SelectItem value="WP title not read">WP title not read</SelectItem>
                      <SelectItem value="Same Prospect Duplicate">Same Prospect Duplicate</SelectItem>
                      <SelectItem value="Email Bounce back">Email Bounce back</SelectItem>
                      <SelectItem value="Incomplete Call">Incomplete Call</SelectItem>
                      <SelectItem value="Incomplete data/ Incorrect Data">Incomplete data/ Incorrect Data</SelectItem>
                      <SelectItem value="Incorrect Call Approach">Incorrect Call Approach</SelectItem>
                      <SelectItem value="Incorrect WP Pitched">Incorrect WP Pitched</SelectItem>
                      <SelectItem value="Internal Suppression">Internal Suppression</SelectItem>
                      <SelectItem value="Invalid Answer">Invalid Answer</SelectItem>
                      <SelectItem value="Invalid Disposition">Invalid Disposition</SelectItem>
                      <SelectItem value="Invalid Email">Invalid Email</SelectItem>
                      <SelectItem value="Invalid Employee Size">Invalid Employee Size</SelectItem>
                      <SelectItem value="Invalid Geo">Invalid Geo</SelectItem>
                      <SelectItem value="Invalid Industry">Invalid Industry</SelectItem>
                      <SelectItem value="Invalid Job Title">Invalid Job Title</SelectItem>
                      <SelectItem value="Invalid Phone Number">Invalid Phone Number</SelectItem>
                      <SelectItem value="Invalid Revenue">Invalid Revenue</SelectItem>
                      <SelectItem value="Invalid Zip Code">Invalid Zip Code</SelectItem>
                      <SelectItem value="Invalid Profile">Invalid Profile</SelectItem>
                      <SelectItem value="Invalid Details">Invalid Details</SelectItem>
                      <SelectItem value="Link not found">Link not found</SelectItem>
                      <SelectItem value="Mobile phone number">Mobile phone number</SelectItem>
                      <SelectItem value="NAICS/SIC code mismatch">NAICS/SIC code mismatch</SelectItem>
                      <SelectItem value="Not an RPC">Not an RPC</SelectItem>
                      <SelectItem value="Not From TAL">Not From TAL</SelectItem>
                      <SelectItem value="Not interested">Not interested</SelectItem>
                      <SelectItem value="Personal/Generic email address">Personal/Generic email address</SelectItem>
                      <SelectItem value="Suspect profile">Suspect profile</SelectItem>
                      <SelectItem value="Tollfree number">Tollfree number</SelectItem>
                      <SelectItem value="Voice log Missing">Voice log Missing</SelectItem>
                      <SelectItem value="No longer with the company">No longer with the company</SelectItem>
                      <SelectItem value="Proper Value Proposition not shared on call">Proper Value Proposition not shared on call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs mb-1">DQ reason 4</label>
                  <Select value={fDqReason4} onValueChange={setFDqReason4}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select DQ reason 4" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client Suppression">Client Suppression</SelectItem>
                      <SelectItem value="Communication skills">Communication skills</SelectItem>
                      <SelectItem value="Consent Missing">Consent Missing</SelectItem>
                      <SelectItem value="CQ not answered">CQ not answered</SelectItem>
                      <SelectItem value="CQ not asked">CQ not asked</SelectItem>
                      <SelectItem value="CTPS/TPS">CTPS/TPS</SelectItem>
                      <SelectItem value="Dead Contact">Dead Contact</SelectItem>
                      <SelectItem value="Disposition not available">Disposition not available</SelectItem>
                      <SelectItem value="Disqualified by MIS">Disqualified by MIS</SelectItem>
                      <SelectItem value="DNC">DNC</SelectItem>
                      <SelectItem value="Domain Limit Exceeded">Domain Limit Exceeded</SelectItem>
                      <SelectItem value="WP title not read">WP title not read</SelectItem>
                      <SelectItem value="Same Prospect Duplicate">Same Prospect Duplicate</SelectItem>
                      <SelectItem value="Email Bounce back">Email Bounce back</SelectItem>
                      <SelectItem value="Incomplete Call">Incomplete Call</SelectItem>
                      <SelectItem value="Incomplete data/ Incorrect Data">Incomplete data/ Incorrect Data</SelectItem>
                      <SelectItem value="Incorrect Call Approach">Incorrect Call Approach</SelectItem>
                      <SelectItem value="Incorrect WP Pitched">Incorrect WP Pitched</SelectItem>
                      <SelectItem value="Internal Suppression">Internal Suppression</SelectItem>
                      <SelectItem value="Invalid Answer">Invalid Answer</SelectItem>
                      <SelectItem value="Invalid Disposition">Invalid Disposition</SelectItem>
                      <SelectItem value="Invalid Email">Invalid Email</SelectItem>
                      <SelectItem value="Invalid Employee Size">Invalid Employee Size</SelectItem>
                      <SelectItem value="Invalid Geo">Invalid Geo</SelectItem>
                      <SelectItem value="Invalid Industry">Invalid Industry</SelectItem>
                      <SelectItem value="Invalid Job Title">Invalid Job Title</SelectItem>
                      <SelectItem value="Invalid Phone Number">Invalid Phone Number</SelectItem>
                      <SelectItem value="Invalid Revenue">Invalid Revenue</SelectItem>
                      <SelectItem value="Invalid Zip Code">Invalid Zip Code</SelectItem>
                      <SelectItem value="Invalid Profile">Invalid Profile</SelectItem>
                      <SelectItem value="Invalid Details">Invalid Details</SelectItem>
                      <SelectItem value="Link not found">Link not found</SelectItem>
                      <SelectItem value="Mobile phone number">Mobile phone number</SelectItem>
                      <SelectItem value="NAICS/SIC code mismatch">NAICS/SIC code mismatch</SelectItem>
                      <SelectItem value="Not an RPC">Not an RPC</SelectItem>
                      <SelectItem value="Not From TAL">Not From TAL</SelectItem>
                      <SelectItem value="Not interested">Not interested</SelectItem>
                      <SelectItem value="Personal/Generic email address">Personal/Generic email address</SelectItem>
                      <SelectItem value="Suspect profile">Suspect profile</SelectItem>
                      <SelectItem value="Tollfree number">Tollfree number</SelectItem>
                      <SelectItem value="Voice log Missing">Voice log Missing</SelectItem>
                      <SelectItem value="No longer with the company">No longer with the company</SelectItem>
                      <SelectItem value="Proper Value Proposition not shared on call">Proper Value Proposition not shared on call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs mb-1">Call rating</label>
                  <Select value={fCallRating} onValueChange={setFCallRating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Call Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Good Call</SelectItem>
                      <SelectItem value="2">2 - Good call but has an objection</SelectItem>
                      <SelectItem value="3">3 - Call has more than 1 objection or query</SelectItem>
                      <SelectItem value="4">4 - DQ for specs and Invalid Objection handling</SelectItem>
                    </SelectContent>
                  </Select>
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

              {/* DM Form Fields - Disabled */}
              {dmFormLoading ? (
                <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/20">
                  Loading DM form data...
                </div>
              ) : dmFormData ? (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground border-b pb-2">DM Form Data (Read-only)</div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-xs mb-1">Salutation</label>
                      <Input value={dmFormData.f_salutation || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">First Name</label>
                      <Input value={dmFormData.f_first_name || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Last Name</label>
                      <Input value={dmFormData.f_last_name || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Job Title</label>
                      <Input value={dmFormData.f_job_title || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Department</label>
                      <Input value={dmFormData.f_department || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Job Level</label>
                      <Input value={dmFormData.f_job_level || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Email</label>
                      <Input value={dmFormData.f_email_add || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Secondary Email</label>
                      <Input value={dmFormData.Secondary_Email || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Contact No</label>
                      <Input value={dmFormData.f_conatct_no || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Company Name</label>
                      <Input value={dmFormData.f_company_name || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Website</label>
                      <Input value={dmFormData.f_website || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Address 1</label>
                      <Input value={dmFormData.f_address1 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">City</label>
                      <Input value={dmFormData.f_city || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">State</label>
                      <Input value={dmFormData.f_state || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Zip Code</label>
                      <Input value={dmFormData.f_zip_code || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Country</label>
                      <Input value={dmFormData.f_country || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Employee Size</label>
                      <Input value={dmFormData.f_emp_size || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Industry</label>
                      <Input value={dmFormData.f_industry || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Sub Industry</label>
                      <Input value={dmFormData.f_sub_industry || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Revenue</label>
                      <Input value={dmFormData.f_revenue || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Revenue Link</label>
                      <Input value={dmFormData.f_revenue_link || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Profile Link</label>
                      <Input value={dmFormData.f_profile_link || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Company Link</label>
                      <Input value={dmFormData.f_company_link || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Address Link</label>
                      <Input value={dmFormData.f_address_link || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Asset Name 1</label>
                      <Input value={dmFormData.f_asset_name1 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Asset Name 2</label>
                      <Input value={dmFormData.f_asset_name2 || ""} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-xs mb-1">CQ1</label>
                      <Input value={dmFormData.f_cq1 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ2</label>
                      <Input value={dmFormData.f_cq2 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ3</label>
                      <Input value={dmFormData.f_cq3 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ4</label>
                      <Input value={dmFormData.f_cq4 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ5</label>
                      <Input value={dmFormData.f_cq5 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ6</label>
                      <Input value={dmFormData.f_cq6 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ7</label>
                      <Input value={dmFormData.f_cq7 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ8</label>
                      <Input value={dmFormData.f_cq8 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ9</label>
                      <Input value={dmFormData.f_cq9 || ""} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">CQ10</label>
                      <Input value={dmFormData.f_cq10 || ""} disabled className="bg-muted" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/20">
                  No DM form data available for this call.
                </div>
              )}

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
                  <label className="block text-xs mb-1">Call notes</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={fCallNotes}
                    onChange={(e) => setFCallNotes(e.target.value)}
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
                  {saving ? (isEditMode ? "Updating…" : "Creating…") : (isEditMode ? "Update Audit" : "Create Audit")}
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
