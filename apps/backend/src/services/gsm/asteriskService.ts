import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface AsteriskEndpoint {
  endpoint: string
  state: string
  channels: string
  authId: string
  aor: string
  contact: string
  contactStatus: string
  transport: string
  ipAddress?: string
  port?: string
  lastRegistration?: string
}

interface AsteriskSIPUser {
  id: string
  username: string
  domain: string
  status: 'active' | 'inactive'
  registration: 'Registered' | 'Not Registered'
  ipAddress?: string
  port?: string
  lastRegistration?: string
  transport?: string
}

/**
 * Execute Asterisk CLI command and return output
 */
async function executeAsteriskCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`sudo asterisk -rx "${command}"`)
    if (stderr && !stderr.includes('Connected to')) {
      console.error('Asterisk CLI stderr:', stderr)
    }
    return stdout.trim()
  } catch (error: any) {
    console.error(`Error executing Asterisk command: ${command}`, error.message)
    throw error
  }
}

/**
 * Parse pjsip show endpoints output
 */
function parseEndpointsOutput(output: string): AsteriskEndpoint[] {
  const lines = output.split('\n')
  const endpoints: AsteriskEndpoint[] = []
  let inDataSection = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines and separator lines
    if (!line || line.startsWith('=')) {
      if (line.includes('Endpoint:')) {
        inDataSection = true
      }
      continue
    }
    
    if (!inDataSection) continue
    
    // Parse endpoint line format (flexible to handle variations):
    // Endpoint: 600    Unavailable  0 of inf  InAuth: 600-auth/600  Aor: 600  1  Transport: transport-wss wss 0 0 0.0.0.0:8089
    // Or: Endpoint: 600    Available  0 of inf  InAuth: 600-auth/600  Aor: 600  1  Transport: transport-wss
    const endpointMatch = line.match(/^Endpoint:\s+(\S+)/)
    if (endpointMatch) {
      const endpoint = endpointMatch[1]
      
      // Extract state (Available, Unavailable, Not in use, etc.)
      const stateMatch = line.match(/Endpoint:\s+\S+\s+(\S+)/)
      const state = stateMatch ? stateMatch[1] : 'Unknown'
      
      // Extract AOR
      const aorMatch = line.match(/Aor:\s+(\S+)/)
      const aor = aorMatch ? aorMatch[1] : endpoint
      
      // Extract Auth ID
      const authMatch = line.match(/InAuth:\s+(\S+)/)
      const authId = authMatch ? authMatch[1].split('/')[0] : `${endpoint}-auth`
      
      // Extract Transport
      const transportMatch = line.match(/Transport:\s+(\S+)/)
      const transport = transportMatch ? transportMatch[1] : 'transport-udp'
      
      // Extract channels count
      const channelsMatch = line.match(/Endpoint:\s+\S+\s+\S+\s+(\d+)\s+of/)
      const channels = channelsMatch ? channelsMatch[1] : '0'
      
      endpoints.push({
        endpoint,
        state,
        channels,
        authId,
        aor,
        contact: '',
        contactStatus: '',
        transport,
      })
    }
  }
  
  return endpoints
}

/**
 * Parse pjsip show contacts output to get registration details
 */
function parseContactsOutput(output: string): Map<string, { contact: string; status: string; ipAddress?: string; port?: string }> {
  const contacts = new Map<string, { contact: string; status: string; ipAddress?: string; port?: string }>()
  const lines = output.split('\n')
  let inDataSection = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines and separator lines
    if (!line || line.startsWith('=')) {
      if (line.includes('Contact:')) {
        inDataSection = true
      }
      continue
    }
    
    if (!inDataSection) continue
    
    // Parse contact line format (flexible):
    // Contact: 600/sip:600@192.168.0.100:5060;transport=udp  3bccb3db80  Avail  2.158  Transport: transport-udp udp 0 0 0.0.0.0:5060
    // Or: Contact: 600-aor/sip:600@192.168.0.100:5060  3bccb3db80  Avail  2.158
    const contactMatch = line.match(/^Contact:\s+(\S+)\/(\S+)/)
    if (contactMatch) {
      const aorFull = contactMatch[1]
      const contactUri = contactMatch[2]
      
      // Extract AOR name (remove -aor suffix if present)
      const aor = aorFull.replace(/-aor$/, '')
      
      // Extract status (Avail, Unavail, etc.)
      const statusMatch = line.match(/\s+(\S+)\s+([\d.]+)/)
      const status = statusMatch ? statusMatch[1] : 'Unknown'
      
      // Extract IP and port from contact URI
      const uriMatch = contactUri.match(/sip:.*@([\d.]+):?(\d+)?/)
      const ipAddress = uriMatch ? uriMatch[1] : undefined
      const port = uriMatch ? uriMatch[2] : undefined
      
      contacts.set(aor, {
        contact: contactUri,
        status,
        ipAddress,
        port,
      })
    }
  }
  
  return contacts
}

/**
 * Get all SIP users from Asterisk with their registration status
 */
export async function getSIPUsers(): Promise<AsteriskSIPUser[]> {
  try {
    // Get endpoints
    const endpointsOutput = await executeAsteriskCommand('pjsip show endpoints')
    const endpoints = parseEndpointsOutput(endpointsOutput)
    
    // Get contacts (registration details)
    const contactsOutput = await executeAsteriskCommand('pjsip show contacts')
    const contacts = parseContactsOutput(contactsOutput)
    
    // Combine endpoint and contact data
    const users: AsteriskSIPUser[] = endpoints.map((endpoint) => {
      const contact = contacts.get(endpoint.aor)
      // Check if registered: state is "Available" or contact status is "Avail"
      const isRegistered = endpoint.state === 'Available' || 
                          endpoint.state === 'Not in use' && contact?.status === 'Avail' ||
                          (contact && contact.status === 'Avail')
      
      return {
        id: endpoint.endpoint,
        username: endpoint.endpoint,
        domain: '192.168.0.238', // Default domain, can be extracted from config if needed
        status: isRegistered ? 'active' : 'inactive',
        registration: isRegistered ? 'Registered' : 'Not Registered',
        ipAddress: contact?.ipAddress,
        port: contact?.port,
        transport: endpoint.transport,
        lastRegistration: contact ? new Date().toISOString() : undefined, // Approximate, actual time would need more parsing
      }
    })
    
    // Sort by username for consistent display
    users.sort((a, b) => a.username.localeCompare(b.username))
    
    return users
  } catch (error: any) {
    console.error('Error fetching SIP users from Asterisk:', error)
    // Return empty array on error instead of throwing
    return []
  }
}

/**
 * Get single SIP user details
 */
export async function getSIPUser(username: string): Promise<AsteriskSIPUser | null> {
  try {
    const users = await getSIPUsers()
    return users.find(u => u.username === username) || null
  } catch (error: any) {
    console.error(`Error fetching SIP user ${username}:`, error)
    return null
  }
}

/**
 * Get detailed endpoint information
 */
export async function getEndpointDetails(endpoint: string): Promise<any> {
  try {
    const output = await executeAsteriskCommand(`pjsip show endpoint ${endpoint}`)
    // Parse detailed endpoint info (this is more complex, returning raw for now)
    return { raw: output }
  } catch (error: any) {
    console.error(`Error fetching endpoint details for ${endpoint}:`, error)
    return null
  }
}
