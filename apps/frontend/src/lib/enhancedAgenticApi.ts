/**
 * Enhanced Agentic API with LiveKit SIP Integration
 * Extends the existing agentic API with LiveKit SIP capabilities
 */

import axios from 'axios'
import { LiveKitSIPService } from '@/lib/livekit-sip'
import { getLiveKitConfig } from '@/lib/livekit-config'
import type { Lead, ApiStatus, Campaign, CsvFile, CsvPreview, CampaignData } from '@/types/agentic'

// Existing API configuration
const FALLBACK_BASE = `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/api/agentic`
export const AGENTIC_API_BASE = process.env.NEXT_PUBLIC_AGENTIC_API_BASE || FALLBACK_BASE

const agenticApi = axios.create({
  baseURL: AGENTIC_API_BASE,
  timeout: 30000,
})

// LiveKit SIP Service instance
let liveKitService: LiveKitSIPService | null = null

// Initialize LiveKit service
const initializeLiveKit = () => {
  if (!liveKitService) {
    const config = getLiveKitConfig()
    if (config.enableLiveKitSIP && config.apiKey && config.projectId) {
      liveKitService = new LiveKitSIPService({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        projectId: config.projectId,
        region: config.region,
        sipTrunkId: config.sipTrunkId,
      })
    }
  }
  return liveKitService
}

// Enhanced API functions with LiveKit integration
export const getStatus = async (): Promise<ApiStatus> => {
  try {
    const { data } = await agenticApi.get('/status')
    
    // If LiveKit is enabled, merge LiveKit call status
    const liveKitService = initializeLiveKit()
    if (liveKitService) {
      const liveKitCalls = liveKitService.getActiveCalls()
      if (liveKitCalls.length > 0) {
        // Merge LiveKit call status with existing status
        const activeCall = liveKitCalls[0]
        return {
          ...data,
          status: activeCall.status === 'connected' ? 'running' : activeCall.status,
          running: activeCall.status === 'connected',
          lead: data.lead || {
            prospect_name: 'LiveKit Call',
            company_name: 'LiveKit SIP',
            phone: activeCall.destination,
            email: '',
            job_title: '',
            timezone: '',
          },
          campaign: 'livekit-sip',
          campaign_label: 'LiveKit SIP',
          livekit_call_id: activeCall.id,
        }
      }
    }
    
    return data
  } catch (error) {
    console.error('Failed to get status:', error)
    return {
      status: 'idle',
      running: false,
      lead_index: null,
      campaign: null,
      campaign_label: null,
      auto_next: false,
      lead: null
    }
  }
}

export const startCall = async (leadIndex: number, campaign?: string) => {
  // Try JSSIP first if registered
  if (typeof window !== 'undefined' && window.JsSIP) {
    try {
      // Import the hook to check JSSIP status
      const { useJSSIPForAgentic } = await import('@/hooks/agentic/useJSSIPForAgentic')
      // Note: We can't use hooks outside components, so we'll check for JSSIP UA directly
      
      // Check if there's an active JSSIP User Agent (this would need to be stored globally)
      // For now, let's try LiveKit first and implement JSSIP integration separately
    } catch (error) {
      console.log('[Enhanced API] JSSIP check failed, falling back to LiveKit')
    }
  }

  // Try LiveKit if JSSIP is not available
  const liveKitService = initializeLiveKit()
  if (liveKitService) {
    try {
      // Get lead information
      const leadsResponse = await getLeads(Math.floor(leadIndex / 10) + 1)
      const leadIndexInPage = leadIndex % 10
      const lead = leadsResponse.leads[leadIndexInPage]
      
      if (lead && lead.phone) {
        const destination = lead.phone.startsWith('+') ? lead.phone : lead.phone
        
        const call = await liveKitService.createOutboundCall({
          destination,
          source: 'agentic-dialer',
          record: true,
          metadata: {
            leadIndex: leadIndex.toString(),
            campaign: campaign || 'default',
            prospectName: lead.prospect_name,
            companyName: lead.company_name,
          }
        })
        
        console.log('[LiveKit] Call initiated:', call.id)
        
        return {
          success: true,
          call_id: call.id,
          provider: 'livekit',
          message: 'LiveKit call initiated'
        }
      }
    } catch (error) {
      console.error('LiveKit call failed, falling back to agentic API:', error)
      // Fall through to original API
    }
  }
  
  // Try JSSIP if available (check if JSSIP is registered)
  try {
    const jssipStatus = await checkJSSIPStatus()
    if (jssipStatus.isRegistered) {
      const leadsResponse = await getLeads(Math.floor(leadIndex / 10) + 1)
      const leadIndexInPage = leadIndex % 10
      const lead = leadsResponse.leads[leadIndexInPage]
      
      if (lead && lead.phone) {
        console.log('[JSSIP] Making call via JSSIP for:', lead.phone)
        // Note: This would need to be handled by the JSSIP hook in the component
        // For now, fall through to original API
      }
    }
  } catch (error) {
    console.log('JSSIP not available, using original API')
  }
  
  // Fallback to original agentic API
  const formData = new FormData()
  formData.append('lead_global_index', leadIndex.toString())
  if (campaign) formData.append('campaign', campaign)
  const { data } = await agenticApi.post('/start_call', formData)
  return data
}

