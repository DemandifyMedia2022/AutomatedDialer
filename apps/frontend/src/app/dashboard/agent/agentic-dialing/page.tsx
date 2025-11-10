"use client"

import { useState } from 'react'
import { useApiStatus } from '@/hooks/agentic/useApiStatus'
import CampaignSelector from '@/components/agentic/CampaignSelector'
import StatusPanel from '@/components/agentic/StatusPanel'
import CurrentCallCard from '@/components/agentic/CurrentCallCard'
import LeadsTable from '@/components/agentic/LeadsTable'

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const { status, refreshStatus } = useApiStatus()

  const handleCallStart = () => {
    // Refresh status when a call starts
    setTimeout(refreshStatus, 300)
  }

  const handleCallEnd = () => {
    // Refresh status when a call ends
    setTimeout(refreshStatus, 500)
  }

  return (
    <div className="space-y-6">
      <CampaignSelector 
        selectedCampaign={selectedCampaign}
        onCampaignChange={setSelectedCampaign}
      />
      
      <StatusPanel 
        onEndCall={handleCallEnd}
        onStopAll={handleCallEnd}
      />
      
      {status.running && status.lead && (
        <CurrentCallCard 
          lead={status.lead}
          campaign={status.campaign_label || selectedCampaign}
          status={status.status}
        />
      )}
      
      <LeadsTable
        currentPage={currentPage}
        selectedCampaign={selectedCampaign}
        onPageChange={setCurrentPage}
        onCallStart={handleCallStart}
      />
    </div>
  )
}