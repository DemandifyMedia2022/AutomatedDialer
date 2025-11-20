import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { env } from '../config/env'
import { verifyJwt } from '../utils/jwt'

let io: Server | null = null

export function initWs(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: env.USE_AUTH_COOKIE,
    },
  })

  io.on('connection', (socket) => {
    try {
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
      if (payload) {
        const userId = payload.userId
        const role = String(payload.role || '').toLowerCase()
        socket.join(`user:${userId}`)
        if (role === 'manager' || role === 'superadmin') socket.join('managers')
      }

      // Transcription event handlers
      socket.on('transcription:audio_chunk', async (data: { sessionId: string; audioData: ArrayBuffer; speaker?: 'agent' | 'customer' }) => {
        try {
          const { transcribeAudioChunk } = await import('../services/transcriptionService')
          const { sessionId, audioData, speaker = 'agent' } = data
          const buffer = Buffer.from(audioData)
          await transcribeAudioChunk(sessionId, buffer, speaker)
        } catch (error) {
          console.error('[WS] Audio chunk processing error:', error)
          socket.emit('transcription:error', { error: 'Failed to process audio chunk' })
        }
      })

      socket.on('transcription:session_error', async (data: { sessionId: string; error: string }) => {
        try {
          const { handleTranscriptionError } = await import('../services/transcriptionService')
          await handleTranscriptionError(data.sessionId, data.error)
        } catch (error) {
          console.error('[WS] Session error handling failed:', error)
        }
      })

    } catch { }
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
