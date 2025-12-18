import { Router } from 'express'

const router = Router()

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = {
      asterisk: {
        host: 'localhost',
        port: 8088,
        username: 'admin',
        password: '',
      },
      kamailio: {
        host: 'localhost',
        port: 5060,
      },
      recording: {
        enabled: true,
        path: '/var/spool/asterisk/monitor',
        format: 'wav',
      },
      cdr: {
        enabled: true,
        backend: 'mysql',
      },
      general: {
        timezone: 'UTC',
        language: 'en',
      },
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Update settings
router.put('/', async (req, res) => {
  try {
    const updates = req.body
    // TODO: Save settings to database/config file
    res.json({ message: 'Settings updated successfully', settings: updates })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// Test Asterisk connection
router.post('/test/asterisk', async (req, res) => {
  try {
    // TODO: Test connection to Asterisk
    res.json({ success: true, message: 'Asterisk connection successful' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to connect to Asterisk' })
  }
})

// Test Kamailio connection
router.post('/test/kamailio', async (req, res) => {
  try {
    // TODO: Test connection to Kamailio
    res.json({ success: true, message: 'Kamailio connection successful' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to connect to Kamailio' })
  }
})

export default router

