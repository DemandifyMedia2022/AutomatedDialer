import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Phone, PhoneOff, Wifi, WifiOff } from 'lucide-react'
import type { Lead } from '@/types/agentic'
import { getLiveKitActiveCalls, endLiveKitCall } from '@/lib/enhancedAgenticApi'
import { useToast } from '@/hooks/use-toast'

interface CurrentCallCardProps {
  lead: Lead
  campaign: string
  status: string
  livekitCallId?: string
}

export default function CurrentCallCard({ lead, campaign, status, livekitCallId }: CurrentCallCardProps) {
  const { toast } = useToast()
  const isLiveKitCall = !!livekitCallId
  const isConnected = status === 'running' || status === 'connected'
  const isConnecting = status === 'dialing' || status === 'ringing'
  
  const handleEndLiveKitCall = async () => {
    if (!livekitCallId) return
    
    try {
      await endLiveKitCall(livekitCallId)
      toast({
        title: "LiveKit Call Ended",
        description: "Call has been terminated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end LiveKit call",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-card/50 to-card">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {!isConnected && !isConnecting && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
            {isConnecting && <Loader2 className="w-6 h-6 animate-spin text-orange-500" />}
            {isConnected && <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Waiting'}
              </h3>
              <Badge variant={isConnected ? "default" : isConnecting ? "secondary" : "outline"}>
                {isConnected ? 'Live' : isConnecting ? 'Connecting' : 'Waiting'}
              </Badge>
              
              {isLiveKitCall && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <Wifi className="w-3 h-3 mr-1" />
                  LiveKit SIP
                </Badge>
              )}
            </div>
            
            <div className="mb-4">
              <div className="text-base font-medium">{lead.prospect_name || '—'}</div>
              <div className="text-sm text-muted-foreground">{lead.company_name || '—'}</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm text-muted-foreground mb-4">
              <div>
                <span className="font-medium">Title:</span> {lead.job_title || '—'}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {lead.phone || '—'}
              </div>
              <div>
                <span className="font-medium">Email:</span> {lead.email || '—'}
              </div>
              <div>
                <span className="font-medium">Timezone:</span> {lead.timezone || '—'}
              </div>
              <div>
                <span className="font-medium">Campaign:</span> {campaign || '—'}
              </div>
            </div>

            {isLiveKitCall && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Wifi className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  This call is routed through LiveKit SIP trunk for enhanced reliability
                </span>
                {isConnected && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEndLiveKitCall}
                    className="ml-auto"
                  >
                    <PhoneOff className="w-3 h-3 mr-1" />
                    End Call
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
