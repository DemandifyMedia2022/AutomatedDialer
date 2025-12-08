# API Documentation

## API Overview

The Automated Dialer backend exposes a RESTful API for managing calls, campaigns, agents, and system operations.

**Base URL (Development):** `http://localhost:4000/api`  
**Base URL (Production):** `https://your-domain.com/api`

## API Conventions

### Request Format

- **Content-Type:** `application/json`
- **Authentication:** Bearer token in Authorization header (when implemented)
- **Date Format:** ISO 8601 (e.g., `2025-11-13T10:00:00Z`)

### Response Format

All API responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Pagination

Endpoints that return lists support pagination:

**Request:**
```
GET /api/calls?page=1&limit=20&sortBy=createdAt&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering

Use query parameters for filtering:

```
GET /api/calls?status=answered&direction=outbound&startDate=2025-11-01&endDate=2025-11-13
```

## Authentication Endpoints

### POST /api/auth/login

Authenticate user and receive access token.

**Request:**
```json
{
  "email": "agent@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "agent@example.com",
      "role": "agent",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### POST /api/auth/register

Register a new user (admin only).

**Request:**
```json
{
  "email": "newagent@example.com",
  "password": "securePassword123",
  "name": "Jane Smith",
  "role": "agent"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "email": "newagent@example.com",
      "role": "agent",
      "name": "Jane Smith"
    }
  },
  "message": "User created successfully"
}
```

### POST /api/auth/logout

Logout current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

## Health Check Endpoints

### GET /api/health

Check application and database health.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "db": "connected",
  "timestamp": "2025-11-13T10:00:00Z",
  "uptime": 3600
}
```

**Response (503) - Unhealthy:**
```json
{
  "success": false,
  "status": "unhealthy",
  "db": "disconnected",
  "timestamp": "2025-11-13T10:00:00Z"
}
```

## Call Management Endpoints

### GET /api/calls

Retrieve call history with filters.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (answered, no_answer, busy, failed)
- `direction` (string): Filter by direction (inbound, outbound)
- `agentId` (number): Filter by agent ID
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `query` (string): Search by destination or extension

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "agentId": 1,
      "agentName": "John Doe",
      "destination": "+1234567890",
      "extension": "1001",
      "direction": "outbound",
      "status": "answered",
      "duration": 125,
      "startTime": "2025-11-13T09:30:00Z",
      "endTime": "2025-11-13T09:32:05Z",
      "recordingUrl": "/api/recordings/1",
      "metadata": {
        "campaignId": 5,
        "leadId": 123
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### GET /api/calls/:id

Retrieve specific call details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "agentId": 1,
    "agentName": "John Doe",
    "destination": "+1234567890",
    "extension": "1001",
    "direction": "outbound",
    "status": "answered",
    "duration": 125,
    "startTime": "2025-11-13T09:30:00Z",
    "endTime": "2025-11-13T09:32:05Z",
    "recordingUrl": "/api/recordings/1",
    "metadata": {
      "campaignId": 5,
      "leadId": 123,
      "disposition": "interested"
    }
  }
}
```

### POST /api/calls

Create a new call record (CDR).

**Request:**
```json
{
  "agentId": 1,
  "destination": "+1234567890",
  "direction": "outbound",
  "status": "answered",
  "duration": 125,
  "startTime": "2025-11-13T09:30:00Z",
  "endTime": "2025-11-13T09:32:05Z",
  "metadata": {
    "campaignId": 5,
    "leadId": 123
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "agentId": 1,
    "destination": "+1234567890",
    "direction": "outbound",
    "status": "answered",
    "duration": 125,
    "startTime": "2025-11-13T09:30:00Z",
    "endTime": "2025-11-13T09:32:05Z"
  },
  "message": "Call record created successfully"
}
```

### POST /api/calls/upload-recording

Upload call recording file.

**Request (multipart/form-data):**
```
POST /api/calls/upload-recording
Content-Type: multipart/form-data

callId: 1
recording: <audio file>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "callId": 1,
    "recordingUrl": "/api/recordings/1",
    "filename": "recording_1_20251113_093000.webm",
    "size": 245678
  },
  "message": "Recording uploaded successfully"
}
```

