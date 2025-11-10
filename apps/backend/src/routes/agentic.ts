import axios from 'axios'
import type { Lead, ApiStatus, Campaign, CsvFile, CsvPreview, CampaignData } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.NEXT_PUBLIC_API_BASE || window.location.origin,
  timeout: 30000,
})

// Add request/response interceptors for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers
    })
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    })
    return response
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    })
    return Promise.reject(error)
  }
)

// Status and Control APIs
export const getStatus = async (): Promise<ApiStatus> => {
  const response = await api.get('/api/status')
  return response.data
}

export const selectCampaign = async (campaign: string | null) => {
  const formData = new FormData()
  if (campaign) formData.append('campaign', campaign)
  const response = await api.post('/api/select_campaign', formData)
  return response.data
}

export const startCall = async (leadIndex: number, campaign?: string) => {
  const formData = new FormData()
  formData.append('lead_global_index', leadIndex.toString())
  if (campaign) formData.append('campaign', campaign)
  const response = await api.post('/api/start_call', formData)
  return response.data
}

export const endCall = async (autoNext = true) => {
  console.log('endCall API called with autoNext:', autoNext)
  const formData = new FormData()
  formData.append('auto_next', autoNext.toString())
  console.log('Sending FormData with auto_next:', autoNext.toString())
  const response = await api.post('/api/end_call', formData)
  console.log('endCall API response:', response.data)
  return response.data
}

export const setAutoNext = async (enabled: boolean) => {
  const formData = new FormData()
  formData.append('enabled', enabled.toString())
  const response = await api.post('/api/auto_next', formData)
  return response.data
}

export const stopAll = async () => {
  console.log('stopAll API called')
  const response = await api.post('/api/stop_all', {})
  console.log('stopAll API response:', response.data)
  return response.data
}

// CSV Management APIs
export const getCsvList = async (): Promise<{ files: CsvFile[] }> => {
  const response = await api.get('/api/csv/list')
  return response.data
}

export const uploadCsv = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/csv/upload', formData)
  return response.data
}

export const selectCsv = async (name: string) => {
  const formData = new FormData()
  formData.append('name', name)
  const response = await api.post('/api/csv/select', formData)
  return response.data
}

export const deleteCsv = async (name: string) => {
  const response = await api.delete(`/api/csv/${encodeURIComponent(name)}`)
  return response.data
}

export const previewCsv = async (name: string, limit = 10): Promise<CsvPreview> => {
  const response = await api.get(`/api/csv/preview?name=${encodeURIComponent(name)}&limit=${limit}`)
  return response.data
}

export const downloadCsv = (name: string) => {
  return `/api/csv/download/${encodeURIComponent(name)}`
}

// Campaigns APIs
export const getCampaignsList = async (): Promise<{ builtin: CampaignData[], custom: CampaignData[] }> => {
  const response = await api.get('/api/campaigns/list')
  return response.data
}

export const createCampaign = async (name: string, module: string, agentText: string, sessionText: string) => {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('module', module)
  formData.append('agent_text', agentText)
  formData.append('session_text', sessionText)
  const response = await api.post('/api/campaigns/create', formData)
  return response.data
}

export const getCampaign = async (module: string) => {
  const response = await api.get(`/api/campaigns/get?module=${encodeURIComponent(module)}`)
  return response.data
}

export const updateCampaign = async (module: string, name: string, agentText: string, sessionText: string) => {
  const formData = new FormData()
  formData.append('module', module)
  formData.append('name', name)
  formData.append('agent_text', agentText)
  formData.append('session_text', sessionText)
  const response = await api.post('/api/campaigns/update', formData)
  return response.data
}

export const deleteCampaign = async (module: string) => {
  const response = await api.delete(`/api/campaigns/${encodeURIComponent(module)}`)
  return response.data
}

export const uploadPrompts = async (which: 'agent' | 'session', file: File) => {
  const formData = new FormData()
  formData.append('which', which)
  formData.append('file', file)
  const response = await api.post('/api/campaigns/upload_prompts', formData)
  return response.data
}

export const seedSupabase = async () => {
  const response = await api.post('/api/campaigns/seed_supabase', {})
  return response.data
}

// New APIs needed for React frontend
export const getLeads = async (page = 1): Promise<{ 
  leads: Lead[], 
  page: number, 
  total_pages: number, 
  start_index: number, 
  total_leads: number 
}> => {
  const response = await api.get(`/api/leads?page=${page}`)
  return response.data
}

export const getCampaigns = async (): Promise<{ campaigns: Campaign[] }> => {
  const response = await api.get('/api/campaigns')
  return response.data
}