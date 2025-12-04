# LiveKit SIP Integration for Automated Dialer

This document outlines the LiveKit SIP trunk integration that has been added to your existing JSSIP/WebRTC automated dialer system.

## Overview

The integration provides a hybrid approach that maintains your existing JSSIP functionality while adding LiveKit SIP capabilities for enhanced features like:
- Cloud-based SIP trunking
- Better reliability and scalability
- Built-in recording and transcription
- Advanced call routing and dispatch rules

## Architecture

### Components Added

1. **LiveKit SIP Service** (`/lib/livekit-sip.ts`)
   - Core LiveKit API integration
   - Call management (create, end, status)
   - SIP trunk and dispatch rule creation

2. **LiveKit Configuration** (`/lib/livekit-config.ts`)
   - Environment variable management
   - Configuration validation
   - Feature flags

3. **React Hook** (`/hooks/useLiveKitSIP.ts`)
   - React state management for LiveKit calls
   - Real-time call status polling
   - Error handling

4. **Hybrid SIP Provider** (`/hooks/useHybridSIP.ts`)
   - Manages both JSSIP and LiveKit connections
   - Seamless provider switching
   - Unified call session management

5. **Enhanced Dialer Interface** (`/dashboard/agent/dialer/enhanced-manual/page.tsx`)
   - Updated UI with provider selection
   - Status indicators for both providers
   - Configuration panel

## Setup Instructions

### 1. LiveKit Cloud Setup

Follow the LiveKit documentation to set up your SIP trunk:

1. **Create a SIP Trunk** in your LiveKit Cloud project
2. **Configure authentication** (username/password or IP-based)
3. **Purchase phone numbers** and associate with trunk
4. **Add LiveKit SIP endpoint** to your trunk configuration

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# LiveKit Cloud Configuration
NEXT_PUBLIC_LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_PROJECT_ID=your_project_id
NEXT_PUBLIC_LIVEKIT_REGION=us-east-1

# SIP Configuration
LIVEKIT_SIP_TRUNK_ID=your_sip_trunk_id
NEXT_PUBLIC_LIVEKIT_SIP_ENDPOINT=your_sip_endpoint.livekit.cloud

# WebSocket Configuration
NEXT_PUBLIC_LIVEKIT_WS_URL=wss://your-project.livekit.cloud

# Feature Flags
NEXT_PUBLIC_ENABLE_LIVEKIT_SIP=true
NEXT_PUBLIC_LIVEKIT_ENABLE_RECORDING=true
NEXT_PUBLIC_LIVEKIT_ENABLE_TRANSCRIPTION=true
```

### 3. Package Dependencies

The integration uses existing packages in your project:
- `jsonwebtoken` (server-side) - for JWT signing
- Your existing `socket.io-client` for real-time updates

### 4. Backend Integration

You'll need to add LiveKit SIP endpoints to your backend:

```typescript
// In your backend routes (e.g., routes/index.ts)
router.post('/livekit/sip/call', requireAuth, async (req, res) => {
  // Handle LiveKit SIP call creation
});

router.delete('/livekit/sip/call/:id', requireAuth, async (req, res) => {
  // Handle LiveKit SIP call termination
});
```

## Usage

### Provider Selection

Users can choose between:
- **JSSIP**: Your existing SIP/WebRTC implementation
- **LiveKit SIP**: New cloud-based SIP trunking

### Enhanced Features

1. **Dual Provider Support**: Switch between JSSIP and LiveKit
2. **Real-time Status**: Live call status for both providers
3. **Automatic Failover**: Can implement fallback logic
4. **Unified Interface**: Single UI for both calling methods

### Call Flow

1. User selects provider (JSSIP or LiveKit)
2. Enters phone number and clicks "Call"
3. System routes call through selected provider
4. Real-time status updates shown in UI
5. Call recording and transcription (if enabled)

## API Integration

### LiveKit SIP Service Example

```typescript
import { LiveKitSIPService } from '@/lib/livekit-sip';

const liveKitService = new LiveKitSIPService({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  projectId: 'your-project-id',
  sipTrunkId: 'your-sip-trunk-id'
});

// Create outbound call
const call = await liveKitService.createOutboundCall({
  destination: '+1234567890',
  source: 'extension-100',
  record: true,
  metadata: { agentId: '123', campaign: 'sales' }
});

// Get call status
const status = await liveKitService.getCallStatus(call.id);

// End call
await liveKitService.endCall(call.id);
```

## Migration Strategy

### Phase 1: Parallel Operation
- Deploy LiveKit integration alongside existing JSSIP
- Users can switch between providers
- Test LiveKit reliability and features

### Phase 2: Gradual Migration
- Default to LiveKit for new campaigns
- Keep JSSIP for existing campaigns
- Monitor performance and user feedback

### Phase 3: Full Migration (Optional)
- Switch entirely to LiveKit if beneficial
- Remove JSSIP dependencies
- Simplify codebase

## Benefits of LiveKit Integration

1. **Reliability**: Cloud-based infrastructure
2. **Scalability**: Handle more concurrent calls
3. **Features**: Built-in recording, transcription, AI
4. **Maintenance**: Less infrastructure to manage
5. **Global Reach**: Multi-region support

## Troubleshooting

### Common Issues

1. **Configuration Errors**: Check environment variables
2. **Authentication**: Verify API keys and secrets
3. **Network**: Check firewall and CORS settings
4. **SIP Trunk**: Ensure trunk is properly configured

### Debug Mode

Enable debug logging:
```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('LiveKit Config:', getLiveKitConfig());
}
```

## Security Considerations

1. **API Keys**: Store securely, never expose in client-side code
2. **JWT Tokens**: Use proper expiration and signing
3. **CORS**: Configure properly in LiveKit Cloud
4. **Authentication**: Validate all API calls

## Performance Optimization

1. **Connection Pooling**: Reuse LiveKit connections
2. **Status Polling**: Optimize polling intervals
3. **Error Handling**: Implement retry logic
4. **Caching**: Cache provider status and configuration

## Next Steps

1. Set up LiveKit Cloud account and SIP trunk
2. Configure environment variables
3. Test integration with your existing campaigns
4. Monitor performance and gather feedback
5. Plan migration strategy based on results

## Support

For issues:
1. Check LiveKit Cloud documentation
2. Review your SIP trunk configuration
3. Verify environment variables
4. Check browser console for JavaScript errors
5. Monitor backend logs for API errors
