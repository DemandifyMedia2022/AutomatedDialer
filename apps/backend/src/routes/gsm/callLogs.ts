import { Router } from 'express'
import { db } from '../../db/prisma'

const router = Router()

// Get call logs
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, direction } = req.query

    const where: any = {}

    if (startDate || endDate) {
      where.start_time = {}
      if (startDate) where.start_time.gte = new Date(startDate as string)
      if (endDate) where.start_time.lte = new Date(endDate as string)
    }

    if (status) {
      where.disposition = status as string
    }

    if (direction) {
      where.direction = direction as string
    }

    const calls = await db.calls.findMany({
      where,
      orderBy: { start_time: 'desc' },
      take: 100
    })

    const logs = calls.map(call => ({
      id: call.id.toString(),
      caller: call.source,
      callee: call.destination,
      direction: call.direction,
      duration: call.call_duration,
      status: call.disposition,
      startTime: call.start_time,
      endTime: call.end_time,
      gsmPort: call.platform
    }))

    res.json(logs)
  } catch (error) {
    console.error('Error fetching call logs:', error)
    res.status(500).json({ error: 'Failed to fetch call logs' })
  }
})

// Get single call log
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Validate id is parseable as BigInt
    try {
        BigInt(id);
    } catch {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    const call = await db.calls.findUnique({
      where: { id: BigInt(id) }
    })

    if (!call) {
      return res.status(404).json({ error: 'Call log not found' })
    }

    const log = {
      id: call.id.toString(),
      caller: call.source,
      callee: call.destination,
      direction: call.direction,
      duration: call.call_duration,
      status: call.disposition,
      startTime: call.start_time,
      endTime: call.end_time,
      gsmPort: call.platform
    }

    res.json(log)
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
