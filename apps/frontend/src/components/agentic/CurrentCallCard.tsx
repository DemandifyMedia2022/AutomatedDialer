import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { Lead } from '@/types'

interface CurrentCallCardProps {
  lead: Lead
  campaign: string
  status: string
}

export default function CurrentCallCard({ lead, campaign, status }: CurrentCallCardProps) {
  const isConnected = status === 'running'
  
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-card/50 to-card">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {!isConnected && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
            {isConnected && <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">
                {isConnected ? 'Connected' : 'Connecting...'}
              </h3>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? 'Live' : 'Waiting'}
              </Badge>
            </div>
            
            <div className="mb-2">
              <div className="text-base font-medium">{lead.prospect_name || '—'}</div>
              <div className="text-sm text-muted-foreground">{lead.company_name || '—'}</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm text-muted-foreground">
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}