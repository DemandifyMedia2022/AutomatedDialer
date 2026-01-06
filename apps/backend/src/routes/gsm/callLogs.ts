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
    const where = buildWhereClause(req.query)

    const logs = await db.calls.findMany({
      where,
      orderBy: {
        start_time: 'desc'
      },
      take: 100
    })

    // Transform logs to match the expected format (converting BigInt to string)
    const transformedLogs = logs.map(log => ({
      id: log.id.toString(),
      caller: log.source || log.username || 'Unknown',
      callee: log.destination || 'Unknown',
      direction: log.direction,
      duration: log.call_duration, // Assuming call_duration is Int, if BigInt, needs toString()
      status: log.disposition,
      startTime: log.start_time,
      endTime: log.end_time,
      recordingUrl: log.recording_url
    }))

    res.json(transformedLogs)
  } catch (error) {
    console.error('Error fetching call logs:', error)
    res.status(500).json({ error: 'Failed to fetch call logs' })
  }
})

// Export call logs
router.get('/export', async (req, res) => {
  try {
    const { format } = req.query
    const where = buildWhereClause(req.query)

    const logs = await db.calls.findMany({
      where,
      orderBy: {
        start_time: 'desc'
      },
      take: 10000 // Limit to avoid memory issues
    })

    const exportData = logs.map(log => ({
      id: log.id.toString(),
      call_id: log.call_id,
      campaign_name: log.campaign_name,
      username: log.username,
      start_time: log.start_time,
      end_time: log.end_time,
      duration: log.call_duration,
      source: log.source,
      destination: log.destination,
      direction: log.direction,
      disposition: log.disposition,
      recording_url: log.recording_url
    }))

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=call_logs.json')
      return res.send(JSON.stringify(exportData, null, 2))
    } else {
      // Default to CSV
      const headers = [
        'ID',
        'Call ID',
        'Campaign',
        'Username',
        'Start Time',
        'End Time',
        'Duration',
        'Source',
        'Destination',
        'Direction',
        'Disposition',
        'Recording URL'
      ]

      const rows = exportData.map(log => [
        log.id,
        log.call_id,
        log.campaign_name,
        log.username,
        log.start_time?.toISOString(),
        log.end_time?.toISOString(),
        log.duration,
        log.source,
        log.destination,
        log.direction,
        log.disposition,
        log.recording_url
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => escapeCSV(cell)).join(','))
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=call_logs.csv')
      return res.send(csvContent)
    }

  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export call logs' })
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
