import { useCallback, useRef } from 'react'
import { logCallInfo, logCallWarn, logCallError } from '@/lib/callDebug'

interface LiveKitCallState {
  isLiveKitActive: boolean
  liveKitSessionId?: string
}

interface JSSIPCallState {
  isJSSIPActive: boolean
  jssipSession?: any
}

interface IntegratedCallState extends LiveKitCallState, JSSIPCallState {
  callPhase: 'idle' | 'dialing' | 'ringing' | 'connected' | 'ended' | 'failed'
  phoneNumber?: string
  leadId?: string
}

interface UseIntegratedCallOptions {
  jssipHook: any // JSSIP hook instance
  selectedCampaign?: string // Add campaign parameter
  onCallPhaseChange?: (phase: IntegratedCallState['callPhase']) => void
  onCallStart?: (callId: string) => void
  onCallEnd?: () => void
}

export function useIntegratedCall({
  jssipHook,
  selectedCampaign,
  onCallPhaseChange,
  onCallStart,
  onCallEnd
}: UseIntegratedCallOptions) {
  const callStateRef = useRef<IntegratedCallState>({
    callPhase: 'idle',
    isLiveKitActive: false,
    isJSSIPActive: false
  })

  const liveKitSessionRef = useRef<string | null>(null)
  const jssipSessionRef = useRef<any>(null)

  // Store audio elements globally
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringbackOscRef = useRef<OscillatorNode | null>(null)
  const ringbackGainRef = useRef<GainNode | null>(null)
  const ringbackTimerRef = useRef<number | null>(null)
  const liveKitAudioRef = useRef<HTMLAudioElement | null>(null)

  // Start integrated call
  const startIntegratedCall = useCallback(async (phoneNumber: string, leadId: string) => {
    try {
      console.log('[IntegratedCall] Starting unified call for:', phoneNumber)
      logCallInfo('IntegratedCall', 'start', { phoneNumber, leadId })
      
      // Update state to dialing
      callStateRef.current = {
        ...callStateRef.current,
        callPhase: 'dialing',
        phoneNumber,
        leadId,
        isLiveKitActive: false,
        isJSSIPActive: false
      }
      onCallPhaseChange?.('dialing')
      logCallInfo('IntegratedCall', 'phase', { phase: 'dialing' })

      // Step 1: Start JSSIP call for phone connection
      if (jssipHook?.isRegistered) {
        console.log('[IntegratedCall] Initiating JSSIP call')
        logCallInfo('JSSIP', 'initiate')
        const cleanPhone = phoneNumber.replace(/^\+91/, '')
        
        try {
          jssipSessionRef.current = await jssipHook.makeCall(cleanPhone)
          callStateRef.current.isJSSIPActive = true
          
          console.log('[IntegratedCall] JSSIP call initiated')
          logCallInfo('JSSIP', 'initiated', { phoneNumber: cleanPhone })
          
          // Set up JSSIP event listeners
          jssipSessionRef.current.on('progress', () => {
            console.log('[IntegratedCall] JSSIP call ringing')
            callStateRef.current.callPhase = 'ringing'
            onCallPhaseChange?.('ringing')
            logCallInfo('JSSIP', 'progress')
          })
          
          jssipSessionRef.current.on('accepted', () => {
            console.log('[IntegratedCall] JSSIP call accepted')
            callStateRef.current.callPhase = 'connected'
            onCallPhaseChange?.('connected')
            logCallInfo('JSSIP', 'accepted')
          })
          
          jssipSessionRef.current.on('failed', (error: any) => {
            console.error('[IntegratedCall] JSSIP call failed:', error)
            callStateRef.current.callPhase = 'failed'
            onCallPhaseChange?.('failed')
            logCallError('JSSIP', 'failed', { error })
            endIntegratedCall()
          })
          
          jssipSessionRef.current.on('ended', () => {
            console.log('[IntegratedCall] JSSIP call ended')
            callStateRef.current.callPhase = 'ended'
            onCallPhaseChange?.('ended')
            logCallInfo('JSSIP', 'ended')
            endIntegratedCall()
          })
          
        } catch (jssipError) {
          console.error('[IntegratedCall] JSSIP call failed:', jssipError)
          logCallError('JSSIP', 'initiate_failed', { error: jssipError })
          throw new Error('JSSIP call initiation failed')
        }
      } else {
        console.warn('[IntegratedCall] JSSIP not registered, skipping phone connection')
        logCallWarn('JSSIP', 'not_registered')
      }

      // Step 2: Start LiveKit for AI voice
      console.log('[IntegratedCall] Starting LiveKit for AI voice')
      logCallInfo('LiveKit', 'start')
      
      try {
        // Import and use the enhanced agentic API for LiveKit
        const { startCall: startLiveKitCall } = await import('@/lib/enhancedAgenticApi')
        
        // Get lead index from leadId (assuming leadId is the index)
        const leadIndex = parseInt(leadId)
        
        // Start LiveKit call with proper campaign
        const liveKitResult = await startLiveKitCall(leadIndex, selectedCampaign || 'default')
        
        liveKitSessionRef.current = `livekit-${Date.now()}`
        callStateRef.current.isLiveKitActive = true
        callStateRef.current.liveKitSessionId = liveKitSessionRef.current
        
        console.log('[IntegratedCall] LiveKit session started successfully')
        logCallInfo('LiveKit', 'started', { sessionId: liveKitSessionRef.current })
        
        // Start LiveKit audio playback
        if (liveKitResult.call_id) {
          try {
            await startLiveKitAudio(liveKitResult.call_id)
            console.log('[IntegratedCall] LiveKit audio playback started')
            logCallInfo('LiveKit', 'audio_started', { callId: liveKitResult.call_id })
          } catch (audioError) {
            console.error('[IntegratedCall] LiveKit audio failed:', audioError)
            logCallWarn('LiveKit', 'audio_failed', { error: audioError })
            // Continue without audio - call still works
          }
        }
        
        // Notify call start
        onCallStart?.(liveKitSessionRef.current)
        logCallInfo('IntegratedCall', 'call_started', { sessionId: liveKitSessionRef.current })
        
      } catch (livekitError) {
        console.error('[IntegratedCall] LiveKit start failed:', livekitError)
        // Continue with JSSIP only if LiveKit fails
        console.warn('[IntegratedCall] Continuing with JSSIP only - LiveKit failed')
        logCallError('LiveKit', 'start_failed', { error: livekitError })
        throw new Error('LiveKit integration failed - AI voice not available')
      }

      // Final state update
      console.log('[IntegratedCall] Integrated call started successfully')
      callStateRef.current.callPhase = 'ringing'
      onCallPhaseChange?.('ringing')
      logCallInfo('IntegratedCall', 'phase', { phase: 'ringing' })

    } catch (error) {
      console.error('[IntegratedCall] Integrated call failed:', error)
      callStateRef.current.callPhase = 'failed'
      onCallPhaseChange?.('failed')
      logCallError('IntegratedCall', 'failed', { error })
      endIntegratedCall()
      throw error
    }
  }, [jssipHook, onCallPhaseChange, onCallStart])

  // End integrated call
  const endIntegratedCall = useCallback(() => {
    console.log('[IntegratedCall] Ending integrated call')
    logCallInfo('IntegratedCall', 'end')
    
    // End JSSIP call
    if (jssipSessionRef.current) {
      try {
        jssipSessionRef.current.terminate()
        console.log('[IntegratedCall] JSSIP call terminated')
        logCallInfo('JSSIP', 'terminated')
      } catch (error) {
        console.error('[IntegratedCall] Failed to terminate JSSIP call:', error)
        logCallError('JSSIP', 'terminate_failed', { error })
      }
      jssipSessionRef.current = null
    }
    
    // End LiveKit session
    if (liveKitSessionRef.current) {
      try {
        // Import and use LiveKit cleanup
        import('@/lib/enhancedAgenticApi').then(({ endCall }) => {
          endCall()
        })
        console.log('[IntegratedCall] LiveKit session ended')
        logCallInfo('LiveKit', 'ended')
      } catch (error) {
        console.error('[IntegratedCall] Failed to end LiveKit session:', error)
        logCallError('LiveKit', 'end_failed', { error })
      }
      liveKitSessionRef.current = null
    }
    
    // Reset state
    callStateRef.current = {
      callPhase: 'idle',
      isLiveKitActive: false,
      isJSSIPActive: false
    }
    
    onCallPhaseChange?.('idle')
    onCallEnd?.()
    
    console.log('[IntegratedCall] Integrated call ended')
    logCallInfo('IntegratedCall', 'phase', { phase: 'idle' })
  }, [onCallPhaseChange, onCallEnd])

  // Start LiveKit audio playback
  const startLiveKitAudio = useCallback(async (callId: string) => {
    try {
      console.log('[IntegratedCall] Starting LiveKit audio playback for:', callId)
      logCallInfo('LiveKit', 'audio_start', { callId })
      
      // Import LiveKit room connection
      const { Room, RoomEvent, Track } = await import('livekit-client')
      const { getLiveKitConfig } = await import('@/lib/livekit-config')
      
      const config = getLiveKitConfig()
      if (!config.websocketUrl || !config.apiKey) {
        logCallError('LiveKit', 'config_missing')
        throw new Error('LiveKit configuration missing')
      }
      
      // Create LiveKit room connection
      const room = new Room()
      
      // Set up event listeners for audio tracks
      room.on(RoomEvent.TrackSubscribed, (track, participant) => {
        console.log('[IntegratedCall] LiveKit audio track subscribed:', track.kind)
        if (track.kind === Track.Kind.Audio) {
          // Create audio element for LiveKit audio
          if (!liveKitAudioRef.current) {
            liveKitAudioRef.current = document.createElement('audio')
            liveKitAudioRef.current.autoplay = true
            liveKitAudioRef.current.volume = 0.8
            document.body.appendChild(liveKitAudioRef.current)
          }
          
          // Attach track to audio element
          track.attach(liveKitAudioRef.current)
          console.log('[IntegratedCall] LiveKit audio attached to element')
          logCallInfo('LiveKit', 'audio_track_attached')
        }
      })
      
      // Connect to LiveKit room
      const token = await generateLiveKitToken(callId, config)
      await room.connect(config.websocketUrl, token)
      
      console.log('[IntegratedCall] Connected to LiveKit room:', room.name)
      logCallInfo('LiveKit', 'room_connected', { name: room.name })
      
      return room
      
    } catch (error) {
      console.error('[IntegratedCall] Failed to start LiveKit audio:', error)
      logCallError('LiveKit', 'audio_start_failed', { error })
      throw error
    }
  }, [])

  // Generate LiveKit token from backend
  const generateLiveKitToken = useCallback(async (callId: string, config: any) => {
    try {
      console.log('[IntegratedCall] Generating LiveKit token for:', callId)
      logCallInfo('LiveKit', 'token_request', { callId })
      
      // Use backend API to generate token
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      const response = await fetch(`${backendUrl}/api/token?room=${callId}&identity=${callId}`)
      
      if (!response.ok) {
        logCallError('LiveKit', 'token_failed_http', { status: response.status })
        throw new Error(`Token generation failed: ${response.status}`)
      }
      
      const data = await response.json()
      logCallInfo('LiveKit', 'token_received')
      return data.token
      
    } catch (error) {
      console.error('[IntegratedCall] Failed to generate LiveKit token:', error)
      logCallError('LiveKit', 'token_failed', { error })
      throw error
    }
  }, [])
  const getCallState = useCallback(() => {
    return { ...callStateRef.current }
  }, [])

  // Check if call is active
  const isCallActive = useCallback(() => {
    const state = callStateRef.current
    return state.callPhase !== 'idle' && state.callPhase !== 'ended' && state.callPhase !== 'failed'
  }, [])

  return {
    startIntegratedCall,
    endIntegratedCall,
    getCallState,
    isCallActive,
    currentPhase: callStateRef.current.callPhase
  }
}