### GET /api/recordings/:id

Download or stream call recording.

**Response (200):**
- Content-Type: audio/webm (or appropriate audio type)
- Binary audio data

## Campaign Management Endpoints

### GET /api/campaigns

Retrieve campaigns list.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status` (string): active, paused, completed
- `agentId` (number): Filter by agent

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Q4 Sales Campaign",
      "status": "active",
      "agentId": 1,
      "agentName": "John Doe",
      "totalLeads": 500,
      "completedLeads": 150,
      "successRate": 30.5,
      "createdAt": "2025-11-01T00:00:00Z",
      "updatedAt": "2025-11-13T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/campaigns/:id

Retrieve specific campaign details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Q4 Sales Campaign",
    "description": "End of year sales push",
    "status": "active",
    "agentId": 1,
    "agentName": "John Doe",
    "totalLeads": 500,
    "completedLeads": 150,
    "successRate": 30.5,
    "settings": {
      "dialingMode": "auto",
      "callDelay": 5,
      "maxAttempts": 3
    },
    "createdAt": "2025-11-01T00:00:00Z",
    "updatedAt": "2025-11-13T10:00:00Z"
  }
}
```

### POST /api/campaigns

Create a new campaign.

**Request:**
```json
{
  "name": "Q4 Sales Campaign",
  "description": "End of year sales push",
  "agentId": 1,
  "settings": {
    "dialingMode": "auto",
    "callDelay": 5,
    "maxAttempts": 3
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Q4 Sales Campaign",
    "status": "active",
    "agentId": 1
  },
  "message": "Campaign created successfully"
}
```

### PUT /api/campaigns/:id

Update campaign details.

**Request:**
```json
{
  "name": "Q4 Sales Campaign - Updated",
  "status": "paused",
  "settings": {
    "callDelay": 10
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Q4 Sales Campaign - Updated",
    "status": "paused"
  },
  "message": "Campaign updated successfully"
}
```

### DELETE /api/campaigns/:id

Delete a campaign.

**Response (204):**
No content

## Lead Management Endpoints

### GET /api/leads

Retrieve leads list.

**Query Parameters:**
- `campaignId` (number): Filter by campaign
- `status` (string): new, contacted, interested, not_interested
- `page`, `limit`: Pagination

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "campaignId": 1,
      "phoneNumber": "+1234567890",
      "name": "Jane Customer",
      "email": "jane@example.com",
      "status": "contacted",
      "lastContactedAt": "2025-11-13T09:30:00Z",
      "attempts": 1,
      "metadata": {
        "company": "Acme Corp",
        "notes": "Interested in product demo"
      }
    }
  ],
  "pagination": { ... }
}
```

### POST /api/leads

Create a new lead.

**Request:**
```json
{
  "campaignId": 1,
  "phoneNumber": "+1234567890",
  "name": "Jane Customer",
  "email": "jane@example.com",
  "metadata": {
    "company": "Acme Corp"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "campaignId": 1,
    "phoneNumber": "+1234567890",
    "name": "Jane Customer",
    "status": "new"
  },
  "message": "Lead created successfully"
}
```

### POST /api/leads/bulk-upload

Upload leads from CSV/XLSX file.

**Request (multipart/form-data):**
```
POST /api/leads/bulk-upload
Content-Type: multipart/form-data

campaignId: 1
file: <CSV/XLSX file>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 450,
    "duplicates": 50,
    "errors": 0,
    "campaignId": 1
  },
  "message": "Leads imported successfully"
}
```

### PUT /api/leads/:id

Update lead information.

**Request:**
```json
{
  "status": "interested",
  "metadata": {
    "notes": "Scheduled demo for next week"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "interested",
    "updatedAt": "2025-11-13T10:00:00Z"
  },
  "message": "Lead updated successfully"
}
```

## Agent Management Endpoints

### GET /api/agents

Retrieve agents list (Manager/Admin only).

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "extension": "1001",
      "status": "available",
      "sipUsername": "agent1001",
      "stats": {
        "totalCalls": 150,
        "answeredCalls": 120,
        "avgDuration": 180,
        "successRate": 80
      }
    }
  ]
}
```

