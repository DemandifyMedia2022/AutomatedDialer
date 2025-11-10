export interface Lead {
  prospect_name: string
  resource_name?: string
  job_title: string
  company_name: string
  email: string
  phone: string
  timezone?: string
}

export interface ApiStatus {
  status: 'idle' | 'calling' | 'ended' | string
  running: boolean
  lead_index: number | null
  campaign: string | null
  campaign_label: string | null
  auto_next: boolean
  lead: Lead | null
}

export interface Campaign {
  key: string
  label: string
}

export interface CsvFile {
  name: string
  size: number
  mtime: number
  active: boolean
}

export interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
  total: number
}

export interface CampaignData {
  name: string
  module: string
  agent_attr?: string
  session_attr?: string
  label?: string
}
