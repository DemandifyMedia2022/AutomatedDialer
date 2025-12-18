import { Router } from 'express'
import { getSIPUsers, getSIPUser } from '../services/asteriskService.js'

const router = Router()

// Get all SIP users from Asterisk
router.get('/', async (req, res) => {
  try {
    const users = await getSIPUsers()
    res.json(users)
  } catch (error) {
    console.error('Error fetching SIP users:', error)
    res.status(500).json({ error: 'Failed to fetch SIP users from Asterisk' })
  }
})

// Get single SIP user from Asterisk
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await getSIPUser(id)
    if (!user) {
      return res.status(404).json({ error: 'SIP user not found' })
    }
    res.json(user)
  } catch (error) {
    console.error(`Error fetching SIP user ${req.params.id}:`, error)
    res.status(500).json({ error: 'Failed to fetch SIP user' })
  }
})

// Create SIP user
router.post('/', async (req, res) => {
  try {
    const { username, password, domain } = req.body
    // TODO: Create user in Asterisk/Kamailio
    const newUser = { id: Date.now().toString(), username, domain, status: 'active' }
    res.status(201).json(newUser)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create SIP user' })
  }
})

// Update SIP user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { username, password, domain } = req.body
    // TODO: Update user in Asterisk/Kamailio
    const updatedUser = { id, username, domain, status: 'active' }
    res.json(updatedUser)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SIP user' })
  }
})

// Delete SIP user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    // TODO: Delete user from Asterisk/Kamailio
    res.json({ message: 'SIP user deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete SIP user' })
  }
})

export default router

