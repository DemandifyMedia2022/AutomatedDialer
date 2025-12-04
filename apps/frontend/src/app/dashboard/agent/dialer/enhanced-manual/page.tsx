/**
 * Enhanced Manual Dialer with LiveKit SIP Integration
 * Integrates LiveKit SIP alongside existing JSSIP functionality
 */

"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import { Phone, PhoneOff, Mic, MicOff, Trash2, Search, Pause, UserPlus, Grid2X2, PhoneCall, Settings, Wifi, WifiOff } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink,BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from "@/lib/auth"
import { io } from "socket.io-client"
import { useCampaigns } from "@/hooks/agentic/useCampaigns"
import { useHybridSIP, SIPProvider } from "@/hooks/useHybridSIP"
import { getLiveKitConfig } from "@/lib/livekit-config"

// Import existing components and logic from manual dialer
// This is a simplified version - you'll need to import your existing components

declare global {
  interface Window {
    JsSIP?: any
  }
}

const API_PREFIX = `${API_BASE}/api`

// Waveform animation component (from existing code)
const WaveBars: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-end justify-between gap-[2px] h-4 w-full">
    {Array.from({ length: 64 }).map((_, i) => {
      const base = [0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.6, 0.8, 1, 0.8, 0.6, 0.4]
      const height = base[i % base.length]
      return (
        <span
          key={i}
          style={{
            height: `${height * 100}%`,
            animation: active ? `wave 0.7s ${0.03 * (i % base.length)}s infinite ease-in-out` : 'none',
            animationFillMode: active ? 'both' : 'forwards',
          }}
          className="w-[2px] bg-foreground/70 rounded-sm origin-bottom"
        />
      )
    })}
    <style jsx>{`
      @keyframes wave {
        0% { transform: scaleY(0.4); }
        50% { transform: scaleY(1.2); }
        100% { transform: scaleY(0.4); }
      }
    `}</style>
  </div>
)

