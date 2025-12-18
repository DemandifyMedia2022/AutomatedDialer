import { Router } from 'express'
import { sendSMS, getSessionCookie } from '../services/gsmGateway.js'

const router = Router()

// Get SMS history
router.get('/sms', async (req, res) => {
  try {
    const { port, startDate, endDate } = req.query
    // TODO: Query SMS database
    const sms = [
      { id: '1', number: '+1234567890', message: 'Test message', direction: 'outbound', status: 'delivered', timestamp: new Date(), gsmPort: 'COM1' },
      { id: '2', number: '+0987654321', message: 'Hello', direction: 'inbound', status: 'received', timestamp: new Date(), gsmPort: 'COM1' },
    ]
    res.json(sms)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMS' })
  }
})

// Send SMS
router.post('/sms', async (req, res) => {
  try {
    const { number, message, gsmPort } = req.body
    
    console.log('[SMS Route] Received SMS request:', { number, message: message?.substring(0, 50), gsmPort })
    
    if (!number || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' })
    }

    // Clean phone number - remove spaces, dashes, and ensure it starts with + or is digits only
    let cleanNumber = number.replace(/[\s\-\(\)]/g, '')
    if (!/^\+?\d+$/.test(cleanNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    }
    
    // Log the number format for debugging
    console.log(`[SMS Route] Phone number: ${cleanNumber} (length: ${cleanNumber.length})`)
    
    // Some gateways require international format - if number is 10 digits and doesn't start with +,
    // it might need country code. But we'll send as-is first and let gateway handle it.

    // Extract port index from COM format (COM0 -> 0, COM1 -> 1, etc.)
    let portIndex = 0
    if (gsmPort) {
      const portMatch = gsmPort.match(/COM(\d+)/)
      if (portMatch) {
        portIndex = parseInt(portMatch[1], 10)
      }
    }

    console.log(`[SMS Route] Sending SMS to ${cleanNumber} via port ${portIndex} (${gsmPort})`)

    // Send SMS via GSM gateway
    const result = await sendSMS(cleanNumber, message, portIndex)
    
    console.log('[SMS Route] SMS send result:', result)
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to send SMS',
        message: result.message || 'Unknown error'
      })
    }
    
    const sms = { 
      id: Date.now().toString(), 
      number: cleanNumber, 
      message, 
      direction: 'outbound', 
      status: 'sent', 
      timestamp: new Date(), 
      gsmPort: gsmPort || `COM${portIndex}` 
    }
    
    res.status(201).json(sms)
  } catch (error) {
    console.error('[SMS Route] Error sending SMS:', error)
    res.status(500).json({ 
      error: 'Failed to send SMS',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get USSD history
router.get('/ussd', async (req, res) => {
  try {
    const ussd = [
      { id: '1', code: '*100#', response: 'Balance: $50.00', status: 'success', timestamp: new Date(), gsmPort: 'COM1' },
      { id: '2', code: '*123#', response: 'Error: Invalid code', status: 'failed', timestamp: new Date(), gsmPort: 'COM2' },
    ]
    res.json(ussd)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch USSD history' })
  }
})

// Execute USSD
router.post('/ussd', async (req, res) => {
  try {
    const { code, gsmPort } = req.body
    // TODO: Execute USSD via GSM module
    const ussd = { id: Date.now().toString(), code, response: 'Response received', status: 'success', timestamp: new Date(), gsmPort }
    res.status(201).json(ussd)
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute USSD' })
  }
})

export default router

