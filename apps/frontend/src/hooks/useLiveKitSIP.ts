/**
 * LiveKit React Hook for SIP Integration
 * Provides a hook to use LiveKit SIP functionality in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveKitSIPService, SIPCall, SIPCallOptions } from '@/lib/livekit-sip';
import { getLiveKitConfig } from '@/lib/livekit-config';

export interface UseLiveKitSIPState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  activeCalls: SIPCall[];
  currentCall: SIPCall | null;
}

export interface UseLiveKitSIPActions {
  createCall: (options: SIPCallOptions) => Promise<SIPCall>;
  endCall: (callId: string) => Promise<boolean>;
  getCallStatus: (callId: string) => Promise<SIPCall | null>;
  clearError: () => void;
  disconnect: () => void;
}

export function useLiveKitSIP(): UseLiveKitSIPState & UseLiveKitSIPActions {
  const [state, setState] = useState<UseLiveKitSIPState>({
    isConnected: false,
    isLoading: false,
    error: null,
    activeCalls: [],
    currentCall: null,
  });

  const liveKitServiceRef = useRef<LiveKitSIPService | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize LiveKit service
  useEffect(() => {
    const config = getLiveKitConfig();
    
    if (config.enableLiveKitSIP && config.apiKey && config.projectId) {
      try {
        liveKitServiceRef.current = new LiveKitSIPService({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          projectId: config.projectId,
          region: config.region,
          sipTrunkId: config.sipTrunkId,
        });

        setState(prev => ({ ...prev, isConnected: true }));
      } catch (error) {
        console.error('Failed to initialize LiveKit SIP service:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize LiveKit SIP service'
        }));
      }
    } else {
      setState(prev => ({
        ...prev,
        error: config.enableLiveKitSIP 
          ? 'LiveKit SIP is enabled but configuration is incomplete'
          : null
      }));
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for call status updates
  useEffect(() => {
    if (state.activeCalls.length > 0 && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => {
        state.activeCalls.forEach(async (call) => {
          if (call.status === 'connected' || call.status === 'ringing' || call.status === 'dialing') {
            await updateCallStatus(call.id);
          }
        });
      }, 2000); // Poll every 2 seconds
    } else if (state.activeCalls.length === 0 && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [state.activeCalls]);

  const updateCallStatus = useCallback(async (callId: string) => {
    if (!liveKitServiceRef.current) return;

    try {
      const updatedCall = await liveKitServiceRef.current.getCallStatus(callId);
      if (updatedCall) {
        setState(prev => {
          const updatedCalls = prev.activeCalls.map(call =>
            call.id === callId ? updatedCall : call
          );
          
          return {
            ...prev,
            activeCalls: updatedCalls,
            currentCall: prev.currentCall?.id === callId ? updatedCall : prev.currentCall
          };
        });
      }
    } catch (error) {
      console.error('Failed to update call status:', error);
    }
  }, []);

  const createCall = useCallback(async (options: SIPCallOptions): Promise<SIPCall> => {
    if (!liveKitServiceRef.current) {
      throw new Error('LiveKit SIP service is not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const call = await liveKitServiceRef.current.createOutboundCall(options);
      
      setState(prev => ({
        ...prev,
        activeCalls: [...prev.activeCalls, call],
        currentCall: call,
        isLoading: false,
      }));

      return call;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create call';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const endCall = useCallback(async (callId: string): Promise<boolean> => {
    if (!liveKitServiceRef.current) {
      setState(prev => ({ ...prev, error: 'LiveKit SIP service is not initialized' }));
      return false;
    }

    try {
      const success = await liveKitServiceRef.current.endCall(callId);
      
      if (success) {
        setState(prev => {
          const updatedCalls = prev.activeCalls.filter(call => call.id !== callId);
          return {
            ...prev,
            activeCalls: updatedCalls,
            currentCall: prev.currentCall?.id === callId ? null : prev.currentCall,
          };
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end call';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const getCallStatus = useCallback(async (callId: string): Promise<SIPCall | null> => {
    if (!liveKitServiceRef.current) {
      setState(prev => ({ ...prev, error: 'LiveKit SIP service is not initialized' }));
      return null;
    }

    try {
      const call = await liveKitServiceRef.current.getCallStatus(callId);
      
      if (call) {
        setState(prev => {
          const updatedCalls = prev.activeCalls.map(c =>
            c.id === callId ? call : c
          );
          
          return {
            ...prev,
            activeCalls: updatedCalls,
            currentCall: prev.currentCall?.id === callId ? call : prev.currentCall,
          };
        });
      }

      return call;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get call status';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const disconnect = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    setState({
      isConnected: false,
      isLoading: false,
      error: null,
      activeCalls: [],
      currentCall: null,
    });
  }, []);

  return {
    ...state,
    createCall,
    endCall,
    getCallStatus,
    clearError,
    disconnect,
  };
}

export default useLiveKitSIP;