export default function EnhancedManualDialerPage() {
  // Existing state from manual dialer
  const [ext, setExt] = useState("")
  const [pwd, setPwd] = useState("")
  const [number, setNumber] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [status, setStatus] = useState("Idle")
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [callHistory, setCallHistory] = useState<any[]>([])
  
  // LiveKit integration state
  const [sipProvider, setSipProvider] = useState<SIPProvider>('jssip')
  const [showProviderSettings, setShowProviderSettings] = useState(false)
  
  // Hybrid SIP hook
  const hybridSIP = useHybridSIP()
  const liveKitConfig = getLiveKitConfig()
  
  // Existing refs
  const uaRef = useRef<any>(null)
  const sessionRef = useRef<any>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callStartRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const hasAnsweredRef = useRef<boolean>(false)
  const dialStartRef = useRef<number | null>(null)
  const lastDialDestinationRef = useRef<string | null>(null)

  // Calculate current phone number
  const currentPhone = useMemo(() => {
    const dialNum = number ? `${countryCode}${number}` : ""
    return dialNum || ""
  }, [countryCode, number])

  // Initialize JSSIP (existing logic)
  useEffect(() => {
    if (!isLoaded) return
    
    let aborted = false
    const run = async () => {
      try {
        setError(null)
        const headers: Record<string, string> = {}
        if (!USE_AUTH_COOKIE) {
          const t = getToken()
          if (t) headers['Authorization'] = `Bearer ${t}`
        }
        const res = await fetch(`${API_PREFIX}/agents/me/credentials`, {
          method: 'GET',
          credentials: USE_AUTH_COOKIE ? 'include' : 'omit',
          headers,
        })
        if (!res.ok) {
          throw new Error('Failed to get SIP credentials. Ensure an extension is assigned to your account.')
        }
        const data = await res.json() as { success: true; extensionId: string; password: string }
        if (aborted) return
        setExt(data.extensionId)
        setPwd(data.password)
        
        // Initialize JSSIP and set in hybrid SIP
        await startUA(data.extensionId, data.password)
        hybridSIP.setJssipUA(uaRef.current)
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Auto login failed')
      }
    }
    run()
    return () => { aborted = true }
  }, [isLoaded, hybridSIP])

  // Start JSSIP User Agent (simplified version of existing logic)
  const startUA = useCallback(async (extension: string, password: string) => {
    setError(null)
    if (!window.JsSIP) throw new Error("JsSIP not loaded")

    const res = await fetch(`${API_PREFIX}/sip/config`)
    if (!res.ok) throw new Error(`Failed to load SIP config: ${res.status}`)
    const { wssUrl, domain, stunServer } = await res.json()

    const socket = new window.JsSIP.WebSocketInterface(wssUrl)
    const configuration = {
      uri: `sip:${extension}@${domain}`,
      password,
      sockets: [socket],
      register: true,
      session_timers: true,
      session_timers_refresh_method: "UPDATE",
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      iceServers: stunServer ? [{ urls: stunServer }] : undefined,
    }

    window.JsSIP.debug.enable("JsSIP:*")
    const ua = new window.JsSIP.UA(configuration)

    ua.on("connected", () => setStatus("Connected"))
    ua.on("disconnected", () => setStatus("Disconnected"))
    ua.on("registered", () => setStatus("Registered"))
    ua.on("unregistered", () => setStatus("Unregistered"))
    ua.on("registrationFailed", (e: any) => setError(`Registration failed: ${e?.cause || "unknown"}`))

    ua.on("newRTCSession", (data: any) => {
      const session = data.session
      sessionRef.current = session
      hybridSIP.setJssipSession(session)

      session.on("peerconnection", (e: any) => {
        const pc: RTCPeerConnection = e.peerconnection
        attachRemoteAudio(pc)
      })

      session.on("progress", () => {
        setStatus("Ringing")
        const dest = lastDialDestinationRef.current || currentPhone
        try { sendPhase('ringing', { source: ext, destination: dest || '', direction: 'OUT' }) } catch {}
      })

      session.on("accepted", async () => {
        setStatus("In Call")
        callStartRef.current = Date.now()
        hasAnsweredRef.current = true
        setShowPopup(true)
        try {
          const dest = lastDialDestinationRef.current || currentPhone
          await sendPhase('connected', { source: ext, destination: dest || '', direction: 'OUT' })
        } catch {}
      })

      session.on("failed", async (e: any) => {
        setStatus("Call Failed")
        setError(e?.cause || "Call failed")
        try { await sendPhase('ended') } catch {}
      })

      session.on("ended", async () => {
        setStatus("Call Ended")
        try { await sendPhase('ended') } catch {}
      })
    })

    ua.start()
    uaRef.current = ua
  }, [currentPhone, ext, hybridSIP])

  // Attach remote audio (existing logic)
  const attachRemoteAudio = useCallback((pc: RTCPeerConnection) => {
    const safePlay = async () => {
      try {
        await remoteAudioRef.current?.play()
      } catch (e: any) {
        setError((prev) => prev || `Audio play blocked: ${e?.message || 'permission or autoplay'}`)
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        safePlay()
      }
    }
  }, [])

  // Send call phase (existing logic)
  const sendPhase = useCallback(async (
    phase: 'dialing' | 'ringing' | 'connecting' | 'connected' | 'ended',
    extra?: Partial<{ source: string; destination: string; direction: string }>
  ) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let credentials: RequestCredentials = 'omit'
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies(); if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken(); if (t) headers['Authorization'] = `Bearer ${t}`
      }
      await fetch(`${API_PREFIX}/calls/phase`, {
        method: 'POST',
        headers,
        credentials,
        body: JSON.stringify({ phase, callId: Date.now(), ...extra })
      }).catch(() => { })
    } catch { }
  }, [])

  // Enhanced dial function supporting both JSSIP and LiveKit
  const placeCall = useCallback(async () => {
    if (!currentPhone.trim()) {
      setError("Please enter a phone number")
      return
    }

    const destination = currentPhone.startsWith('+') ? currentPhone : `+91${currentPhone}`
    lastDialDestinationRef.current = destination

    try {
      setError(null)
      
      if (sipProvider === 'livekit' && liveKitConfig.enableLiveKitSIP) {
        // Use LiveKit SIP
        await hybridSIP.createCall({
          destination,
          source: ext,
          provider: 'livekit',
          record: liveKitConfig.enableRecording,
          metadata: {
            agent: ext,
            campaign: 'manual',
            timestamp: new Date().toISOString(),
          }
        })
        setStatus("Dialing (LiveKit)")
      } else {
        // Use JSSIP (existing logic)
        if (!uaRef.current) {
          throw new Error('SIP not registered')
        }
        
        const session = uaRef.current.call(`sip:${destination}@${uaRef.current._domain}`, {
          media: {
            constraints: {
              audio: true,
              video: false
            },
            rtcOfferConstraints: {
              offerToReceiveAudio: true,
              offerToReceiveVideo: false
            }
          }
        })
        
        if (!session) {
          throw new Error('Failed to initiate call')
        }
        
        setStatus("Dialing (JSSIP)")
        await sendPhase('dialing', { source: ext, destination, direction: 'OUT' })
      }
      
      setShowPopup(true)
    } catch (error) {
      console.error('Call failed:', error)
      setError(error instanceof Error ? error.message : 'Call failed')
    }
  }, [currentPhone, ext, sipProvider, liveKitConfig, hybridSIP, sendPhase])

  // End call function
  const endCall = useCallback(async () => {
    try {
      if (hybridSIP.currentSession?.provider === 'livekit') {
        await hybridSIP.endCall(hybridSIP.currentSession.id)
      } else if (sessionRef.current) {
        sessionRef.current.terminate()
      }
      
      setStatus("Idle")
      setShowPopup(false)
      await sendPhase('ended')
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }, [hybridSIP, sendPhase])

  // Get provider status for UI
  const providerStatus = hybridSIP.getProviderStatus()

  return (
    <>
      <Script 
        src="/js/jssip.min.js" 
        onLoad={() => setIsLoaded(true)}
        onError={() => setError('Failed to load JSSIP library')}
      />
      
      <SidebarProvider>
        <AgentSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]:sidebar-sidebar:h-12 group-has-[[data-collapsible=icon]]:sidebar-sidebar:w-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard/agent">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard/agent/dialer">Dialer</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Enhanced Manual Dialer</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Enhanced Manual Dialer</h1>
                  <p className="text-muted-foreground">JSSIP + LiveKit SIP Integration</p>
                </div>
                
                {/* Provider Selection */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={providerStatus.jssip.connected ? "default" : "secondary"}>
                      <Wifi className="w-3 h-3 mr-1" />
                      JSSIP: {providerStatus.jssip.connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {liveKitConfig.enableLiveKitSIP && (
                      <Badge variant={providerStatus.livekit.connected ? "default" : "secondary"}>
                        <Wifi className="w-3 h-3 mr-1" />
                        LiveKit: {providerStatus.livekit.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    )}
                  </div>
                  
                  <Select value={sipProvider} onValueChange={(value: SIPProvider) => setSipProvider(value)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jssip">JSSIP</SelectItem>
                      {liveKitConfig.enableLiveKitSIP && (
                        <SelectItem value="livekit">LiveKit SIP</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProviderSettings(!showProviderSettings)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Provider Settings Panel */}
              {showProviderSettings && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Provider Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">JSSIP Status</Label>
                        <div className="mt-1">
                          <Badge variant={providerStatus.jssip.connected ? "default" : "secondary"}>
                            {providerStatus.jssip.connected ? "Registered" : "Not Registered"}
                          </Badge>
                        </div>
                      </div>
                      {liveKitConfig.enableLiveKitSIP && (
                        <div>
                          <Label className="text-sm font-medium">LiveKit Status</Label>
                          <div className="mt-1">
                            <Badge variant={providerStatus.livekit.connected ? "default" : "secondary"}>
                              {providerStatus.livekit.connected ? "Available" : "Not Available"}
                            </Badge>
                            {providerStatus.livekit.activeCalls > 0 && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({providerStatus.livekit.activeCalls} active calls)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {liveKitConfig.enableLiveKitSIP && hybridSIP.liveKitSIP.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">LiveKit Error: {hybridSIP.liveKitSIP.error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Main Dialer Interface */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="country-code">Country Code</Label>
                        <Input
                          id="country-code"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          placeholder="+91"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-3">
                        <Label htmlFor="phone-number">Phone Number</Label>
                        <Input
                          id="phone-number"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="Enter phone number"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        onClick={placeCall}
                        disabled={!currentPhone.trim() || status.includes("Call")}
                        size="lg"
                        className="flex-1"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call {currentPhone}
                        {sipProvider !== 'jssip' && (
                          <Badge variant="outline" className="ml-2">
                            {sipProvider.toUpperCase()}
                          </Badge>
                        )}
                      </Button>
                      
                      <Button
                        onClick={endCall}
                        disabled={!status.includes("Call")}
                        variant="destructive"
                        size="lg"
                      >
                        <PhoneOff className="w-4 h-4 mr-2" />
                        End Call
                      </Button>
                    </div>

                    {/* Status Display */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-medium">Status:</span>
                        <span>{status}</span>
                      </div>
                      {status.includes("Call") && (
                        <div className="flex items-center gap-2">
                          <WaveBars active={status.includes("In Call")} />
                        </div>
                      )}
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Sessions */}
              {hybridSIP.activeSessions.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                    <div className="space-y-2">
                      {hybridSIP.activeSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{session.provider.toUpperCase()}</Badge>
                            <span>{session.destination}</span>
                            <Badge variant={session.status === 'connected' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => hybridSIP.endCall(session.id)}
                          >
                            <PhoneOff className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
