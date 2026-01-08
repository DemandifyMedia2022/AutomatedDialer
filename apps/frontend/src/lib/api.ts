import axios from 'axios'

import type { Lead, ApiStatus, Campaign, CsvFile, CsvPreview, CampaignData } from '@/types/agentic'

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
})

export { api } // Exporting it as a named export


// Status and Control APIs
export const getStatus = async (): Promise<ApiStatus> => {
  const { data } = await api.get('/api/status')
  return data
}

export const selectCampaign = async (campaign: string | null) => {
  const formData = new FormData()
  if (campaign) formData.append('campaign', campaign)
  const { data } = await api.post('/api/select_campaign', formData)
  return data
}

export const startCall = async (leadIndex: number, campaign?: string) => {
  const formData = new FormData()
  formData.append('lead_global_index', leadIndex.toString())
  if (campaign) formData.append('campaign', campaign)
  const { data } = await api.post('/api/start_call', formData)
  return data
}

export const endCall = async (autoNext = true) => {
  const formData = new FormData()
  formData.append('auto_next', autoNext.toString())
  const { data } = await api.post('/api/end_call', formData)
  return data
}

export const setAutoNext = async (enabled: boolean) => {
  const formData = new FormData()
  formData.append('enabled', enabled.toString())
  const { data } = await api.post('/api/auto_next', formData)
  return data
}

export const stopAll = async () => {
  const { data } = await api.post('/api/stop_all', {})
  return data
}

// CSV Management APIs
export const getCsvList = async (): Promise<{ files: CsvFile[] }> => {
  const { data } = await api.get('/api/csv/list')
  return data
}

export const uploadCsv = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/api/csv/upload', formData)
  return data
}

export const selectCsv = async (name: string) => {
  const formData = new FormData()
  formData.append('name', name)
  const { data } = await api.post('/api/csv/select', formData)
  return data
}

export const deleteCsv = async (name: string) => {
  const { data } = await api.delete(`/api/csv/${encodeURIComponent(name)}`)
  return data
}

export const previewCsv = async (name: string, limit = 10): Promise<CsvPreview> => {
  const { data } = await api.get(`/api/csv/preview?name=${encodeURIComponent(name)}&limit=${limit}`)
  return data
}

export const downloadCsv = (name: string) => {
  return `${API_BASE}/api/csv/download/${encodeURIComponent(name)}`
}

// Campaigns APIs
export const getCampaignsList = async (): Promise<{ builtin: CampaignData[], custom: CampaignData[] }> => {
  const { data } = await api.get('/api/campaigns/list')
  return data
}

export const createCampaign = async (name: string, module: string, agentText: string, sessionText: string) => {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('module', module)
  formData.append('agent_text', agentText)
  formData.append('session_text', sessionText)
  const { data } = await api.post('/api/campaigns/create', formData)
  return data
}

export const getCampaign = async (module: string) => {
  const { data } = await api.get(`/api/campaigns/get?module=${encodeURIComponent(module)}`)
  return data
}

export const updateCampaign = async (module: string, name: string, agentText: string, sessionText: string) => {
  const formData = new FormData()
  formData.append('module', module)
  formData.append('name', name)
  formData.append('agent_text', agentText)
  formData.append('session_text', sessionText)
  const { data } = await api.post('/api/campaigns/update', formData)
  return data
}

export const deleteCampaign = async (module: string) => {
  const { data } = await api.delete(`/api/campaigns/${encodeURIComponent(module)}`)
  return data
}

export const uploadPrompts = async (which: 'agent' | 'session', file: File) => {
  const formData = new FormData()
  formData.append('which', which)
  formData.append('file', file)
  const { data } = await api.post('/api/campaigns/upload_prompts', formData)
  return data
}

export const seedSupabase = async () => {
  const { data } = await api.post('/api/campaigns/seed_supabase', {})
  return data
}

// New APIs needed for React frontend
export const getLeads = async (page = 1): Promise<{
  leads: Lead[],
  page: number,
  total_pages: number,
  start_index: number,
  total_leads: number
}> => {
  const { data } = await api.get(`/api/leads?page=${page}`)
  return data
}

export const getCallTranscription = async (callId: number) => {
  const { data } = await api.get(`/api/transcription/call/${callId}`)
  return data
}

export const getCampaigns = async (): Promise<{ campaigns: Campaign[] }> => {
  const { data } = await api.get('/api/campaigns')
  return data
}
