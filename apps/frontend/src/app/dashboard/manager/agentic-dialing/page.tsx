"use client"

import { useState, useEffect } from 'react'
import { useApiStatus } from '@/hooks/agentic/useApiStatus'
import { useJSSIPForAgentic } from '@/hooks/agentic/useJSSIPForAgentic'
import { Button } from '@/components/ui/button'
import CampaignSelector from '@/components/agentic/CampaignSelector'
import StatusPanel from '@/components/agentic/StatusPanel'
import EnhancedCurrentCallCard from '@/components/agentic/EnhancedCurrentCallCard'
import LeadsTable from '@/components/agentic/LeadsTable'
import CsvManager from '@/components/agentic/CsvManager'

declare global {
  interface Window {
    JsSIP?: any
  }
}

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const { status, refreshStatus } = useApiStatus()
  const jssip = useJSSIPForAgentic()

  // Load JSSIP script manually
  useEffect(() => {
    const loadScript = () => {
      if (window.JsSIP) {
        console.log('[JSSIP] Already loaded')
        return
      }

      const script = document.createElement('script')
      script.src = '/js/jssip.min.js'
      script.async = false // Load synchronously to ensure it's available
      script.type = 'text/javascript'

      script.onload = () => {
        console.log('[JSSIP] Script loaded successfully')
        console.log('[JSSIP] JsSIP available:', !!window.JsSIP)
      }

      script.onerror = (error) => {
        console.error('[JSSIP] Failed to load script:', error)
      }

      // Add to head
      document.head.appendChild(script)

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    }

    // Load immediately
    loadScript()
  }, [])

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
      {/* JSSIP Status Indicator */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${jssip.isRegistered ? 'bg-green-500' :
              jssip.status === 'Connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
            }`} />
          <span className="text-sm font-medium">JSSIP:</span>
          <span className="text-sm text-muted-foreground">{jssip.status}</span>
        </div>

        {jssip.extension && (
          <div className="text-sm text-muted-foreground">
            Extension: {jssip.extension}@{jssip.domain}
          </div>
        )}

        {jssip.error && (
          <div className="text-sm text-red-600">
            Error: {jssip.error}
          </div>
        )}

        {/* Test Audio Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => jssip.testAudio?.()}
          className="ml-auto"
        >
          Test Audio
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CampaignSelector
          selectedCampaign={selectedCampaign}
          onCampaignChange={setSelectedCampaign}
        />
        <CsvManager />
      </div>

      <StatusPanel
        onEndCall={handleCallEnd}
        onStopAll={handleCallEnd}
      />

      {status.running && status.lead && (
        <EnhancedCurrentCallCard
          lead={status.lead}
          campaign={status.campaign_label || selectedCampaign}
          status={status.status}
          livekitCallId={status.livekit_call_id}
        />
      )}

      <LeadsTable
        currentPage={currentPage}
        selectedCampaign={selectedCampaign}
        onPageChange={setCurrentPage}
        onCallStart={handleCallStart}
        jssip={jssip}
      />
    </div>
  )
}