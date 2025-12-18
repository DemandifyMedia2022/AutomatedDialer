import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

// Routes
import sipUsersRoutes from './sipUsers.js'
import gsmPortsRoutes from './gsmPorts.js'
import callLogsRoutes from './callLogs.js'
import callRecordingsRoutes from './callRecordings.js'
import liveCallsRoutes from './liveCalls.js'
import smsUssdRoutes from './smsUssd.js'
import queuesAgentsRoutes from './queuesAgents.js'
import ivrBuilderRoutes from './ivrBuilder.js'
import systemSettingsRoutes from './systemSettings.js'
import dashboardRoutes from './dashboard.js'
import dialerRoutes from './dialer.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 5001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/dialer', dialerRoutes)
app.use('/api/sip-users', sipUsersRoutes)
app.use('/api/gsm-ports', gsmPortsRoutes)
app.use('/api/call-logs', callLogsRoutes)
app.use('/api/call-recordings', callRecordingsRoutes)
app.use('/api/live-calls', liveCallsRoutes)
app.use('/api/sms-ussd', smsUssdRoutes)
app.use('/api/queues-agents', queuesAgentsRoutes)
app.use('/api/ivr-builder', ivrBuilderRoutes)
app.use('/api/system-settings', systemSettingsRoutes)

// WebSocket server for live updates
const server = createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
    console.log('WebSocket client connected')

    ws.on('message', (message) => {
        console.log('Received:', message.toString())
    })

    ws.on('close', () => {
        console.log('WebSocket client disconnected')
    })
})

// Broadcast function for live call updates
export const broadcastLiveCalls = (data: any) => {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'live-calls', data }))
        }
    })
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Accessible on network at http://0.0.0.0:${PORT}`)
}).on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`)
        console.error(`\nTo fix this, you can:`)
        console.error(`1. Kill the process using port ${PORT}:`)
        console.error(`   lsof -ti:${PORT} | xargs kill -9`)
        console.error(`2. Or change the port in .env file or use a different port:`)
        console.error(`   PORT=5001 npm run dev`)
        console.error(`\nCurrent process using port ${PORT}:`)
        process.exit(1)
    } else {
        console.error('Server error:', err)
        process.exit(1)
    }
})

