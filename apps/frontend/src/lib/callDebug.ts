// Simple call debug utility. Enabled via NEXT_PUBLIC_CALL_DEBUG=true

export const debugEnabled = String(process.env.NEXT_PUBLIC_CALL_DEBUG || '').toLowerCase() === 'true';

export type CallDebugEntry = {
  ts: number;
  level: 'info' | 'warn' | 'error';
  scope: string; // e.g., IntegratedCall, JSSIP, LiveKit
  event: string;
  data?: any;
};

function emit(entry: CallDebugEntry) {
  try {
    const w = window as any;
    if (!w.__CALL_DEBUG_LOG) w.__CALL_DEBUG_LOG = [] as CallDebugEntry[];
    w.__CALL_DEBUG_LOG.push(entry);
    const ev = new CustomEvent('call-debug', { detail: entry });
    window.dispatchEvent(ev);
  } catch {
    // no-op for SSR
  }
}

export function logCallInfo(scope: string, event: string, data?: any) {
  if (!debugEnabled) return;
  emit({ ts: Date.now(), level: 'info', scope, event, data });
}

export function logCallWarn(scope: string, event: string, data?: any) {
  if (!debugEnabled) return;
  emit({ ts: Date.now(), level: 'warn', scope, event, data });
}

export function logCallError(scope: string, event: string, data?: any) {
  if (!debugEnabled) return;
  emit({ ts: Date.now(), level: 'error', scope, event, data });
}

export function getCallDebugLog(): CallDebugEntry[] {
  try {
    const w = window as any;
    return (w.__CALL_DEBUG_LOG || []) as CallDebugEntry[];
  } catch {
    return [];
  }
}