// Helper function to check JSSIP status
const checkJSSIPStatus = async () => {
  try {
    // This would typically be handled by the hook, but for API checking we'll simulate
    return { isRegistered: true, extension: 'unknown' }
  } catch {
    return { isRegistered: false, extension: '' }
  }
}

export const endCall = async (autoNext = true) => {
  // Try to end LiveKit call first
  const liveKitService = initializeLiveKit()
  if (liveKitService) {
    const activeCalls = liveKitService.getActiveCalls()
    for (const call of activeCalls) {
      try {
        await liveKitService.endCall(call.id)
      } catch (error) {
        console.error('Failed to end LiveKit call:', error)
      }
    }
  }
  
  // Also call original API
  const formData = new FormData()
  formData.append('auto_next', autoNext.toString())
  const { data } = await agenticApi.post('/end_call', formData)
  return data
}

export const stopAll = async () => {
  // End all LiveKit calls
  const liveKitService = initializeLiveKit()
  if (liveKitService) {
    const activeCalls = liveKitService.getActiveCalls()
    await Promise.all(
      activeCalls.map(call => liveKitService.endCall(call.id))
    )
  }
  
  // Also call original API
  const { data } = await agenticApi.post('/stop_all', {})
  return data
}

// LiveKit-specific API functions
export const getLiveKitCallStatus = async (callId: string) => {
  const liveKitService = initializeLiveKit()
  if (!liveKitService) {
    throw new Error('LiveKit service not initialized')
  }
  
  return await liveKitService.getCallStatus(callId)
}

export const endLiveKitCall = async (callId: string) => {
  const liveKitService = initializeLiveKit()
  if (!liveKitService) {
    throw new Error('LiveKit service not initialized')
  }
  
  return await liveKitService.endCall(callId)
}

export const getLiveKitActiveCalls = () => {
  const liveKitService = initializeLiveKit()
  if (!liveKitService) {
    return []
  }
  
  return liveKitService.getActiveCalls()
}

// All other existing API functions remain unchanged
export const selectCampaign = async (campaign: string | null) => {
  const formData = new FormData()
  if (campaign) formData.append('campaign', campaign)
  const { data } = await agenticApi.post('/select_campaign', formData)
  return data
}

export const setAutoNext = async (enabled: boolean) => {
  const formData = new FormData()
  formData.append('enabled', enabled.toString())
  const { data } = await agenticApi.post('/auto_next', formData)
  return data
}

export const getCsvList = async (): Promise<{ files: CsvFile[] }> => {
  const { data } = await agenticApi.get('/csv/list')
  return data
}

export const uploadCsv = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await agenticApi.post('/csv/upload', formData)
  return data
}

export const selectCsv = async (name: string) => {
  const formData = new FormData()
  formData.append('name', name)
  const { data } = await agenticApi.post('/csv/select', formData)
  return data
}

export const deleteCsv = async (name: string) => {
  const { data } = await agenticApi.delete(`/csv/${encodeURIComponent(name)}`)
  return data
}

export const previewCsv = async (name: string, limit = 10): Promise<CsvPreview> => {
  const { data } = await agenticApi.get(`/csv/preview?name=${encodeURIComponent(name)}&limit=${limit}`)
  return data
}

export const downloadCsv = (name: string) => {
  return `${AGENTIC_API_BASE}/csv/download/${encodeURIComponent(name)}`
}

export const getCampaignsList = async (): Promise<{ builtin: CampaignData[], custom: CampaignData[] }> => {
  const { data } = await agenticApi.get('/campaigns/list')
  return data
}

export const createCampaign = async (name: string, module: string, agentText: string, sessionText: string) => {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('module', module)
  formData.append('agent_text', agentText)
  formData.append('session_text', sessionText)
  const { data } = await agenticApi.post('/campaigns/create', formData)
  return data
}

export const getCampaign = async (module: string) => {
  const { data } = await agenticApi.get(`/campaigns/get?module=${encodeURIComponent(module)}`)
  return data
}

export const updateCampaign = async (module: string, name: string, agentText: string, sessionText: string) => {
  const formData = new FormData()
  formData.append('module', module)
  formData.append('name', name)
  formData.append('agent_text', agentText)
  formData.append('session_text', sessionText)
  const { data } = await agenticApi.post('/campaigns/update', formData)
  return data
}

export const deleteCampaign = async (module: string) => {
  const { data } = await agenticApi.delete(`/campaigns/${encodeURIComponent(module)}`)
  return data
}

export const uploadPrompts = async (which: 'agent' | 'session', file: File) => {
  const formData = new FormData()
  formData.append('which', which)
  formData.append('file', file)
  const { data } = await agenticApi.post('/campaigns/upload_prompts', formData)
  return data
}

export const seedSupabase = async () => {
  const { data } = await agenticApi.post('/campaigns/seed_supabase', {})
  return data
}

export const getLeads = async (page = 1): Promise<{
  leads: Lead[],
  page: number,
  total_pages: number,
  start_index: number,
  total_leads: number
}> => {
  const { data } = await agenticApi.get(`/leads?page=${page}`)
  return data
}

export const getCampaigns = async (): Promise<{ campaigns: Campaign[] }> => {
  const { data } = await agenticApi.get('/campaigns')
  return data
}
