import fetch from 'node-fetch'
import https from 'https'

const GATEWAY_URL = process.env.GSM_GATEWAY_URL || 'https://192.168.0.50'
const GATEWAY_USERNAME = process.env.GSM_GATEWAY_USERNAME || 'admin'
const GATEWAY_PASSWORD = process.env.GSM_GATEWAY_PASSWORD || 'Demandify@765'

// Create an agent that ignores self-signed certificates (for internal network devices)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Allow self-signed certificates for internal devices
})

// Store session cookie
let sessionCookie: string | null = null

// Export function to get session cookie (for use in other routes)
export async function getSessionCookie(): Promise<string> {
  if (!sessionCookie) {
    await authenticate()
  }
  return sessionCookie || ''
}

/**
 * Authenticate with the GSM gateway and get a session cookie
 */
async function authenticate(): Promise<string> {
  try {
    const response = await fetch(`${GATEWAY_URL}/goform/IADIdentityAuth`, {
      method: 'POST',
      headers: {
        'Origin': GATEWAY_URL,
        'Referer': `${GATEWAY_URL}/enLogin.htm`,
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `username=${encodeURIComponent(GATEWAY_USERNAME)}&password=${encodeURIComponent(GATEWAY_PASSWORD)}`,
      // @ts-ignore - node-fetch v3 supports agent option
      agent: httpsAgent,
      redirect: 'manual', // Don't follow redirects automatically
    })

    // Extract cookie from Set-Cookie header
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      // Extract JSESSIONID value
      const match = setCookieHeader.match(/JSESSIONID=([^;]+)/)
      if (match) {
        sessionCookie = `JSESSIONID=${match[1]}`
        console.log('GSM Gateway authentication successful')
        return sessionCookie
      }
    }

    throw new Error('Failed to get session cookie from authentication response')
  } catch (error) {
    console.error('GSM Gateway authentication failed:', error)
    throw error
  }
}

export interface SIMStatus {
  port: string
  status: string
  signal: number
  operator: string
  call_status: string
  call_limit?: string
  simNumber?: string
  imsi?: string
  imei?: string
  iccid?: string
  battery?: number
  type?: string
  network?: string
  asr?: string
  acd?: string
  pdd?: string
}

