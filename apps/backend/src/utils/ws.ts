import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { env } from '../config/env'
import { verifyJwt } from '../utils/jwt'

let io: Server | null = null

// Rate limiting for WebSocket connections
const connectionAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_CONNECTION_ATTEMPTS = 5
const CONNECTION_WINDOW_MS = 60000 // 1 minute

// Rate limiting for audio chunks
const audioChunkLimits = new Map<string, { count: number; lastChunk: number; totalSize: number }>()
const MAX_CHUNKS_PER_MINUTE = 60
const MAX_TOTAL_SIZE_PER_MINUTE = 50 * 1024 * 1024 // 50MB per minute

function checkConnectionRateLimit(socketId: string): boolean {
  const now = Date.now()
  const attempts = connectionAttempts.get(socketId)
  
  if (!attempts) {
    connectionAttempts.set(socketId, { count: 1, lastAttempt: now })
    return true
  }
  
  if (now - attempts.lastAttempt > CONNECTION_WINDOW_MS) {
    connectionAttempts.set(socketId, { count: 1, lastAttempt: now })
    return true
  }
  
  if (attempts.count >= MAX_CONNECTION_ATTEMPTS) {
    return false
  }
  
  attempts.count++
  attempts.lastAttempt = now
  return true
}

function checkAudioChunkRateLimit(userId: number, chunkSize: number): boolean {
  const now = Date.now()
  const key = `user:${userId}`
  const limits = audioChunkLimits.get(key)
  
  if (!limits) {
    audioChunkLimits.set(key, { count: 1, lastChunk: now, totalSize: chunkSize })
    return true
  }
  
  if (now - limits.lastChunk > 60000) {
    audioChunkLimits.set(key, { count: 1, lastChunk: now, totalSize: chunkSize })
    return true
  }
  
  if (limits.count >= MAX_CHUNKS_PER_MINUTE || limits.totalSize + chunkSize > MAX_TOTAL_SIZE_PER_MINUTE) {
    return false
  }
  
  limits.count++
  limits.lastChunk = now
  limits.totalSize += chunkSize
  return true
}

function logUnauthorizedAttempt(socket: any, reason: string, ip?: string) {
  console.warn(`[WS] Unauthorized connection attempt - ${reason}`, {
    socketId: socket.id,
    ip: ip || socket.handshake.address,
    timestamp: new Date().toISOString(),
    userAgent: socket.handshake.headers['user-agent']
  })
}

export function initWs(server: HttpServer) {
  io = new Server(server, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: env.USE_AUTH_COOKIE,
    },
  })

  io.on('connection', (socket) => {
    try {
      const socketId = socket.id
      const clientIp = socket.handshake.address
      
      // Check connection rate limiting
      if (!checkConnectionRateLimit(socketId)) {
        logUnauthorizedAttempt(socket, 'Rate limit exceeded', clientIp)
        socket.emit('error', { message: 'Connection rate limit exceeded' })
        socket.disconnect(true)
        return
      }

      // Prefer auth token in handshake.auth.token, else try Bearer header, else cookie
      const a: any = socket.handshake.auth || {}
      let token: string | undefined = a.token
      const authz = socket.handshake.headers['authorization'] || socket.handshake.headers['Authorization']
      if (!token && typeof authz === 'string' && authz.toLowerCase().startsWith('bearer ')) token = authz.slice(7)
      if (!token && typeof socket.handshake.headers.cookie === 'string') {
        const cookies = Object.fromEntries(String(socket.handshake.headers.cookie).split(';').map(p => p.trim().split('=')).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])) as any
        token = cookies[env.AUTH_COOKIE_NAME]
      }
      
      const payload = token ? verifyJwt(token) : null
      
      // ENFORCE AUTHENTICATION - Disconnect if not authenticated
      if (!payload) {
        logUnauthorizedAttempt(socket, 'No valid token provided', clientIp)
        socket.emit('error', { message: 'Authentication required' })
        socket.disconnect(true)
        return
      }
      
      const userId = payload.userId
      const role = String(payload.role || '').toLowerCase()
      
      // Store user info on socket for RBAC checks
      socket.data.userId = userId
      socket.data.role = role
      
      socket.join(`user:${userId}`)
      if (role === 'manager' || role === 'superadmin') socket.join('managers')
      
      console.log(`[WS] Authenticated connection: user=${userId}, role=${role}, socket=${socketId}`)

      // Transcription event handlers - ONLY REGISTERED FOR AUTHENTICATED USERS
      
      socket.on('transcription:audio_chunk', async (data: { sessionId: string; audioData: ArrayBuffer; speaker?: 'agent' | 'customer' }) => {
        try {
          // RBAC: Only agents and managers can transcribe audio
          const userRole = socket.data.role as string
          const userId = socket.data.userId as number
          
          if (!['agent', 'manager', 'superadmin'].includes(userRole)) {
            console.warn(`[WS] Unauthorized transcription attempt by user ${userId} with role ${userRole}`)
            socket.emit('transcription:error', { error: 'Insufficient permissions for transcription' })
            return
          }
          
          // Validate audio chunk size
          const audioBuffer = Buffer.from(data.audioData)
          if (audioBuffer.length > 10 * 1024 * 1024) { // 10MB max per chunk
            console.warn(`[WS] Audio chunk too large: ${audioBuffer.length} bytes from user ${userId}`)
            socket.emit('transcription:error', { error: 'Audio chunk too large' })
            return
          }
          
          // Rate limiting for audio chunks
          if (!checkAudioChunkRateLimit(userId, audioBuffer.length)) {
            console.warn(`[WS] Audio chunk rate limit exceeded for user ${userId}`)
            socket.emit('transcription:error', { error: 'Audio chunk rate limit exceeded' })
            return
          }
          
          const { transcribeAudioChunk } = await import('../services/transcriptionService')
          const { sessionId, speaker = 'agent' } = data
          await transcribeAudioChunk(sessionId, audioBuffer, speaker)
        } catch (error) {
          console.error('[WS] Audio chunk processing error:', error)
          socket.emit('transcription:error', { error: 'Failed to process audio chunk' })
        }
      })

      socket.on('transcription:session_error', async (data: { sessionId: string; error: string }) => {
        try {
          // RBAC: Only agents and managers can handle transcription errors
          const userRole = socket.data.role as string
          const userId = socket.data.userId as number
          
          if (!['agent', 'manager', 'superadmin'].includes(userRole)) {
            console.warn(`[WS] Unauthorized session error handling by user ${userId} with role ${userRole}`)
            return
          }
          
          const { handleTranscriptionError } = await import('../services/transcriptionService')
          await handleTranscriptionError(data.sessionId, data.error)
          console.log(`[WS] Session error handled by user ${userId}: ${data.sessionId}`)
        } catch (error) {
          console.error('[WS] Session error handling failed:', error)
        }
      })

      socket.on('disconnect', (reason) => {
        console.log(`[WS] User disconnected: user=${socket.data.userId}, reason=${reason}`)
        // Clean up rate limiting data
        connectionAttempts.delete(socketId)
      })
      
    } catch (error) {
      console.error('[WS] Connection handler error:', error)
      socket.disconnect(true)
    }
  })

  return io
}

export function getIo(): Server | null {
  return io
}

export function emitToUser(userId: number, event: string, payload: any) {
  try { io?.to(`user:${userId}`).emit(event, payload) } catch { }
}

export function emitToManagers(event: string, payload: any) {
  try { io?.to('managers').emit(event, payload) } catch { }
}
