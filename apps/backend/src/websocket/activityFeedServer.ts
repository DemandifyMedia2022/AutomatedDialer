import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyJwt } from '../utils/jwt';
import { env } from '../config/env';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  role?: string;
  eventFilters?: Set<string>;
  subscriptions?: Set<'activity' | 'health' | 'metrics'>;
}

interface ActivityEvent {
  id: string;
  type: 'auth' | 'api' | 'database' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: any;
}

let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server for real-time activity feed
 */
export function initActivityFeedWs(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ 
    server,
    path: '/ws/activity-feed'
  });

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log('[ActivityFeed WS] New connection attempt');

    // Authenticate the WebSocket connection
    const authenticated = authenticateConnection(ws, req);
    
    if (!authenticated) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    console.log(`[ActivityFeed WS] User ${ws.userId} (${ws.role}) connected`);

    // Initialize event filters (default: all types)
    ws.eventFilters = new Set(['auth', 'api', 'database', 'error']);
    
    // Initialize subscriptions (default: activity only)
    ws.subscriptions = new Set(['activity']);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error('[ActivityFeed WS] Error parsing message:', error);
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`[ActivityFeed WS] User ${ws.userId} disconnected`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[ActivityFeed WS] WebSocket error:', error);
    });

    // Send initial connection success message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  });

  // Heartbeat to keep connections alive
  const heartbeatInterval = setInterval(() => {
    wss?.clients.forEach((ws: WebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('[ActivityFeed WS] WebSocket server initialized on /ws/activity-feed');
  return wss;
}

/**
 * Authenticate WebSocket connection using JWT token
 */
function authenticateConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): boolean {
  try {
    // Extract token from query parameters or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    let token = url.searchParams.get('token');

    // Try Authorization header if no token in query
    if (!token) {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7);
      }
    }

    // Try cookie if still no token
    if (!token && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies[env.AUTH_COOKIE_NAME];
    }

    if (!token) {
      console.log('[ActivityFeed WS] No token provided');
      return false;
    }

    // Verify JWT token
    const payload = verifyJwt(token);
    if (!payload) {
      console.log('[ActivityFeed WS] Invalid token');
      return false;
    }

    // Check if user is superadmin
    const role = String(payload.role || '').toLowerCase();
    if (role !== 'superadmin') {
      console.log('[ActivityFeed WS] User is not superadmin');
      return false;
    }

    // Store user info on WebSocket
    ws.userId = payload.userId;
    ws.role = role;

    return true;
  } catch (error) {
    console.error('[ActivityFeed WS] Authentication error:', error);
    return false;
  }
}

/**
 * Parse cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [key, ...valueParts] = cookie.trim().split('=');
    if (key) {
      cookies[key] = decodeURIComponent(valueParts.join('='));
    }
  });
  return cookies;
}

/**
 * Handle messages from client (e.g., filter updates, subscriptions)
 */
function handleClientMessage(ws: AuthenticatedWebSocket, message: any) {
  try {
    if (message.type === 'set_filters') {
      // Update event type filters
      const filters = message.filters;
      if (Array.isArray(filters)) {
        ws.eventFilters = new Set(filters.filter((f: string) => 
          ['auth', 'api', 'database', 'error'].includes(f)
        ));
        console.log(`[ActivityFeed WS] Updated filters for user ${ws.userId}:`, Array.from(ws.eventFilters));
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'filters_updated',
          filters: Array.from(ws.eventFilters),
          timestamp: new Date().toISOString()
        }));
      }
    } else if (message.type === 'subscribe') {
      // Update subscriptions
      const subscriptions = message.subscriptions;
      if (Array.isArray(subscriptions)) {
        ws.subscriptions = new Set(subscriptions.filter((s: string) => 
          ['activity', 'health', 'metrics'].includes(s)
        ));
        console.log(`[ActivityFeed WS] Updated subscriptions for user ${ws.userId}:`, Array.from(ws.subscriptions));
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'subscriptions_updated',
          subscriptions: Array.from(ws.subscriptions),
          timestamp: new Date().toISOString()
        }));
      }
    }
  } catch (error) {
    console.error('[ActivityFeed WS] Error handling client message:', error);
  }
}

// Rate limiting for broadcasts
let lastBroadcastTime = 0;
let broadcastCount = 0;
const BROADCAST_RATE_LIMIT = 10; // Max 10 broadcasts per second
const BROADCAST_WINDOW = 1000; // 1 second window

/**
 * Broadcast activity event to all connected superadmin clients
 */
export function broadcastActivityEvent(event: ActivityEvent) {
  if (!wss) {
    return;
  }

  // Rate limiting to prevent spam
  const now = Date.now();
  if (now - lastBroadcastTime < BROADCAST_WINDOW) {
    broadcastCount++;
    if (broadcastCount > BROADCAST_RATE_LIMIT) {
      // Silently drop excessive broadcasts
      return;
    }
  } else {
    // Reset counter for new window
    lastBroadcastTime = now;
    broadcastCount = 1;
  }

  const eventData = JSON.stringify({
    type: 'activity_event',
    event: {
      ...event,
      timestamp: event.timestamp.toISOString()
    }
  });

  let sentCount = 0;
  wss.clients.forEach((client: WebSocket) => {
    const ws = client as AuthenticatedWebSocket;
    
    // Only send to authenticated superadmin clients
    if (ws.readyState === WebSocket.OPEN && ws.role === 'superadmin') {
      // Check if client has this event type in their filters
      if (!ws.eventFilters || ws.eventFilters.has(event.type)) {
        ws.send(eventData);
        sentCount++;
      }
    }
  });

  // Only log occasionally to reduce console spam
  if (broadcastCount % 5 === 0 || event.severity === 'error' || event.severity === 'critical') {
    console.log(`[ActivityFeed WS] Broadcasted ${event.type} event to ${sentCount} clients`);
  }
}

/**
 * Broadcast system health update to subscribed clients
 */
export function broadcastSystemHealth(healthData: any) {
  if (!wss) {
    return;
  }

  const message = JSON.stringify({
    type: 'system_health',
    data: healthData,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((client: WebSocket) => {
    const ws = client as AuthenticatedWebSocket;
    
    // Only send to authenticated superadmin clients subscribed to health updates
    if (ws.readyState === WebSocket.OPEN && 
        ws.role === 'superadmin' && 
        ws.subscriptions?.has('health')) {
      ws.send(message);
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`[ActivityFeed WS] Broadcasted system health to ${sentCount} clients`);
  }
}

/**
 * Broadcast metrics update to subscribed clients
 */
export function broadcastMetrics(metricsData: any) {
  if (!wss) {
    return;
  }

  const message = JSON.stringify({
    type: 'metrics_update',
    data: metricsData,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((client: WebSocket) => {
    const ws = client as AuthenticatedWebSocket;
    
    // Only send to authenticated superadmin clients subscribed to metrics updates
    if (ws.readyState === WebSocket.OPEN && 
        ws.role === 'superadmin' && 
        ws.subscriptions?.has('metrics')) {
      ws.send(message);
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`[ActivityFeed WS] Broadcasted metrics to ${sentCount} clients`);
  }
}

/**
 * Get WebSocket server instance
 */
export function getActivityFeedWss(): WebSocketServer | null {
  return wss;
}

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
