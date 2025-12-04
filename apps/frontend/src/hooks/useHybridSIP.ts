/**
 * Hybrid SIP Provider - Manages both JSSIP and LiveKit SIP connections
 * Allows seamless switching between JSSIP and LiveKit for different use cases
 */

import { useCallback, useRef, useState } from 'react';
import { useLiveKitSIP } from '@/hooks/useLiveKitSIP';

export type SIPProvider = 'jssip' | 'livekit' | 'hybrid';

export interface CallOptions {
  destination: string;
  source: string;
  provider?: SIPProvider;
  record?: boolean;
  metadata?: Record<string, any>;
}

export interface CallSession {
  id: string;
  provider: SIPProvider;
  status: 'dialing' | 'ringing' | 'connected' | 'ended' | 'failed';
  startTime: Date;
  endTime?: Date;
  destination: string;
  source: string;
  recording?: boolean;
  metadata?: Record<string, any>;
}

export function useHybridSIP() {
  const liveKitSIP = useLiveKitSIP();
  const [currentProvider, setCurrentProvider] = useState<SIPProvider>('jssip');
  const [activeSessions, setActiveSessions] = useState<CallSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  
  // Refs for JSSIP integration
  const jssipSessionRef = useRef<any>(null);
  const jssipUaRef = useRef<any>(null);

  const createCall = useCallback(async (options: CallOptions): Promise<CallSession> => {
    const provider = options.provider || currentProvider;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: CallSession = {
      id: sessionId,
      provider,
      status: 'dialing',
      startTime: new Date(),
      destination: options.destination,
      source: options.source,
      recording: options.record,
      metadata: options.metadata,
    };

    try {
      if (provider === 'livekit' || provider === 'hybrid') {
        // Use LiveKit SIP
        const liveKitCall = await liveKitSIP.createCall({
          destination: options.destination,
          source: options.source,
          record: options.record,
          metadata: options.metadata,
        });
        
        session.status = liveKitCall.status;
        session.id = liveKitCall.id; // Use LiveKit's call ID
      } else if (provider === 'jssip') {
        // Use existing JSSIP implementation
        if (!jssipUaRef.current) {
          throw new Error('JSSIP User Agent not initialized');
        }
        
        // This would integrate with your existing JSSIP dialing logic
        // For now, we'll simulate the call creation
        const destination = options.destination.startsWith('+') 
          ? options.destination 
          : options.destination; // Use phone number as-is
        
        // Trigger JSSIP call (this would call your existing placeCall function)
        // await placeCallTo(destination);
        
        session.status = 'dialing';
      }
      
      setActiveSessions(prev => [...prev, session]);
      setCurrentSession(session);
      
      return session;
    } catch (error) {
      session.status = 'failed';
      setActiveSessions(prev => [...prev, session]);
      throw error;
    }
  }, [currentProvider, liveKitSIP]);

  const endCall = useCallback(async (sessionId: string): Promise<boolean> => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return false;

    try {
      let success = false;
      
      if (session.provider === 'livekit') {
        success = await liveKitSIP.endCall(sessionId);
      } else if (session.provider === 'jssip') {
        // End JSSIP call
        if (jssipSessionRef.current) {
          jssipSessionRef.current.terminate();
          success = true;
        }
      }
      
      if (success) {
        session.status = 'ended';
        session.endTime = new Date();
        
        setActiveSessions(prev => 
          prev.map(s => s.id === sessionId ? session : s)
        );
        setCurrentSession(prev => 
          prev?.id === sessionId ? session : null
        );
      }
      
      return success;
    } catch (error) {
      console.error('Failed to end call:', error);
      return false;
    }
  }, [activeSessions, liveKitSIP]);

  const switchProvider = useCallback((provider: SIPProvider) => {
    // Only allow switching if no active calls
    if (activeSessions.length === 0) {
      setCurrentProvider(provider);
    } else {
      console.warn('Cannot switch provider while calls are active');
    }
  }, [activeSessions]);

  const getProviderStatus = useCallback(() => {
    return {
      jssip: {
        available: true, // JSSIP is always available if loaded
        connected: jssipUaRef.current?.isRegistered() || false,
      },
      livekit: {
        available: liveKitSIP.isConnected,
        connected: liveKitSIP.isConnected,
        activeCalls: liveKitSIP.activeCalls.length,
      },
      current: currentProvider,
    };
  }, [currentProvider, liveKitSIP]);

  // Integration methods for JSSIP
  const setJssipUA = useCallback((ua: any) => {
    jssipUaRef.current = ua;
  }, []);

  const setJssipSession = useCallback((session: any) => {
    jssipSessionRef.current = session;
    
    // Update session status based on JSSIP events
    if (session && currentSession?.provider === 'jssip') {
      const statusMap: Record<string, CallSession['status']> = {
        'calling': 'dialing',
        'progress': 'ringing',
        'confirmed': 'connected',
        'ended': 'ended',
        'failed': 'failed',
      };
      
      const newStatus = statusMap[session.status] || 'dialing';
      
      setCurrentSession(prev => {
        if (prev && prev.provider === 'jssip') {
          const updated = { ...prev, status: newStatus };
          if (newStatus === 'ended') {
            updated.endTime = new Date();
          }
          return updated;
        }
        return prev;
      });
      
      setActiveSessions(prev => 
        prev.map(s => 
          s.provider === 'jssip' && s.id === currentSession.id 
            ? { ...s, status: newStatus, endTime: newStatus === 'ended' ? new Date() : undefined }
            : s
        )
      );
    }
  }, [currentSession]);

  return {
    // State
    currentProvider,
    activeSessions,
    currentSession,
    
    // Actions
    createCall,
    endCall,
    switchProvider,
    
    // Provider status
    getProviderStatus,
    
    // JSSIP integration
    setJssipUA,
    setJssipSession,
    
    // LiveKit integration (passthrough)
    liveKitSIP,
  };
}

export default useHybridSIP;
