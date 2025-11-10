import { useState } from 'react'
import { useApiStatus } from '@/hooks/agentic/useApiStatus'
import { endCall, setAutoNext, stopAll } from '@/lib/agenticApi'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface StatusPanelProps {
  onEndCall?: () => void
  onStopAll?: () => void
}

export default function StatusPanel({ onEndCall, onStopAll }: StatusPanelProps) {
  const { status } = useApiStatus()
  const { toast } = useToast()
  const [isEndingCall, setIsEndingCall] = useState(false)
  const [isStoppingAll, setIsStoppingAll] = useState(false)

  const handleEndCall = async () => {
    if (isEndingCall) return
    setIsEndingCall(true)
    console.log('Attempting to end call with auto_next:', status.auto_next)
    try {
      const result = await endCall(status.auto_next)
      console.log('End call result:', result)
      toast({
        title: "Call Ended",
        description: status.auto_next ? "Next call will start automatically" : "Call ended",
      })
      onEndCall?.()
    } catch (error) {
      console.error('End call error:', error)
      toast({
        title: "Error",
        description: `Failed to end call: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsEndingCall(false)
    }
  }

  const handleStopAll = async () => {
    if (isStoppingAll) return
    setIsStoppingAll(true)
    console.log('Attempting to stop all calls')
    try {
      const result = await stopAll()
      console.log('Stop all result:', result)
      toast({
        title: "Session Ended",
        description: "All calls stopped and auto-next disabled",
        variant: "destructive",
      })
      onStopAll?.()
    } catch (error) {
      console.error('Stop all error:', error)
      toast({
        title: "Error",
        description: `Failed to stop session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsStoppingAll(false)
    }
  }

  const handleAutoNextToggle = async (enabled: boolean) => {
    try {
      await setAutoNext(enabled)
      toast({
        title: `Auto Next ${enabled ? 'Enabled' : 'Disabled'}`,
        description: enabled ? "Next call will start automatically" : "Auto next disabled",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update Auto Next setting",
        variant: "destructive",
      })
    }
  }

  const statusLabel = status.lead_index ? `Lead #${status.lead_index}` : ''
  const campaignLabel = status.campaign_label || status.campaign || ''
  const details = `${statusLabel}${campaignLabel ? ' | Campaign: ' + campaignLabel : ''}`

  // Debug logging
  console.log('StatusPanel render - status:', status)
  console.log('StatusPanel render - running:', status.running)
  console.log('StatusPanel render - isEndingCall:', isEndingCall)
  console.log('StatusPanel render - isStoppingAll:', isStoppingAll)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Badge variant={status.running ? "default" : "secondary"}>
              Status: <span className="font-bold ml-1">{status.status}</span>
            </Badge>
            {details && (
              <span className="text-sm text-muted-foreground">{details}</span>
            )}
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-next"
                checked={status.auto_next}
                onCheckedChange={handleAutoNextToggle}
              />
              <Label htmlFor="auto-next">Auto Next</Label>
            </div>
            
            <Button
              variant="outline"
              onClick={handleEndCall}
              disabled={!status.running || isEndingCall}
            >
              {isEndingCall ? 'Ending...' : 'End Current Call'}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleStopAll}
              disabled={isStoppingAll}
            >
              {isStoppingAll ? 'Stopping...' : 'End Session'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}