### GET /api/agents/:id

Retrieve specific agent details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "extension": "1001",
    "status": "available",
    "sipUsername": "agent1001",
    "sipPassword": "encrypted_password",
    "stats": {
      "totalCalls": 150,
      "answeredCalls": 120,
      "avgDuration": 180,
      "successRate": 80
    },
    "activeCampaigns": [1, 2, 3]
  }
}
```

### POST /api/agents

Create a new agent (Admin only).

**Request:**
```json
{
  "userId": 2,
  "extension": "1002",
  "sipUsername": "agent1002",
  "sipPassword": "securePassword"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "userId": 2,
    "extension": "1002",
    "sipUsername": "agent1002"
  },
  "message": "Agent created successfully"
}
```

### PUT /api/agents/:id/status

Update agent status.

**Request:**
```json
{
  "status": "busy"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "busy",
    "updatedAt": "2025-11-13T10:00:00Z"
  }
}
```

## Statistics Endpoints

### GET /api/stats/dashboard

Get dashboard statistics.

**Query Parameters:**
- `startDate`, `endDate`: Date range
- `agentId`: Filter by agent (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalCalls": 1500,
    "answeredCalls": 1200,
    "avgDuration": 180,
    "totalDuration": 216000,
    "successRate": 80,
    "callsByStatus": {
      "answered": 1200,
      "no_answer": 200,
      "busy": 50,
      "failed": 50
    },
    "callsByHour": [
      { "hour": 9, "count": 150 },
      { "hour": 10, "count": 200 }
    ],
    "topAgents": [
      {
        "agentId": 1,
        "name": "John Doe",
        "totalCalls": 300,
        "successRate": 85
      }
    ]
  }
}
```

