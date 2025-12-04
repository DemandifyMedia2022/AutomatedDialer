/**
 * LiveKit Configuration and Environment Variables
 */

export interface LiveKitConfig {
  // LiveKit Cloud Configuration
  apiKey: string;
  apiSecret: string;
  projectId: string;
  region?: string;
  
  // SIP Configuration
  sipTrunkId?: string;
  sipEndpoint?: string;
  
  // WebSocket Configuration
  websocketUrl?: string;
  
  // Feature Flags
  enableLiveKitSIP?: boolean;
  enableRecording?: boolean;
  enableTranscription?: boolean;
}

/**
 * Get LiveKit configuration from environment variables
 */
export function getLiveKitConfig(): LiveKitConfig {
  return {
    // LiveKit Cloud credentials (should be in .env.local)
    apiKey: process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '', // Server-side only
    projectId: process.env.NEXT_PUBLIC_LIVEKIT_PROJECT_ID || '',
    region: process.env.NEXT_PUBLIC_LIVEKIT_REGION || 'us-east-1',
    
    // SIP Configuration
    sipTrunkId: process.env.LIVEKIT_SIP_TRUNK_ID || '',
    sipEndpoint: process.env.LEXT_PUBLIC_LIVEKIT_SIP_ENDPOINT || '',
    
    // WebSocket URL for LiveKit rooms
    websocketUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || '',
    
    // Feature flags
    enableLiveKitSIP: process.env.NEXT_PUBLIC_ENABLE_LIVEKIT_SIP === 'true',
    enableRecording: process.env.NEXT_PUBLIC_LIVEKIT_ENABLE_RECORDING !== 'false',
    enableTranscription: process.env.NEXT_PUBLIC_LIVEKIT_ENABLE_TRANSCRIPTION !== 'false',
  };
}

/**
 * Validate LiveKit configuration
 */
export function validateLiveKitConfig(config: LiveKitConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.apiKey) {
    errors.push('LiveKit API Key is required');
  }
  
  if (!config.projectId) {
    errors.push('LiveKit Project ID is required');
  }
  
  // Note: apiSecret is server-side only, so we don't validate it here
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Example environment variables for .env.local:
 * 
 * # LiveKit Cloud Configuration
 * NEXT_PUBLIC_LIVEKIT_API_KEY=your_livekit_api_key
 * LIVEKIT_API_SECRET=your_livekit_api_secret
 * NEXT_PUBLIC_LIVEKIT_PROJECT_ID=your_project_id
 * NEXT_PUBLIC_LIVEKIT_REGION=us-east-1
 * 
 * # SIP Configuration
 * LIVEKIT_SIP_TRUNK_ID=your_sip_trunk_id
 * NEXT_PUBLIC_LIVEKIT_SIP_ENDPOINT=your_sip_endpoint.livekit.cloud
 * 
 * # WebSocket Configuration
 * NEXT_PUBLIC_LIVEKIT_WS_URL=wss://your-project.livekit.cloud
 * 
 * # Feature Flags
 * NEXT_PUBLIC_ENABLE_LIVEKIT_SIP=true
 * NEXT_PUBLIC_LIVEKIT_ENABLE_RECORDING=true
 * NEXT_PUBLIC_LIVEKIT_ENABLE_TRANSCRIPTION=true
 */

export default getLiveKitConfig;