export async function getSimStatus(): Promise<SIMStatus[]> {
  try {
    // Authenticate if we don't have a session cookie
    if (!sessionCookie) {
      await authenticate()
    }

    const response = await fetch(`${GATEWAY_URL}/WebGetPortInfoAll`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie || '',
        'Accept': 'application/json',
      },
      // @ts-ignore - node-fetch v3 supports agent option
      agent: httpsAgent,
    })

    // If we get HTML back, likely session expired - re-authenticate and retry once
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json') || response.status === 401 || response.status === 403) {
      console.log('Session expired, re-authenticating...')
      await authenticate()

      // Retry with new session
      const retryResponse = await fetch(`${GATEWAY_URL}/WebGetPortInfoAll`, {
        method: 'GET',
        headers: {
          'Cookie': sessionCookie || '',
          'Accept': 'application/json',
        },
        // @ts-ignore
        agent: httpsAgent,
      })

      if (!retryResponse.ok) {
        const text = await retryResponse.text()
        console.error(`Gateway API error ${retryResponse.status}:`, text.substring(0, 200))
        throw new Error(`Gateway API error: ${retryResponse.status} ${retryResponse.statusText}`)
      }

      const data = await retryResponse.json()
      return transformSimData(data)
    }

    if (!response.ok) {
      const text = await response.text()
      console.error(`Gateway API error ${response.status}:`, text.substring(0, 200))
      throw new Error(`Gateway API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return transformSimData(data)
  } catch (error) {
    console.error('Error fetching SIM status:', error)
    throw error
  }
}

/**
 * Transform the gateway response to our SIMStatus format
 */
function transformSimData(data: any): SIMStatus[] {
  // Filter out the "Total" entry if present
  const sims = Array.isArray(data) ? data.filter((item: any) => item.port !== 'Total') : []

  return sims.map((sim: any) => ({
    port: String(sim.port || '0'),
    status: sim.status || 'Unknown',
    signal: Number(sim.signal) || 0,
    operator: sim.operator || 'Unknown',
    call_status: sim.call_status || 'Idle',
    simNumber: sim.iccid || sim.phoneNumber, // Use ICCID as SIM identifier
    imsi: sim.imsi || '',
    imei: sim.imei || '',
    iccid: sim.iccid || '',
    battery: sim.battery,
    type: sim.type || '',
    network: sim.network || '',
    call_limit: sim.call_limit || '',
    asr: sim.asr || '0',
    acd: sim.acd || '0',
    pdd: sim.pdd || '0',
  }))
}

export async function getSimStatusByPort(port: string): Promise<SIMStatus | null> {
  try {
    const allSims = await getSimStatus()
    return allSims.find(sim => sim.port === port) || null
  } catch (error) {
    console.error(`Error fetching SIM status for port ${port}:`, error)
    throw error
  }
}

/**
 * Send SMS via GSM gateway
 * @param phoneNumber - Phone number to send SMS to
 * @param message - SMS message content
 * @param portIndex - Port index (0-based: 0=COM0, 1=COM1, etc.)
 */
export async function sendSMS(phoneNumber: string, message: string, portIndex: number = 0): Promise<{ success: boolean; message?: string }> {
  try {
    // Always authenticate first to ensure we have a fresh session cookie
    // This matches the pattern used in getSimStatus()
    if (!sessionCookie) {
      await authenticate()
    }

    // Get a fresh cookie by calling getSimStatus first (which handles authentication)
    // This ensures we're using the same authenticated session
    try {
      await getSimStatus()
      console.log('[SMS] Using authenticated session cookie for SMS sending')
    } catch (authError) {
      console.warn('[SMS] Could not verify session via getSimStatus, proceeding anyway:', authError)
      // Continue - we'll try to authenticate if SMS fails
    }

    // Check if port is registered and available before sending
    try {
      const simStatus = await getSimStatus()
      const portStatus = simStatus.find(sim => sim.port === String(portIndex))
      if (portStatus) {
        console.log(`[SMS] Port ${portIndex} status: ${portStatus.status}, signal: ${portStatus.signal}, call_status: ${portStatus.call_status}`)
        if (portStatus.status !== 'Mobile Registered') {
          return {
            success: false,
            message: `Port COM${portIndex} is not registered. Status: ${portStatus.status}`
          }
        }
        // Check if port is busy on a call
        if (portStatus.call_status && portStatus.call_status !== 'Idle') {
          return {
            success: false,
            message: `Port COM${portIndex} is busy. Call status: ${portStatus.call_status}`
          }
        }
      }
    } catch (statusError) {
      console.warn('[SMS] Could not check port status:', statusError)
      // Continue anyway - port check is not critical
    }

    // Ensure phone number has proper format
    // Based on curl command, gateway expects local format (10 digits) without country code
    let formattedNumber = phoneNumber.trim()
    // Remove any spaces, dashes, parentheses, and + signs
    formattedNumber = formattedNumber.replace(/[\s\-\(\)\+]/g, '')

    // Remove country code if present (91 prefix for India)
    if (formattedNumber.startsWith('91') && formattedNumber.length === 12) {
      formattedNumber = formattedNumber.substring(2)
      console.log(`[SMS] Removed country code, using local format: ${formattedNumber}`)
    }

    // Gateway expects local format (10 digits) as per curl command example
    // If number is not 10 digits, log warning
    if (formattedNumber.length !== 10) {
      console.log(`[SMS] Warning: Phone number length is ${formattedNumber.length}, expected 10 digits for local format`)
    }

    console.log(`[SMS] Phone number format: ${formattedNumber} (original: ${phoneNumber}, length: ${formattedNumber.length})`)

    // Build form data exactly as per curl command
    // Index1=on for port 0, Index2=on for port 1, etc.
    const formData = new URLSearchParams()
    const indexKey = `Index${portIndex + 1}` // Index1 for port 0, Index2 for port 1, etc.
    formData.append(indexKey, 'on')
    formData.append('SendMode', '0')
    formData.append('Addressee', formattedNumber) // Use formatted number
    formData.append('Encoding', '0')
    formData.append('MsgInfo', message)
    formData.append('ok', 'Send')

    console.log(`[SMS] Sending SMS to ${phoneNumber} via port ${portIndex} (${indexKey})`)
    console.log(`[SMS] Form data: ${formData.toString()}`)
    console.log(`[SMS] Session cookie: ${sessionCookie ? 'Present' : 'Missing'}`)

    const response = await fetch(`${GATEWAY_URL}/goform/WIAMsgSend`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie || '',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': GATEWAY_URL,
        'Referer': `${GATEWAY_URL}/enFrame.htm`,
        'User-Agent': 'Mozilla/5.0',
      },
      body: formData.toString(),
      // @ts-ignore - node-fetch v3 supports agent option
      agent: httpsAgent,
      redirect: 'follow', // Follow redirects to see final response
    })

    console.log(`[SMS] Response status: ${response.status}`)
    console.log(`[SMS] Response headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`[SMS] Response body (first 500 chars):`, responseText.substring(0, 500))
    console.log(`[SMS] Full response body length:`, responseText.length)
    // Log more of the response to see error details
    if (responseText.length > 500) {
      console.log(`[SMS] Response body (chars 500-1000):`, responseText.substring(500, 1000))
    }

    // Check if we got HTML back (likely session expired) - same check as getSimStatus()
    const contentType = response.headers.get('content-type') || ''
    const isLoginPage = responseText.includes('login') ||
      responseText.includes('Login') ||
      responseText.includes('IADIdentityAuth') ||
      responseText.includes('enLogin.htm') ||
      (!contentType.includes('application/json') && (response.status === 401 || response.status === 403))

    // If session expired, re-authenticate and retry (same pattern as getSimStatus)
    if (isLoginPage) {
      console.log('[SMS] Session expired (detected login page), re-authenticating and retrying SMS...')
      await authenticate()

      // Also refresh session by calling getSimStatus to ensure cookie is valid
      try {
        await getSimStatus()
      } catch (e) {
        console.warn('[SMS] Could not refresh session via getSimStatus:', e)
      }

      // Retry with new session
      console.log(`[SMS] Retrying SMS to ${phoneNumber} via port ${portIndex}`)
      const retryResponse = await fetch(`${GATEWAY_URL}/goform/WIAMsgSend`, {
        method: 'POST',
        headers: {
          'Cookie': sessionCookie || '',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': GATEWAY_URL,
          'Referer': `${GATEWAY_URL}/enFrame.htm`,
          'User-Agent': 'Mozilla/5.0',
        },
        body: formData.toString(),
        // @ts-ignore
        agent: httpsAgent,
        redirect: 'follow', // Follow redirects to see final response
      })

      const retryText = await retryResponse.text()
      console.log(`[SMS] Retry response status: ${retryResponse.status}`)
      console.log(`[SMS] Retry response body (first 500 chars):`, retryText.substring(0, 500))

      // Check for failure indicators first
      const retryIsFailure = retryText.includes('Send Fail') ||
        retryText.includes('send fail') ||
        retryText.includes('SendFail') ||
        retryText.includes('FAIL') ||
        retryText.includes('Fail') ||
        retryText.includes('fail') ||
        retryText.includes('Error') ||
        retryText.includes('error') ||
        retryText.includes('ERROR')

      const retryIsSuccess = !retryIsFailure && (
        retryResponse.ok ||
        retryResponse.status === 302 ||
        retryResponse.status === 200 ||
        retryText.includes('success') ||
        retryText.includes('Success') ||
        retryText.includes('sent') ||
        retryText.includes('Sent') ||
        retryText.includes('Send Success') ||
        retryText.includes('send success')
      )

      if (retryIsSuccess) {
        console.log(`[SMS] SMS sent successfully to ${phoneNumber} via port ${portIndex} (after re-auth)`)
        return { success: true, message: 'SMS sent successfully' }
      } else {
        // Try to extract error message from HTML response
        let errorMessage = 'Failed to send SMS'
        const errorMatch = retryText.match(/<title>([^<]+)<\/title>/i) ||
          retryText.match(/Send Fail[^<]*/i) ||
          retryText.match(/Error[^<]*/i)
        if (errorMatch) {
          errorMessage = errorMatch[1] || errorMatch[0] || 'Send Fail'
        }

        console.error(`[SMS] SMS send failed after retry: ${retryResponse.status} - ${errorMessage}`)
        return {
          success: false,
          message: `${errorMessage} (Status: ${retryResponse.status})`
        }
      }
    }

    // Check for failure indicators first (more specific)
    const isFailure = responseText.includes('Send Fail') ||
      responseText.includes('send fail') ||
      responseText.includes('SendFail') ||
      responseText.includes('FAIL') ||
      responseText.includes('Fail') ||
      responseText.includes('fail') ||
      responseText.includes('Error') ||
      responseText.includes('error') ||
      responseText.includes('ERROR')

    // Check if request was successful
    // Gateway typically returns 200 with HTML or 302 redirect on success
    // Check for success indicators in the response
    const isSuccess = !isFailure && (
      response.ok ||
      response.status === 302 ||
      response.status === 200 ||
      responseText.includes('success') ||
      responseText.includes('Success') ||
      responseText.includes('sent') ||
      responseText.includes('Sent') ||
      responseText.includes('Send Success') ||
      responseText.includes('send success')
    )

    if (isSuccess) {
      console.log(`[SMS] SMS sent successfully to ${phoneNumber} via port ${portIndex}`)
      return { success: true, message: 'SMS sent successfully' }
    } else {
      // Try to extract error message from HTML response
      let errorMessage = 'Failed to send SMS'
      const errorMatch = responseText.match(/<title>([^<]+)<\/title>/i) ||
        responseText.match(/Send Fail[^<]*/i) ||
        responseText.match(/Error[^<]*/i)
      if (errorMatch) {
        errorMessage = errorMatch[1] || errorMatch[0] || 'Send Fail'
      }

      // Try to find more detailed error message in the body
      const bodyMatch = responseText.match(/<body[^>]*>([\s\S]{0,500})/i)
      if (bodyMatch) {
        const bodyText = bodyMatch[1]
        // Look for common error patterns
        const detailedError = bodyText.match(/([^<>]{20,200})/g)
        if (detailedError) {
          console.log(`[SMS] Detailed error from body:`, detailedError.join(' ').substring(0, 200))
        }
      }

      console.error(`[SMS] SMS send failed: ${response.status} - ${errorMessage}`)
      console.error(`[SMS] Full response for debugging:`, responseText)
      return {
        success: false,
        message: `${errorMessage} (Status: ${response.status})`
      }
    }
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

