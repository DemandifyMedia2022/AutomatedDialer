// src/state/liveCalls.ts
 
import { emitToManagers, emitToUser } from "../utils/ws"
import { db } from "../db/prisma"
import { getPool } from "../db/pool"
 
export type CallPhase =
  | "dialing"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
 
export interface LiveCall {
  userId: number
  username: string | null
  callId: number
  status: string
  startTime: number | null
  source?: string | null
  destination?: string | null
  did?: string | null
  direction?: string | null
  action?: string | null
}
 
export const liveCalls = new Map<number, LiveCall>()
 
// MAIN FUNCTION — call this from calls.ts
export async function updateLiveCallPhase(req: any, phase: CallPhase, callId: number) {
  const userId = req.user?.userId
  const username = req.user?.username || null
  const body = (req && req.body) ? req.body : {}
  const details = {
    source: body?.source ?? null,
    destination: body?.destination ?? null,
    did: body?.did ?? null,
    direction: body?.direction ?? null,
    action: body?.action ?? null,
  } as Partial<LiveCall>
 
  // If DID not provided, resolve from DB using user's assigned extension
  try {
    if (!details.did && userId) {
      const u = await db.users.findUnique({ where: { id: userId }, select: { extension: true } })
      const ext = u?.extension || null
      if (ext) {
        const pool = getPool()
        const [rows]: any = await pool.query('SELECT did FROM extension_dids WHERE extension_id = ? LIMIT 1', [ext])
        const did = rows && rows[0] ? rows[0].did : null
        if (did) details.did = did
        // Also set source to extension if not provided
        if (!details.source) details.source = ext
      }
    }
  } catch {}
 
  if (!userId) return
  if (!phase || !callId) return
 
  // ======================
  //  UPDATE LIVE STATE
  // ======================
  if (["dialing", "ringing", "connecting"].includes(phase)) {
    const prev = liveCalls.get(userId)
    liveCalls.set(userId, {
      userId,
      username,
      callId,
      status: phase,
      startTime: prev?.startTime ?? null,
      source: details.source ?? prev?.source ?? null,
      destination: details.destination ?? prev?.destination ?? null,
      did: details.did ?? prev?.did ?? null,
      direction: details.direction ?? prev?.direction ?? null,
      action: details.action ?? prev?.action ?? null,
    })
  }
 
  if (phase === "connected") {
    const prev = liveCalls.get(userId)
    liveCalls.set(userId, {
      userId,
      username,
      callId,
      status: "on_call",
      startTime: prev?.startTime ?? Date.now(),
      source: details.source ?? prev?.source ?? null,
      destination: details.destination ?? prev?.destination ?? null,
      did: details.did ?? prev?.did ?? null,
      direction: details.direction ?? prev?.direction ?? null,
      action: details.action ?? prev?.action ?? null,
    })
  }
 
  if (phase === "ended") {
    liveCalls.delete(userId)
  }
 
  // ======================
  //  BROADCAST VIA SOCKET
  // ======================
  await emitToManagers("live:calls:update", [...liveCalls.values()])
  await emitToUser(userId, `call:phase:${phase}`, { callId })
}
 
// ======================
//  FOR MANAGER DASHBOARD
// ======================
export function getLiveCalls() {
  return [...liveCalls.values()]
}

// ======================
//  STALE ENTRY SWEEPER
// ======================
const TTL_MS = 2 * 60 * 1000 // 2 minutes for pre-connect states
let sweepTimer: NodeJS.Timer | null = null

function sweepLiveCalls() {
  try {
    const now = Date.now()
    let changed = false
    for (const [userId, lc] of liveCalls.entries()) {
      const s = String(lc.status || '').toLowerCase()
      if (s === 'dialing' || s === 'ringing' || s === 'connecting') {
        const t = typeof lc.callId === 'number' ? lc.callId : now
        if (now - t > TTL_MS) { liveCalls.delete(userId); changed = true }
      }
    }
    if (changed) {
      try { void emitToManagers('live:calls:update', [...liveCalls.values()]) } catch {}
    }
  } catch {}
}

export function startLiveCallsSweeper() {
  if (sweepTimer) return
  sweepTimer = setInterval(sweepLiveCalls, 15000)
}