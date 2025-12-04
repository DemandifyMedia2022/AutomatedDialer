# LiveKit SIP Integration - Environment Variables Template

# Copy this file to .env.local and fill in your actual values

# =============================================================================
# LIVEKIT CLOUD CONFIGURATION
# =============================================================================
# Get these from your LiveKit Cloud dashboard: https://cloud.livekit.io/projects/p_/settings/project

# Public API Key (safe for client-side)
NEXT_PUBLIC_LIVEKIT_API_KEY=your_livekit_api_key_here

# Secret API Key (server-side only - NEVER commit to version control)
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# Project ID from LiveKit Cloud
NEXT_PUBLIC_LIVEKIT_PROJECT_ID=your_project_id_here

# Region for optimal performance (optional)
NEXT_PUBLIC_LIVEKIT_REGION=us-east-1

# =============================================================================
# SIP TRUNK CONFIGURATION
# =============================================================================
# After setting up SIP trunk in LiveKit Cloud, get these values

# SIP Trunk ID (from LiveKit Cloud telephony configuration)
LIVEKIT_SIP_TRUNK_ID=your_sip_trunk_id_here

# SIP Endpoint (your LiveKit SIP URI without 'sip:' prefix)
# Example: vjnxecm0tjk.sip.livekit.cloud
NEXT_PUBLIC_LIVEKIT_SIP_ENDPOINT=your_sip_endpoint.livekit.cloud

# =============================================================================
# WEBSOCKET CONFIGURATION
# =============================================================================
# WebSocket URL for LiveKit rooms (optional - will be constructed if not provided)

# WebSocket URL for your LiveKit project
# Example: wss://your-project-id.livekit.cloud
NEXT_PUBLIC_LIVEKIT_WS_URL=wss://your-project-id.livekit.cloud

# =============================================================================
# FEATURE FLAGS
# =============================================================================
# Control which LiveKit features are enabled

# Enable LiveKit SIP integration (set to 'true' to enable)
NEXT_PUBLIC_ENABLE_LIVEKIT_SIP=true

# Enable call recording through LiveKit (set to 'false' to disable)
NEXT_PUBLIC_LIVEKIT_ENABLE_RECORDING=true

# Enable call transcription through LiveKit (set to 'false' to disable)
NEXT_PUBLIC_LIVEKIT_ENABLE_TRANSCRIPTION=true

# =============================================================================
# EXISTING CONFIGURATION (keep your existing variables)
# =============================================================================
# Your existing SIP configuration should remain unchanged

# Existing SIP WebSocket URL
SIP_WSS_URL=wss://your-existing-sip-provider.com

# Existing SIP domain
SIP_DOMAIN=your-existing-sip-domain.com

# STUN server for WebRTC
STUN_SERVER=stun:stun.l.google.com:19302

# =============================================================================
# SETUP INSTRUCTIONS
# =============================================================================

# 1. Get LiveKit Cloud Credentials:
#    - Sign up at https://livekit.io/cloud
#    - Create a new project or use existing one
#    - Go to Project Settings → API Keys
#    - Create a new API key with SIP permissions
#    - Copy the API key (public) and secret (private)

# 2. Set up SIP Trunk:
#    - Follow LiveKit's SIP trunk setup guide
#    - Create outbound trunk with your SIP provider
#    - Configure authentication (username/password or IP)
#    - Purchase and assign phone numbers
#    - Get the trunk ID from LiveKit Cloud

# 3. Configure Dispatch Rules (for inbound calls):
#    - Create dispatch rules in LiveKit Cloud
#    - Set up room prefixes and routing logic
#    - Configure metadata for call tracking

# 4. Test Configuration:
#    - Restart your development server
#    - Navigate to the enhanced dialer page
#    - Check provider status indicators
#    - Test both JSSIP and LiveKit calling

# =============================================================================
# SECURITY NOTES
# =============================================================================

# - NEVER commit LIVEKIT_API_SECRET to version control
# - Use different API keys for development and production
# - Regularly rotate your API secrets
# - Use IP restrictions where possible
# - Monitor API usage in LiveKit Cloud dashboard

# =============================================================================
# TROUBLESHOOTING
# =============================================================================

# If LiveKit integration doesn't work:
# 1. Verify all environment variables are set correctly
# 2. Check that NEXT_PUBLIC_ENABLE_LIVEKIT_SIP=true
# 3. Ensure your LiveKit project has SIP permissions
# 4. Verify SIP trunk is properly configured in LiveKit Cloud
# 5. Check browser console for JavaScript errors
# 6. Monitor network requests in browser dev tools

# Common issues:
# - "LiveKit SIP service is not initialized" → Check API keys and project ID
# - "Failed to create call" → Verify SIP trunk configuration
# - "Authentication failed" → Check API key permissions and secret
