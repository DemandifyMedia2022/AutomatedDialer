import { Router } from 'express'
import { db } from '../../db/prisma'

const router = Router()

// Get call logs
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, direction } = req.query
    // TODO: Query CDR database with filters
    const logs = [
      { id: '1', caller: '+1234567890', callee: '+0987654321', direction: 'outbound', duration: 120, status: 'answered', startTime: new Date(), endTime: new Date(), gsmPort: 'COM1' },
      { id: '2', caller: '+1234567891', callee: '+0987654322', direction: 'inbound', duration: 0, status: 'missed', startTime: new Date(), endTime: new Date() },
    ]
    res.json(logs)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch call logs' })
  }
})

// Get single call log
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const log = await db.calls.findUnique({
      where: { id: BigInt(id) }
    })

    if (!log) {
      return res.status(404).json({ error: 'Call log not found' })
    }

    // Handle BigInt serialization
    const serializedLog = JSON.parse(JSON.stringify(log, (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value
    ))

    res.json(serializedLog)
  } catch (error) {
    console.error('Error fetching call log:', error)
    res.status(500).json({ error: 'Failed to fetch call log' })
  }
})

// Export call logs
router.get('/export', async (req, res) => {
  try {
    const { format } = req.query
    // TODO: Generate export file (CSV, JSON, etc.)
    res.json({ message: 'Export functionality to be implemented' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to export call logs' })
  }
})

export default router
