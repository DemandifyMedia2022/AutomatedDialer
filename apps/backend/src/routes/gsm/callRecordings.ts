import { Router } from 'express'
import axios from 'axios'
import path from 'path'

const router = Router()

// External dialer API that already exposes recordings
const DIALER_API_BASE = 'http://192.168.0.238:4000'

interface RemoteRecording {
  id: string
  direction: 'inbound' | 'outbound'
  filename: string
  relativePath: string
  sizeBytes: number
  createdAt: string
  modifiedAt: string
}

interface RemoteResponse {
  success: boolean
  count: number
  recordings: RemoteRecording[]
}

// Get all recordings (proxy from dialer_api)
router.get('/', async (_req, res) => {
  try {
    const url = `${DIALER_API_BASE}/api/recordings`
    const { data } = await axios.get<RemoteResponse>(url, { timeout: 5000 })

    if (!data.success) {
      return res.status(502).json({ error: 'Upstream recordings API returned error' })
    }

    // Map to a simpler shape for the frontend
    const recordings = data.recordings.map((r) => {
      // Try to parse caller/callee from filename
      // Formats: gsm-<caller>-<callee>-<uuid>.wav or gsm-<caller>-inbound-<uuid>.wav
      let caller = 'unknown'
      let callee = 'unknown'
      const base = r.filename.replace('.wav', '')
      const parts = base.split('-')
      
      if (parts.length >= 4 && (parts[0] === 'gsm' || parts[0] === 'ari')) {
        if (parts[2] === 'inbound') {
          caller = parts[1]
        } else {
          // outbound: gsm-<caller>-<callee>-<uuid>
          caller = parts[1]
          callee = parts[2]
        }
      }
      
      return {
        id: r.id,
        caller,
        callee,
        direction: r.direction,
        duration: 0,
        date: r.createdAt,
        size: r.sizeBytes,
        filePath: r.relativePath,
        filename: r.filename,
      }
    })

    res.json(recordings)
  } catch (error) {
    console.error('Failed to fetch recordings from dialer_api', error)
    res.status(500).json({ error: 'Failed to fetch recordings' })
  }
})

// Stream/download specific recording by id via dialer_api
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params

    // First fetch list to find the recording
    const listUrl = `${DIALER_API_BASE}/api/recordings`
    const { data } = await axios.get<RemoteResponse>(listUrl, { timeout: 5000 })
    const rec = data.recordings.find((r) => r.id === id)

    if (!rec) {
      return res.status(404).json({ error: 'Recording not found' })
    }

    // Use the confirmed working path: /recordings/<relativePath>
    const remoteUrl = `${DIALER_API_BASE}/recordings/${rec.relativePath}`
    const response = await axios.get(remoteUrl, {
      responseType: 'stream',
    })

    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Content-Disposition', `attachment; filename="${rec.filename}"`)
    response.data.pipe(res)
  } catch (error: any) {
    console.error('Failed to download recording from dialer_api', error.message)
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Recording file not found on server' })
    }
    res.status(500).json({ error: 'Failed to download recording' })
  }
})

export default router

