"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { debugEnabled, getCallDebugLog, CallDebugEntry } from '@/lib/callDebug'

export default function CallDebugPanel() {
  const [open, setOpen] = useState(true)
  const [entries, setEntries] = useState<CallDebugEntry[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!debugEnabled) return

    const update = () => setEntries([...getCallDebugLog()])
    update()

    const onEvent = () => update()
    window.addEventListener('call-debug', onEvent as any)

    const interval = setInterval(update, 2000)

    return () => {
      window.removeEventListener('call-debug', onEvent as any)
      clearInterval(interval)
    }
  }, [])

  const filtered = useMemo(() => {
    if (!filter) return entries
    const q = filter.toLowerCase()
    return entries.filter((e) =>
      e.scope.toLowerCase().includes(q) ||
      e.event.toLowerCase().includes(q) ||
      (typeof e.data === 'string' && e.data.toLowerCase().includes(q)) ||
      JSON.stringify(e.data || {}).toLowerCase().includes(q)
    )
  }, [entries, filter])

  if (!debugEnabled) return null

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999 }}>
      <div style={{
        width: 360,
        background: 'rgba(17,24,39,0.95)',
        color: 'white',
        border: '1px solid #374151',
        borderRadius: 8,
        boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#111827', borderBottom: '1px solid #374151' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Call Debug</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #374151', background: '#1f2937', color: 'white' }}
            />
            <button onClick={() => setOpen(!open)} style={{ fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #374151', background: '#1f2937', color: 'white' }}>
              {open ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => setEntries([])} style={{ fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #374151', background: '#1f2937', color: 'white' }}>
              Clear
            </button>
          </div>
        </div>
        {open && (
          <div style={{ maxHeight: 320, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 12, color: '#9ca3af' }}>No debug events yet.</div>
            )}
            {filtered.slice(-200).map((e, idx) => (
              <div key={idx} style={{ padding: '6px 10px', borderBottom: '1px solid #374151' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af' }}>{new Date(e.ts).toLocaleTimeString()}</span>
                  <span style={{ color: levelColor(e.level), fontWeight: 700 }}>{e.level.toUpperCase()}</span>
                  <span style={{ color: '#60a5fa' }}>{e.scope}</span>
                  <span style={{ color: '#fbbf24' }}>{e.event}</span>
                </div>
                {e.data !== undefined && (
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#d1d5db' }}>{safeJson(e.data)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function safeJson(v: any) {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

function levelColor(level: CallDebugEntry['level']) {
  switch (level) {
    case 'info': return '#34d399'
    case 'warn': return '#fbbf24'
    case 'error': return '#f87171'
    default: return '#d1d5db'
  }
}
