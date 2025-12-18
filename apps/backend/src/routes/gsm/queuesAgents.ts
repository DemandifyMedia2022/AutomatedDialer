import { Router } from 'express'

const router = Router()

// Get all queues
router.get('/queues', async (req, res) => {
  try {
    // TODO: Query Asterisk queues
    const queues = [
      { id: '1', name: 'Sales Queue', strategy: 'ringall', members: 5, calls: 3, status: 'active' },
      { id: '2', name: 'Support Queue', strategy: 'leastrecent', members: 8, calls: 2, status: 'active' },
    ]
    res.json(queues)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queues' })
  }
})

// Create queue
router.post('/queues', async (req, res) => {
  try {
    const { name, strategy } = req.body
    // TODO: Create queue in Asterisk
    const queue = { id: Date.now().toString(), name, strategy, members: 0, calls: 0, status: 'active' }
    res.status(201).json(queue)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create queue' })
  }
})

// Get all agents
router.get('/agents', async (req, res) => {
  try {
    const agents = [
      { id: '1', name: 'John Doe', extension: '1001', status: 'available', callsHandled: 45, queue: 'Sales Queue' },
      { id: '2', name: 'Jane Smith', extension: '1002', status: 'busy', callsHandled: 32, queue: 'Sales Queue' },
    ]
    res.json(agents)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

// Add agent to queue
router.post('/agents', async (req, res) => {
  try {
    const { name, extension, queue } = req.body
    // TODO: Add agent to queue in Asterisk
    const agent = { id: Date.now().toString(), name, extension, status: 'available', callsHandled: 0, queue }
    res.status(201).json(agent)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add agent' })
  }
})

// Update agent status
router.put('/agents/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    // TODO: Update agent status in Asterisk
    res.json({ id, status })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update agent status' })
  }
})

export default router

