import { Router } from 'express'
import { broadcastLiveCalls } from '../index.js'

const router = Router()

// Get active calls
router.get('/', async (req, res) => {
  try {
    // TODO: Query Asterisk AMI for active channels
    const calls = [
      { id: '1', caller: '+1234567890', callee: '+0987654321', direction: 'outbound', duration: 45, startTime: new Date(), channel: 'SIP/1001', gsmPort: 'COM1' },
      { id: '2', caller: '+1234567891', callee: '+0987654322', direction: 'inbound', duration: 120, startTime: new Date(), channel: 'SIP/1002' },
    ]
    res.json(calls)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live calls' })
  }
})

// Hangup call
router.post('/:id/hangup', async (req, res) => {
  try {
    const { id } = req.params
    // TODO: Send hangup command to Asterisk
    res.json({ message: 'Call hung up successfully', callId: id })
  } catch (error) {
    res.status(500).json({ error: 'Failed to hangup call' })
  }
})

// Mute/Unmute call
router.post('/:id/mute', async (req, res) => {
  try {
    const { id } = req.params
    const { muted } = req.body
    // TODO: Mute/unmute call in Asterisk
    res.json({ message: `Call ${muted ? 'muted' : 'unmuted'}`, callId: id })
  } catch (error) {
    res.status(500).json({ error: 'Failed to mute/unmute call' })
  }
})

// Monitor call
router.post('/:id/monitor', async (req, res) => {
  try {
    const { id } = req.params
    // TODO: Start call monitoring
    res.json({ message: 'Call monitoring started', callId: id })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start monitoring' })
  }
})

export default router

