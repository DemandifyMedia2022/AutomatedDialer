import { Router } from 'express'
import { getSimStatus, getSimStatusByPort } from '../../services/gsm/gsmGateway'

const router = Router()

// Get all GSM ports
router.get('/', async (req, res) => {
  try {
    const sims = await getSimStatus()

    // Transform to match frontend expected format
    const ports = sims.map((sim, index) => {
      // Signal is typically 0-5 scale, convert to 0-100 percentage
      // If signal is already 0-100, use as is
      const signalValue = sim.signal <= 5 ? sim.signal * 20 : sim.signal

      // Determine status based on gateway response
      let status: 'active' | 'inactive' | 'error' = 'inactive'
      if (sim.status === 'Mobile Registered') {
        status = 'active'
      } else if (sim.status === 'No USIM Card' || sim.status === 'Mobile Not Registered') {
        status = 'inactive'
      } else {
        status = 'error'
      }

      return {
        id: (index + 1).toString(),
        port: `COM${sim.port}`,
        portNumber: sim.port,
        simNumber: sim.iccid || sim.simNumber || 'N/A',
        operator: sim.operator || 'N/A',
        signal: signalValue || 0,
        signalRaw: sim.signal || 0,
        battery: sim.battery || 0,
        status: status,
        statusRaw: sim.status,
        callStatus: sim.call_status || 'Idle',
        imsi: sim.imsi || 'N/A',
        imei: sim.imei || 'N/A',
        iccid: sim.iccid || 'N/A',
        type: sim.type || 'N/A',
        network: sim.network || 'N/A',
        callLimit: sim.call_limit || 'N/A',
        asr: sim.asr || '0',
        acd: sim.acd || '0',
        pdd: sim.pdd || '0',
      }
    }).filter(port => port.portNumber !== 'Total') // Filter out Total entry

    res.json(ports)
  } catch (error) {
    console.error('Error fetching GSM ports:', error)
    // Fallback to mock data if gateway is unavailable
    const fallbackPorts = [
      { id: '1', port: 'COM0', simNumber: 'N/A', operator: 'Unknown', signal: 0, battery: 0, status: 'error', callStatus: 'Idle', imsi: 'N/A' },
    ]
    res.status(500).json({
      error: 'Failed to fetch GSM ports from gateway',
      fallback: fallbackPorts,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get single GSM port
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    // Extract port number from COM format or use directly
    const portNumber = id.replace('COM', '')
    const sim = await getSimStatusByPort(portNumber)

    if (!sim) {
      return res.status(404).json({ error: 'GSM port not found' })
    }

    // Signal is typically 0-5 scale, convert to 0-100 percentage
    const signalValue = sim.signal <= 5 ? sim.signal * 20 : sim.signal

    const port = {
      id,
      port: `COM${sim.port}`,
      simNumber: sim.simNumber || 'N/A',
      operator: sim.operator,
      signal: signalValue || 0,
      battery: sim.battery || 0,
      status: sim.status === 'Mobile Registered' ? 'active' :
        sim.status === 'Mobile Not Registered' ? 'inactive' : 'error',
      callStatus: sim.call_status,
      imsi: sim.imsi || 'N/A',
    }

    res.json(port)
  } catch (error) {
    console.error(`Error fetching GSM port ${req.params.id}:`, error)
    res.status(500).json({ error: 'Failed to fetch GSM port' })
  }
})

// Create GSM port
router.post('/', async (req, res) => {
  try {
    const { port, simNumber, operator, imsi } = req.body
    // TODO: Configure GSM port
    const newPort = { id: Date.now().toString(), port, simNumber, operator, signal: 0, battery: 0, status: 'inactive', imsi }
    res.status(201).json(newPort)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create GSM port' })
  }
})

// Update GSM port
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    // TODO: Update GSM port configuration
    res.json({ id, ...updates })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update GSM port' })
  }
})

// Test GSM port
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params
    // TODO: Test GSM port connection
    res.json({ message: 'GSM port test initiated', portId: id })
  } catch (error) {
    res.status(500).json({ error: 'Failed to test GSM port' })
  }
})

export default router

