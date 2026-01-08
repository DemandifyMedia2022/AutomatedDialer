import { Router } from 'express'
import { db } from '../../db/prisma'

const router = Router()

function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Prevent formula injection
  if (/^[=+\-@]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }

  // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function buildWhereClause(query: any) {
  const { startDate, endDate, status, direction } = query
  const where: any = {}

  if (startDate) {
    where.start_time = {
      gte: new Date(startDate as string)
    }
  }

  if (endDate) {
    where.start_time = {
      ...where.start_time,
      lte: new Date(endDate as string)
    }
  }

  if (status) {
    where.disposition = status
  }

  if (direction) {
    where.direction = direction
  }

  return where
}

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

// Export call logs
router.get('/export/:id', async (req, res) => {
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

// Get single call log
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const log = await db.calls.findUnique({
      where: {
        id: BigInt(id)
      }
    })

    if (!log) {
      return res.status(404).json({ error: 'Call log not found' })
    }

    const transformedLog = {
      id: log.id.toString(),
      caller: log.source || log.username || 'Unknown',
      callee: log.destination || 'Unknown',
      direction: log.direction,
      duration: log.call_duration,
      status: log.disposition,
      startTime: log.start_time,
      endTime: log.end_time,
      recordingUrl: log.recording_url,
      ...log // Include other fields as well
    }

    // Handle BigInt in the spread object
    const safeLog = JSON.parse(JSON.stringify(transformedLog, (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value
    ));

    res.json(safeLog)
  } catch (error) {
    console.error('Error fetching call log:', error)
    res.status(500).json({ error: 'Failed to fetch call log' })
  }
})

export default router
