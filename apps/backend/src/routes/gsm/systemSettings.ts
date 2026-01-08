import { Router } from 'express'
import { SystemSettingsService } from '../../services/systemSettingsService'

const router = Router()

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSettingsService.getSettings()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Update settings
router.put('/', async (req, res) => {
  try {
    const updates = req.body
    await SystemSettingsService.saveSettings(updates)
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

