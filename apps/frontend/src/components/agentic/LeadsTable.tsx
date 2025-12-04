import { useState } from 'react'
import { useLeads } from '@/hooks/agentic/useLeads'
import { useIntegratedCall } from '@/hooks/agentic/useIntegratedCall'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Phone, PhoneOff } from 'lucide-react'
import type { Lead } from '@/types/agentic'

interface LeadsTableProps {
  currentPage: number
  selectedCampaign: string
  onPageChange: (page: number) => void
  onCallStart?: () => void
  jssip?: any // JSSIP hook for making calls
}

export default function LeadsTable({ currentPage, selectedCampaign, onPageChange, onCallStart, jssip }: LeadsTableProps) {
  const { leads, totalPages, startIndex, loading } = useLeads(currentPage)
  const { toast } = useToast()
  const [startingCall, setStartingCall] = useState<number | null>(null)

  // Initialize integrated call system
  const integratedCall = useIntegratedCall({
    jssipHook: jssip,
    selectedCampaign: selectedCampaign,
    onCallPhaseChange: (phase) => {
      console.log('[LeadsTable] Call phase changed to:', phase)
      
      // Update UI based on call phase
      if (phase === 'connected') {
        toast({
          title: "Call Connected",
          description: "Call is now active with AI voice",
        })
      } else if (phase === 'failed') {
        toast({
          title: "Call Failed",
          description: "Failed to connect the call",
          variant: "destructive",
        })
      } else if (phase === 'ringing') {
        toast({
          title: "Ringing",
          description: "Call is ringing...",
        })
      }
    },
    onCallStart: (callId) => {
      console.log('[LeadsTable] Integrated call started:', callId)
      onCallStart?.()
    },
    onCallEnd: () => {
      console.log('[LeadsTable] Integrated call ended')
    }
  })

  const handleStartCall = async (lead: Lead, index: number) => {
    if (!lead.phone) {
      toast({
        title: "Error",
        description: "Lead has no phone number",
        variant: "destructive",
      })
      return
    }

    const globalIndex = startIndex + index
    setStartingCall(globalIndex)
    
    try {
      // Use integrated call system (coordinates both LiveKit and JSSIP)
      console.log('[LeadsTable] Starting integrated call')
      await integratedCall.startIntegratedCall(lead.phone, globalIndex.toString())
      
      toast({
        title: "Call Started",
        description: `Calling ${lead.prospect_name} with Integrated System`,
      })
      
    } catch (error) {
      console.error('[LeadsTable] Integrated call failed:', error)
      toast({
        title: "Error",
        description: "Failed to start integrated call",
        variant: "destructive",
      })
    } finally {
      setStartingCall(null)
    }
  }

  const handleCallNext = async () => {
    if (leads.length === 0) {
      toast({
        title: "Error",
        description: "No leads available to call",
        variant: "destructive",
      })
      return
    }

    const nextIndex = startIndex + leads.length
    const nextLead = leads[0] // Use first lead as next
    
    try {
      await integratedCall.startIntegratedCall(nextLead.phone, nextIndex.toString())
      toast({
        title: "Next Call Started",
        description: `Starting next call (#${nextIndex + 1})`,
      })
      onCallStart?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start next call",
        variant: "destructive",
      })
    }
  }

  const handleEndCall = async () => {
    try {
      await integratedCall.endIntegratedCall()
      toast({
        title: "Call Ended",
        description: "Call has been terminated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end call",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">Loading leads...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prospects (Page {currentPage}/{totalPages})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCallNext}
                disabled={startingCall !== null || integratedCall.isCallActive()}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Next
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndCall}
                disabled={!integratedCall.isCallActive()}
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-32">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead: Lead, index: number) => {
                const globalIndex = startIndex + index
                const isStarting = startingCall === globalIndex
                
                return (
                  <TableRow key={globalIndex}>
                    <TableCell>{globalIndex + 1}</TableCell>
                    <TableCell className="font-medium">{lead.prospect_name}</TableCell>
                    <TableCell>{lead.company_name}</TableCell>
                    <TableCell>{lead.job_title}</TableCell>
                    <TableCell>{lead.phone ? lead.phone.replace(/^\+91/, '') : lead.phone}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleStartCall(lead, index)}
                        disabled={isStarting}
                      >
                        {isStarting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4 mr-2" />
                            Start Call
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No leads found. Upload a CSV file to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="w-10 h-10"
              >
                {page}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}