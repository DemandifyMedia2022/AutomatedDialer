import { Router } from 'express'
import { db } from '../../db/prisma'

const router = Router()

// Make a call
router.post('/call', async (req, res) => {
  try {
    const { number, port, type, username, extension } = req.body // type: 'sip' or 'gsm'

    if (!number) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    // Create call record in DB
    const start_time = new Date()
    const callData: any = {
      destination: number,
      direction: 'outbound',
      call_type: 'gsm',
      start_time: start_time,
      disposition: 'DIALING',
      platform: 'web_gsm',
      extension: extension || 'gsm',
      username: username || 'agent', // Should ideally come from auth middleware if working
    }

    // Try to attach user info if passed or available (for now mocking/fallback)

    // In production, this would:
    // 1. For SIP: Send AMI command to Asterisk
    // 2. For GSM: Send AT command to GSM module

    const savedCall = await db.calls.create({ data: callData })
    const callId = typeof savedCall.id === 'bigint' ? Number(savedCall.id) : savedCall.id

    res.status(201).json({
      success: true,
      id: callId,
      number,
      port: port || 'sip',
      type: type || 'sip',
      status: 'dialing',
      startTime: start_time,
    })
  } catch (error) {
    console.error('GSM Call Error:', error)
    res.status(500).json({ error: 'Failed to initiate call' })
  }
})

// Hangup call
router.post('/hangup', async (req, res) => {
  try {
    const { callId } = req.body

    if (!callId) {
      return res.status(400).json({ error: 'Call ID is required' })
    }

    const end_time = new Date()

    // Fetch start time to calculate duration
    const call = await db.calls.findUnique({ where: { id: BigInt(callId) } })

    if (call) {
      const start = call.start_time
      const duration = Math.round((end_time.getTime() - start.getTime()) / 1000)

      await db.calls.update({
        where: { id: BigInt(callId) },
        data: {
          end_time: end_time,
          call_duration: duration,
          disposition: 'ANSWERED', // Assuming answered for now as we don't have real GSM feedback
        }
      })
    }

    // TODO: Implement actual GSM hangup logic (ATH command)

    res.json({ message: 'Call hung up successfully', callId })
  } catch (error) {
    console.error('GSM Hangup Error:', error)
    res.status(500).json({ error: 'Failed to hangup call' })
  }
})

// Get recent calls
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const calls = await db.calls.findMany({
      where: { call_type: 'gsm' },
      take: Number(limit),
      orderBy: { start_time: 'desc' }
    })

    const safeCalls = calls.map(c => ({
      ...c,
      id: typeof c.id === 'bigint' ? Number(c.id) : c.id
    }))

    res.json(safeCalls)
  } catch (error) {
    console.error('Recent calls error:', error)
    res.status(500).json({ error: 'Failed to fetch recent calls' })
  }
})

export default router

