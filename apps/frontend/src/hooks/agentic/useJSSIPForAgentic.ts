/**
 * JSSIP Integration Hook for Agentic Dialing
 * Provides JSSIP registration and SIP functionality for agentic dialing
 */

import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    JsSIP?: any
  }
}

export interface JSSIPState {
  isLoaded: boolean
  isRegistered: boolean
  status: string
  error: string | null
  extension: string
  domain: string
}

export function useJSSIPForAgentic() {
  const [state, setState] = useState<JSSIPState>({
    isLoaded: false,
    isRegistered: false,
    status: 'Idle',
    error: null,
    extension: '',
    domain: ''
  })

  const uaRef = useRef<any>(null)
  const sessionRef = useRef<any>(null)
  const activeDirectionRef = useRef<'incoming' | 'outgoing' | null>(null)
  const activeSessionAliveRef = useRef<boolean>(false)

  // Check if JSSIP is loaded
  useEffect(() => {
    const checkJSSIP = () => {
      console.log('[JSSIP] Checking if JsSIP is available...', window.JsSIP)
      if (window.JsSIP) {
        console.log('[JSSIP] JsSIP found, initializing...')
        setState(prev => ({ ...prev, isLoaded: true }))
        initializeJSSIP()
      } else {
        console.log('[JSSIP] JsSIP not found, retrying...')
        setState(prev => ({ 
          ...prev, 
          error: 'JSSIP library not loaded. Please ensure jssip.min.js is included.' 
        }))
        
        // Retry after a longer delay to allow script to load
        setTimeout(checkJSSIP, 2000)
      }
    }

    // Wait a bit for the script to load before checking
    const initialDelay = setTimeout(checkJSSIP, 1000)
    
    // Set up periodic checks
    const interval = setInterval(() => {
      if (!window.JsSIP) {
        console.log('[JSSIP] Retrying JsSIP check...')
        checkJSSIP()
      } else {
        clearInterval(interval)
      }
    }, 3000)

    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [])

  // Initialize JSSIP User Agent
  const initializeJSSIP = useCallback(async () => {
    if (!window.JsSIP) {
      setState(prev => ({ ...prev, error: 'JSSIP not available' }))
      return
    }

    try {
      console.log('[JSSIP] Getting SIP credentials...')
      
      // Try to get SIP credentials from the agents endpoint
      const response = await fetch('/api/agents/me/credentials')
      
      console.log('[JSSIP] Credentials response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('[JSSIP] Credentials error response:', errorText)
        
        if (response.status === 401) {
          throw new Error('Not authenticated. Please log in first.')
        } else if (response.status === 404) {
          // Auto-login: Get user extension and match with extensions table
          console.log('[JSSIP] No credentials found, attempting auto-login...')
          
          try {
            // Get current user info to find their extension
            const userResponse = await fetch('/api/auth/me', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            
            console.log('[JSSIP] User auth response status:', userResponse.status)
            
            if (!userResponse.ok) {
              console.log('[JSSIP] User auth endpoint failed, using manual credentials')
              throw new Error('User auth endpoint not available')
            }
            
            const userData = await userResponse.json()
            console.log('[JSSIP] User data:', userData)
            
            // Get user's extension from users table
            const userExtension = userData.extension
            if (!userExtension) {
              console.log('[JSSIP] No extension in user data, using manual credentials')
              throw new Error('No extension assigned to your user account')
            }
            
            // Get extension credentials from extensions table
            const extensionsResponse = await fetch('/api/extensions', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            
            if (!extensionsResponse.ok) {
              console.log('[JSSIP] Extensions endpoint failed, using manual credentials')
              throw new Error('Extensions endpoint not available')
            }
            
            const extensions = await extensionsResponse.json()
            
            // Find matching extension
            const matchedExtension = extensions.find((ext: any) => ext.extension === userExtension)
            if (!matchedExtension) {
              console.log('[JSSIP] No matching extension found, using manual credentials')
              throw new Error(`Extension ${userExtension} not found in extensions table`)
            }
            
            console.log('[JSSIP] Found matching extension:', matchedExtension.extension)
            
            const autoCredentials = {
              extensionId: matchedExtension.extension,
              password: matchedExtension.password
            }
            
            return await initializeJSSIPWithCredentials(autoCredentials)
            
          } catch (autoLoginError) {
            console.error('[JSSIP] Auto-login failed:', autoLoginError)
            throw new Error('No SIP credentials available. Please ensure you have an extension assigned in the system.')
          }
        }
        throw new Error(`Failed to get SIP credentials: ${response.status}`)
      }
      const data = await response.json()
      console.log('[JSSIP] Credentials received:', { extensionId: data.extensionId })
      
      return await initializeJSSIPWithCredentials(data)
    } catch (error) {
      console.error('[JSSIP] Initialization error:', error)
      const errorMessage = error instanceof Error ? error.message : 'JSSIP initialization failed'
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        status: 'Error'
      }))
    }
  }, [])

  // Helper function to initialize JSSIP with given credentials
  const initializeJSSIPWithCredentials = useCallback(async (data: any) => {
    try {
      // Get SIP configuration
      let configResponse
      try {
        configResponse = await fetch('/api/sip/config')
      } catch {
        console.log('[JSSIP] SIP config endpoint not available, using fallback...')
      }

      let wssUrl, domain, stunServer
      
      if (configResponse && configResponse.ok) {
        const config = await configResponse.json()
        wssUrl = config.wssUrl
        domain = config.domain
        stunServer = config.stunServer
        console.log('[JSSIP] SIP config received:', { wssUrl, domain })
      } else {
        // Fallback configuration for testing
        console.log('[JSSIP] Using fallback SIP configuration...')
        wssUrl = 'wss://pbx2.telxio.com.sg:8089/ws'
        domain = 'pbx2.telxio.com.sg'
        stunServer = 'stun:stun.l.google.com:19302'
      }

      // Create WebSocket interface
      const socket = new window.JsSIP.WebSocketInterface(wssUrl)

      // Create configuration
      const configuration = {
        uri: `sip:${data.extensionId}@${domain}`,
        password: data.password,
        sockets: [socket],
        register: true,
        session_timers: true,
        session_timers_refresh_method: "UPDATE",
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 30,
        iceServers: stunServer ? [{ urls: stunServer }] : undefined,
      }

      console.log('[JSSIP] Attempting registration with:', {
        uri: configuration.uri,
        domain: domain,
        wssUrl: wssUrl,
        extensionId: data.extensionId,
        password: data.password ? '[REDACTED]' : '[MISSING]'
      })

      // Enable debug logging
      window.JsSIP.debug.enable("JsSIP:*")

      // Create User Agent
      const ua = new window.JsSIP.UA(configuration)

      // Set up event listeners
      ua.on("connecting", () => {
        console.log('[JSSIP] Connecting to SIP server...')
        setState(prev => ({ ...prev, status: 'Connecting', error: null }))
      })

      ua.on("connected", () => {
        console.log('[JSSIP] Connected to SIP server')
        setState(prev => ({ ...prev, status: 'Connected', error: null }))
      })

      ua.on("disconnected", () => {
        console.log('[JSSIP] Disconnected from SIP server')
        setState(prev => ({ 
          ...prev, 
          status: 'Disconnected', 
          isRegistered: false,
          error: 'SIP server connection lost. Check if SIP server is running.'
        }))
      })

      ua.on("registered", () => {
        console.log('[JSSIP] Successfully registered with SIP server')
        setState(prev => ({ 
          ...prev, 
          status: 'Registered', 
          isRegistered: true,
          extension: data.extensionId,
          domain: domain,
          error: null
        }))
      })

      ua.on("unregistered", () => {
        console.log('[JSSIP] Unregistered from SIP server')
        setState(prev => ({ ...prev, status: 'Unregistered', isRegistered: false }))
      })

      ua.on("registrationFailed", (e: any) => {
        console.error('[JSSIP] Registration failed:', e)
        console.error('[JSSIP] Response details:', {
          status_code: e?.response?.status_code,
          reason_phrase: e?.response?.reason_phrase,
          cause: e?.cause,
          message: e?.message
        })
        
        let errorMsg = `Registration failed: ${e?.cause || "Unknown error"}`
        
        // Add specific guidance for common errors
        if (e?.response?.status_code === 403) {
          errorMsg = "Authentication failed (403 Forbidden). Check SIP credentials in database or contact administrator."
        } else if (e?.response?.status_code === 404) {
          errorMsg = "Extension not found (404). Verify extension exists in PBX."
        } else if (e?.response?.status_code) {
          errorMsg = `Registration failed: ${e?.response?.reason_phrase || "Unknown"} (${e?.response?.status_code})`
        }
        
        setState(prev => ({ 
          ...prev, 
          status: 'Registration Failed', 
          isRegistered: false,
          error: errorMsg
        }))
      })

      ua.on("newRTCSession", (data: any) => {
        const session = data.session
        const direction: 'incoming' | 'outgoing' = data.originator === 'local' ? 'outgoing' : 'incoming'
        console.log('[JSSIP] New RTC session:', { id: session?.id, direction })

        if (direction === 'incoming' && activeSessionAliveRef.current && activeDirectionRef.current === 'outgoing') {
          try {
            console.log('[JSSIP] Rejecting incoming call while outbound call is active')
            session.terminate({ status_code: 486, reason_phrase: 'Busy Here' })
            return
          } catch (err) {
            console.log('[JSSIP] Failed to reject incoming while busy:', err)
          }
        }

        sessionRef.current = session
        activeDirectionRef.current = direction
        activeSessionAliveRef.current = true

        session.on("peerconnection", (e: any) => {
          console.log('[JSSIP] Peer connection established')
          const pc = e.peerconnection
          attachRemoteAudio(pc)
        })

        session.on("progress", () => {
          console.log('[JSSIP] Call in progress (ringing)')
          if (activeDirectionRef.current === 'outgoing') startRingbackTone()
        })

        session.on("confirmed", () => {
          console.log('[JSSIP] Call confirmed/answered')
          if (activeDirectionRef.current === 'outgoing') stopRingbackTone()
        })

        session.on("accepted", () => {
          console.log('[JSSIP] Call accepted')
          if (activeDirectionRef.current === 'outgoing') stopRingbackTone()
        })

        session.on("failed", (e: any) => {
          console.error('[JSSIP] Call failed:', e)
          stopRingbackTone()
          activeSessionAliveRef.current = false
          sessionRef.current = null
          activeDirectionRef.current = null
        })

        session.on("ended", () => {
          console.log('[JSSIP] Call ended')
          stopRingbackTone()
          sessionRef.current = null
          activeDirectionRef.current = null
          activeSessionAliveRef.current = false
        })
      })

      // Start the User Agent
      ua.start()
      uaRef.current = ua

      console.log('[JSSIP] User Agent initialized and started')

    } catch (error) {
      console.error('[JSSIP] Initialization error:', error)
      const errorMessage = error instanceof Error ? error.message : 'JSSIP initialization failed'
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        status: 'Error'
      }))
    }
  }, [])

  // Store audio elements globally
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringbackOscRef = useRef<OscillatorNode | null>(null)
  const ringbackGainRef = useRef<GainNode | null>(null)
  const ringbackTimerRef = useRef<number | null>(null)

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = 0.8
      
      // Create remote audio element for call audio
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio()
        remoteAudioRef.current.autoplay = true
      }
      
      // Create a silent audio context to enable audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('[JSSIP] Audio context resumed')
        }).catch(err => {
          console.log('[JSSIP] Failed to resume audio context:', err)
        })
      }
      
      // Create a simple test tone using Web Audio API
      const createTestTone = () => {
        try {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.value = 440 // A4 note
          gainNode.gain.value = 0.1 // Low volume
          
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.2) // Play for 200ms
          
          console.log('[JSSIP] Test tone played successfully')
        } catch (err) {
          console.log('[JSSIP] Test tone failed:', err)
        }
      }
      
      // Try to play test tone after a short delay
      setTimeout(createTestTone, 100)
    }
  }, [])

  // Ensure audio context is available
  const ensureAudioCtx = useCallback(async () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    try { await audioCtxRef.current?.resume() } catch {}
  }, [])

  // Start ringback tone (synthetic ringing for agent)
  const startRingbackTone = useCallback(async () => {
    try {
      await ensureAudioCtx()
      const ctx = audioCtxRef.current
      if (!ctx) return
      
      stopRingbackTone()
      const gain = ctx.createGain()
      const osc = ctx.createOscillator()
      
      // Ringback tone: 440Hz + 480Hz, 1s on / 2s off
      osc.frequency.value = 440
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0
      
      ringbackGainRef.current = gain
      ringbackOscRef.current = osc
      
      const tick = () => {
        if (!ringbackGainRef.current) return
        const now = ctx.currentTime
        ringbackGainRef.current.gain.setValueAtTime(0, now)
        ringbackGainRef.current.gain.linearRampToValueAtTime(0.2, now + 0.01)
        ringbackGainRef.current.gain.setValueAtTime(0.2, now + 0.99)
        ringbackGainRef.current.gain.linearRampToValueAtTime(0, now + 1)
        ringbackTimerRef.current = window.setTimeout(tick, 3000)
      }
      
      osc.start()
      tick()
      console.log('[JSSIP] Ringback tone started')
    } catch (err) {
      console.log('[JSSIP] Failed to start ringback tone:', err)
    }
  }, [ensureAudioCtx])

  // Stop ringback tone
  const stopRingbackTone = useCallback(() => {
    if (ringbackTimerRef.current) { 
      window.clearTimeout(ringbackTimerRef.current); 
      ringbackTimerRef.current = null 
    }
    try { ringbackOscRef.current?.stop() } catch {}
    try { ringbackOscRef.current?.disconnect() } catch {}
    try { ringbackGainRef.current?.disconnect() } catch {}
    ringbackOscRef.current = null
    ringbackGainRef.current = null
    console.log('[JSSIP] Ringback tone stopped')
  }, [])

  // Attach remote audio (from manual dialer)
  const attachRemoteAudio = useCallback((pc: RTCPeerConnection) => {
    const safePlay = async () => {
      try {
        await remoteAudioRef.current?.play()
      } catch (e: any) {
        console.log('[JSSIP] Audio play blocked:', e?.message || 'permission or autoplay')
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        safePlay()
        console.log('[JSSIP] Remote audio attached and playing')
      }
    }
  }, [])

  // Test audio function
  const testAudio = useCallback(() => {
    initializeAudio()
    
    // Create and play a test tone using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('[JSSIP] Audio context resumed for test')
          playTestTone(audioContext)
        }).catch(err => {
          console.log('[JSSIP] Failed to resume audio context for test:', err)
        })
      } else {
        playTestTone(audioContext)
      }
    } catch (err) {
      console.log('[JSSIP] Test audio failed:', err)
    }
    
    function playTestTone(context: AudioContext) {
      try {
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(context.destination)
        
        oscillator.frequency.value = 440 // A4 note
        gainNode.gain.value = 0.2 // Slightly higher volume for test
        
        oscillator.start()
        oscillator.stop(context.currentTime + 0.3) // Play for 300ms
        
        console.log('[JSSIP] Test audio playing - you should hear a tone')
      } catch (err) {
        console.log('[JSSIP] Test tone playback failed:', err)
      }
    }
  }, [initializeAudio])

  // Make a call using JSSIP
  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!state.isRegistered || !uaRef.current) {
      throw new Error('JSSIP not registered')
    }

    // Initialize audio on user interaction
    initializeAudio()

    const destination = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : phoneNumber; // Use phone number as-is

    try {
      const session = uaRef.current.call(destination, {
        mediaConstraints: {
          audio: true,
          video: false
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        }
      })

      if (!session) {
        throw new Error('Failed to initiate call')
      }

      // Handle incoming audio (ringing, call audio)
      session.on('peerconnection', (e: any) => {
        console.log('[JSSIP] Peer connection established')
        const pc = e.peerconnection
        attachRemoteAudio(pc)
      })

      console.log('[JSSIP] Call initiated successfully')
      return session

    } catch (error) {
      console.error('[JSSIP] Call failed:', error)
      throw error
    }
  }, [state.isRegistered, state.domain])

  // End current call
  const endCall = useCallback(() => {
    if (sessionRef.current) {
      console.log('[JSSIP] Ending current call')
      sessionRef.current.terminate()
      sessionRef.current = null
    }
  }, [])

  // Disconnect JSSIP
  const disconnect = useCallback(() => {
    if (uaRef.current) {
      console.log('[JSSIP] Disconnecting User Agent')
      uaRef.current.stop()
      uaRef.current = null
      setState(prev => ({ 
        ...prev, 
        isRegistered: false, 
        status: 'Disconnected' 
      }))
    }
  }, [])

  return {
    ...state,
    makeCall,
    endCall,
    disconnect,
    testAudio,
    ua: uaRef.current,
    session: sessionRef.current
  }
}

export default useJSSIPForAgentic
