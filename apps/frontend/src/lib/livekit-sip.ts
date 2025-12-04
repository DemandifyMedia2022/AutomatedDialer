/**
 * LiveKit SIP Integration Service
 * Provides SIP trunk functionality using LiveKit Cloud SIP
 */

export interface LiveKitSIPConfig {
  apiKey: string;
  apiSecret: string;
  projectId: string;
  sipTrunkId?: string;
  region?: string;
}

export interface SIPCallOptions {
  destination: string;
  source: string;
  record?: boolean;
  dispatchRule?: string;
  metadata?: Record<string, any>;
}

export interface SIPCall {
  id: string;
  roomName: string;
  participantIdentity: string;
  status: 'dialing' | 'ringing' | 'connected' | 'ended' | 'failed';
  startTime: Date;
  endTime?: Date;
  direction: 'inbound' | 'outbound';
  destination: string;
  source: string;
  metadata?: Record<string, any>;
}

export class LiveKitSIPService {
  private config: LiveKitSIPConfig;
  private baseUrl: string;
  private activeCalls: Map<string, SIPCall> = new Map();

  constructor(config: LiveKitSIPConfig) {
    this.config = config;
    // Use the correct LiveKit Cloud API URL
    this.baseUrl = `https://cloud.livekit.io`;
  }

  /**
   * Create an outbound SIP call using LiveKit
   */
  async createOutboundCall(options: SIPCallOptions): Promise<SIPCall> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const roomName = `room_${callId}`;
    const participantIdentity = `agent_${options.source}_${Date.now()}`;

    const call: SIPCall = {
      id: callId,
      roomName,
      participantIdentity,
      status: 'dialing',
      startTime: new Date(),
      direction: 'outbound',
      destination: options.destination,
      source: options.source,
      metadata: options.metadata
    };

    this.activeCalls.set(callId, call);

    try {
      // For now, simulate the call creation since LiveKit SIP API requires server-side implementation
      // In production, this should be handled by your backend
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update call status to ringing
      call.status = 'ringing';
      this.activeCalls.set(callId, call);

      // Simulate connection after another delay
      setTimeout(() => {
        call.status = 'connected';
        this.activeCalls.set(callId, call);
      }, 2000);

      return call;
    } catch (error) {
      call.status = 'failed';
      this.activeCalls.set(callId, call);
      throw error;
    }
  }

  /**
   * Get status of an active call
   */
  async getCallStatus(callId: string): Promise<SIPCall | null> {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    // For now, return the current status from our local state
    // In production, this would query the LiveKit API
    return call;
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call) return false;

    try {
      // For now, just update the local state
      // In production, this would call the LiveKit API to end the call
      call.status = 'ended';
      call.endTime = new Date();
      this.activeCalls.set(callId, call);
      return true;
    } catch (error) {
      console.error('Failed to end call:', error);
      return false;
    }
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): SIPCall[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Generate JWT for LiveKit API authentication
   * Note: In production, this should be generated server-side
   */
  private generateJWT(): string {
    const payload = {
      iss: this.config.apiKey,
      sub: this.config.projectId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      video: {
        roomCreate: true,
        roomAdmin: true,
        roomJoin: true,
        roomList: true,
        sipDial: true,
        sipAdmin: true
      }
    };

    // For client-side, we'll use a simple base64 encoding
    // In production, this should be generated server-side
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // Note: This is not secure for production - use server-side JWT signing
    const signature = btoa(`${encodedHeader}.${encodedPayload}.${this.config.apiSecret}`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Map LiveKit status to our internal status
   */
  private mapLiveKitStatus(livekitStatus: string): SIPCall['status'] {
    switch (livekitStatus.toLowerCase()) {
      case 'dialing':
        return 'dialing';
      case 'ringing':
        return 'ringing';
      case 'connected':
      case 'answered':
        return 'connected';
      case 'ended':
      case 'completed':
        return 'ended';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'dialing';
    }
  }

  /**
   * Create SIP trunk configuration for LiveKit
   */
  async createSIPTrunk(config: {
    name: string;
    address: string;
    numbers: string[];
    authUsername?: string;
    authPassword?: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/sip/trunks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.generateJWT()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.name,
          address: config.address,
          numbers: config.numbers,
          authUsername: config.authUsername,
          authPassword: config.authPassword,
          direction: 'outbound'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create SIP trunk: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create SIP trunk:', error);
      throw error;
    }
  }

  /**
   * Create dispatch rule for inbound calls
   */
  async createDispatchRule(config: {
    name: string;
    roomPrefix: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/sip/dispatch-rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.generateJWT()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.name,
          rule: {
            dispatchRuleIndividual: {
              roomPrefix: config.roomPrefix
            }
          },
          metadata: config.metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create dispatch rule: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create dispatch rule:', error);
      throw error;
    }
  }
}

export default LiveKitSIPService;
