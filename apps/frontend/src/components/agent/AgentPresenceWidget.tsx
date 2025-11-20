"use client"

import React from 'react'
import { useAgentPresence } from '@/hooks/useAgentPresence'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RotateCw, Clock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function StatusBadge({ status }: { status: 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'IDLE' | 'BREAK' }) {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-emerald-600',
    ON_CALL: 'bg-sky-600',
    IDLE: 'bg-amber-600',
    BREAK: 'bg-indigo-600',
    OFFLINE: 'bg-slate-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold text-white tracking-wide ${map[status] || 'bg-slate-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function AgentPresenceWidget() {
  const { status, setStatus, startBreak, endBreak, breakReasons, loading, secondsSinceChange, totalTodaySeconds, reloadBreaks } = useAgentPresence()
  const [reason, setReason] = React.useState<string>('')

  React.useEffect(() => {
    if (!reason && breakReasons.length) setReason(String(breakReasons[0].id))
  }, [breakReasons, reason])

  const hh = String(Math.floor(totalTodaySeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalTodaySeconds % 3600) / 60)).padStart(2, '0')

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Today {hh}:{mm}</span>
          </div>
        </div>
        <Button size="icon" variant="ghost" title="Refresh reasons" onClick={() => reloadBreaks()}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {status === 'BREAK' ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">You are currently on a break</div>
          <div className="grid grid-cols-1 gap-2">
            <Button className="w-full" variant="secondary" disabled={loading} onClick={() => endBreak()}>End Break</Button>
            <Button className="w-full" variant="outline" disabled={loading} onClick={() => setStatus('AVAILABLE')}>Go Available</Button>
          </div>
        </div>
      ) : status === 'IDLE' || status === 'OFFLINE' ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {status === 'IDLE' ? 'Your session is idle' : 'You are currently offline'}
          </div>
          <Button className="w-full" disabled={loading} onClick={() => setStatus('AVAILABLE')}>
            Resume Session
          </Button>
        </div>
      ) : status === 'ON_CALL' ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">You are currently on a call</div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Select a break reason</div>
          {breakReasons.length === 0 ? (
            <div className="text-xs text-muted-foreground">No reasons configured.</div>
          ) : (
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Choose reason" />
              </SelectTrigger>
              <SelectContent className="max-h-[220px]">
                {breakReasons.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button className="w-full" disabled={loading || !reason} onClick={() => startBreak(Number(reason))}>Start Break</Button>
        </div>
      )}
    </Card>
  )
}
