import { Router } from 'express'

const router = Router()

router.get('/stats', async (req, res) => {
  try {
    // Mock data - replace with actual database queries
    const stats = {
      totalCallsToday: 1234,
      activeCalls: 23,
      sipUsers: 156,
      gsmPorts: 12,
      callVolume: [
        { time: '00:00', calls: 45 },
        { time: '04:00', calls: 32 },
        { time: '08:00', calls: 78 },
        { time: '12:00', calls: 120 },
        { time: '16:00', calls: 95 },
        { time: '20:00', calls: 67 },
      ],
      callTypes: [
        { type: 'Inbound', count: 450 },
        { type: 'Outbound', count: 320 },
        { type: 'Missed', count: 89 },
      ],
    }
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

router.get('/recent-activity', async (req, res) => {
  try {
    const activities = [
      { id: '1', type: 'call', description: 'Call from +1234567890', timestamp: new Date() },
      { id: '2', type: 'call', description: 'Call to +0987654321', timestamp: new Date() },
    ]
    res.json(activities)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent activity' })
  }
})

export default router