## Error Codes Reference

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Invalid email or password |
| `UNAUTHORIZED` | Missing or invalid authentication token |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `DUPLICATE_ENTRY` | Resource already exists |
| `DATABASE_ERROR` | Database operation failed |
| `FILE_UPLOAD_ERROR` | File upload failed |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated requests:** 1000 requests per hour
- **Unauthenticated requests:** 100 requests per hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699876800
```

## Webhooks (Planned)

Future webhook support for real-time events:

- `call.started`
- `call.ended`
- `campaign.completed`
- `lead.updated`

## API Versioning

Current version: `v1`

Future versions will be accessible via:
- URL: `/api/v2/...`
- Header: `Accept: application/vnd.dialer.v2+json`

## Agentic AI Calling Endpoints

### GET /api/agentic/campaigns

Retrieve AI campaign list (built-in and custom).

**Response (200):**
```json
{
  "ok": true,
  "builtin": [
    {
      "name": "Default",
      "module": "backend.prompts",
      "builtin": true,
      "key": "Default (prompts)"
    }
  ],
  "custom": [
    {
      "name": "Google Outreach",
      "module": "google"
    }
  ]
}
```

### POST /api/agentic/campaigns/create

Create a new AI campaign with custom prompts.

**Request (form-data):**
```
name: "Q4 Sales Campaign"
agent_text: "You are a professional sales representative..."
session_text: "Call [Prospect Name] at [Company Name]..."
module: "q4_sales" (optional, auto-generated from name if not provided)
```

**Response (200):**
```json
{
  "ok": true,
  "supabase_error": null
}
```

### POST /api/agentic/campaigns/update

Update an existing AI campaign.

**Request (form-data):**
```
module: "q4_sales"
name: "Q4 Sales Campaign - Updated"
agent_text: "Updated agent instructions..."
session_text: "Updated session instructions..."
```

**Response (200):**
```json
{
  "ok": true,
  "supabase_error": null
}
```

### POST /api/agentic/campaigns/upload-prompts

Upload prompt text from file.

**Request (form-data):**
```
which: "agent" or "session"
file: <text file>
```

**Response (200):**
```json
{
  "which": "agent",
  "text": "Uploaded prompt text content..."
}
```

### GET /api/agentic/csv/list

List all uploaded prospect CSV files.

**Response (200):**
```json
{
  "ok": true,
  "files": [
    {
      "name": "prospects_q4.csv",
      "size": 245678,
      "mtime": 1699876800,
      "active": true
    }
  ]
}
```

### POST /api/agentic/csv/upload

Upload a new prospect CSV file.

**Request (multipart/form-data):**
```
file: <CSV file>
```

**Response (200):**
```json
{
  "ok": true,
  "name": "prospects_q4.csv",
  "remote": "prospects_q4.csv"
}
```

### POST /api/agentic/csv/select

Set a CSV file as active for AI calling.

**Request (form-data):**
```
name: "prospects_q4.csv"
```

**Response (200):**
```json
{
  "ok": true,
  "active": "prospects_q4.csv"
}
```

### DELETE /api/agentic/csv/:name

Delete a prospect CSV file.

**Response (200):**
```json
{
  "ok": true,
  "supabase_error": null
}
```

### GET /api/agentic/csv/preview

Preview CSV file contents.

**Query Parameters:**
- `name` (string): CSV filename
- `limit` (number): Number of rows to preview (default: 10)

**Response (200):**
```json
{
  "ok": true,
  "headers": ["prospect_name", "company_name", "phone", "email"],
  "rows": [
    {
      "prospect_name": "John Doe",
      "company_name": "Acme Corp",
      "phone": "+1234567890",
      "email": "john@acme.com"
    }
  ]
}
```

### GET /api/agentic/csv/download/:name

Download a CSV file.

**Response (200):**
- Content-Type: text/csv
- Binary CSV data

## Super Admin Endpoints

### GET /api/superadmin/activity/recent

Get recent system activity events.

**Query Parameters:**
- `limit` (number): Maximum events to return (default: 100)
- `type` (string): Comma-separated event types (auth,api,database,error)
- `severity` (string): Comma-separated severity levels (info,warning,error,critical)
- `startDate` (string): ISO date string
- `endDate` (string): ISO date string

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "auth",
      "severity": "info",
      "message": "User logged in",
      "userId": 123,
      "timestamp": "2025-12-08T10:00:00Z",
      "metadata": {}
    }
  ],
  "count": 1
}
```

### PUT /api/superadmin/users/:id/status

Update user account status.

**Request:**
```json
{
  "status": "active" | "inactive" | "suspended"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "active",
    "updatedAt": "2025-12-08T10:00:00Z"
  },
  "message": "User status updated successfully"
}
```

## Password Reset Endpoints

### POST /api/auth/password-reset/request

Request a password reset OTP.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to email"
}
```

### POST /api/auth/password-reset/verify

Verify OTP and get reset token.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "ok": true,
  "resetToken": "uuid-token-here"
}
```

### POST /api/auth/password-reset/reset

Reset password with token.

**Request:**
```json
{
  "email": "user@example.com",
  "resetToken": "uuid-token-here",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "ok": true,
  "userId": 123
}
```

## WebSocket Endpoints

### WS /api/superadmin/activity/stream

Real-time activity feed via WebSocket.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:4000/api/superadmin/activity/stream');
```

**Client Messages:**
```json
// Set event type filters
{
  "type": "set_filters",
  "filters": ["auth", "api", "database"]
}

// Update subscriptions
{
  "type": "subscribe",
  "subscriptions": ["activity", "health", "metrics"]
}
```

**Server Messages:**
```json
// Activity event
{
  "type": "activity",
  "data": {
    "id": 1,
    "type": "auth",
    "severity": "info",
    "message": "User logged in",
    "timestamp": "2025-12-08T10:00:00Z"
  }
}

// Filter confirmation
{
  "type": "filters_updated",
  "filters": ["auth", "api"],
  "timestamp": "2025-12-08T10:00:00Z"
}
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial API documentation |
| 1.1 | 2025-12-08 | System | Added agentic AI, super admin, password reset, and WebSocket endpoints |
