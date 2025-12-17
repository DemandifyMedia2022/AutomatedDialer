DIALER API SPECIFICATION DOCUMENT
==================================

Document Version: 1.0.0
API Version: 1.0.0
Last Updated: December 16, 2025
Status: Production
Classification: Internal Use

================================================================================
DOCUMENT INFORMATION
================================================================================

Title: Dialer Application REST API Specification
Document Type: Technical API Documentation
Target Audience: Developers, System Integrators, QA Engineers
Maintained By: Medhara DavidRaju
Review Cycle: Quarterly

================================================================================
EXECUTIVE SUMMARY
================================================================================

This document provides comprehensive technical specifications for the Dialer
Application REST API. The API enables programmatic access to call management,
GSM port operations, SMS/USSD services, call recordings, and system monitoring
capabilities.

The API follows RESTful principles and uses JSON for data exchange. All
endpoints are secured and require appropriate authentication credentials in
production environments.

Total API Endpoints: 29
API Categories: 9
Supported Protocols: HTTP/1.1, HTTPS/1.1
Data Format: JSON
Character Encoding: UTF-8

================================================================================
TABLE OF CONTENTS
================================================================================

1. Introduction
2. API Overview
3. Authentication & Authorization
4. Base URLs & Environments
5. Request/Response Format
6. Error Handling
7. Rate Limiting
8. API Endpoints Specification
9. Data Models
10. Webhooks & Real-time Updates
11. Security Considerations
12. Testing & Validation
13. Versioning & Deprecation
14. Support & Contact Information
15. Appendix

================================================================================
1. INTRODUCTION
================================================================================

1.1 Purpose
-----------

This specification document defines the complete interface for the Dialer
Application REST API. It serves as the authoritative reference for developers
integrating with the dialer system, implementing client applications, or
performing system testing.

1.2 Scope
---------

This document covers:
- All available API endpoints and their operations
- Request and response schemas
- Authentication mechanisms
- Error handling standards
- Rate limiting policies
- Security best practices
- Integration examples

1.3 Document Conventions
------------------------

- Endpoint paths are shown in monospace font
- Required parameters are marked with (required)
- Optional parameters are marked with (optional)
- Example values are provided in italics
- Code examples use bash syntax for cURL commands

1.4 Related Documents
---------------------

- System Architecture Documentation
- Database Schema Documentation
- Deployment Guide
- Security Policy Document
- Integration Guide

================================================================================
2. API OVERVIEW
================================================================================

2.1 API Architecture
--------------------

The Dialer API follows REST (Representational State Transfer) architectural
principles:

- Resources are identified by URIs
- Standard HTTP methods (GET, POST, PUT, DELETE) are used
- Stateless request/response model
- JSON format for data exchange
- HTTP status codes indicate operation results

2.2 API Categories
------------------

The API is organized into the following functional categories:

1. Health Check (1 endpoint)
   - System health monitoring

2. Dialer Operations (3 endpoints)
   - Call initiation and termination
   - Recent call history

3. Call Recordings (2 endpoints)
   - Recording retrieval and download

4. GSM Port Management (5 endpoints)
   - Port status monitoring
   - Port configuration
   - Port testing

5. Call Logs (3 endpoints)
   - Historical call data
   - Call log export

6. Live Calls (4 endpoints)
   - Active call monitoring
   - Call control operations

7. SMS & USSD Services (4 endpoints)
   - SMS sending and history
   - USSD code execution

8. Dashboard Analytics (2 endpoints)
   - System statistics
   - Activity feeds

9. SIP User Management (5 endpoints)
   - User CRUD operations
   - User status monitoring

2.3 API Versioning
------------------

Current API Version: v1.0.0

Version information is included in the API response headers:
- API-Version: 1.0.0
- API-Deprecated: false

Future versions will maintain backward compatibility for at least 12 months
after deprecation notice.

================================================================================
3. AUTHENTICATION & AUTHORIZATION
================================================================================

3.1 Authentication Methods
---------------------------

Production Environment:
- OAuth 2.0 Bearer Token (Recommended)
- API Key Authentication (Alternative)

Development Environment:
- Currently open (authentication disabled for development)

3.2 OAuth 2.0 Bearer Token
---------------------------

Request Format:
Authorization: Bearer <access_token>

Example:
curl -X GET http://localhost:5001/api/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

Token Expiration:
- Access tokens expire after 3600 seconds (1 hour)
- Refresh tokens expire after 86400 seconds (24 hours)

3.3 API Key Authentication
---------------------------

Request Format:
X-API-Key: <api_key>

Example:
curl -X GET http://localhost:5001/api/health \
  -H "X-API-Key: your-api-key-here"

3.4 Authorization Levels
-------------------------

Role-Based Access Control (RBAC):

- Administrator: Full access to all endpoints
- Operator: Access to call operations, recordings, live calls
- Viewer: Read-only access to logs, recordings, statistics
- API User: Limited access based on assigned permissions

3.5 Token Refresh
-----------------

Endpoint: POST /api/auth/refresh

Request:
{
  "refreshToken": "string"
}

Response:
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600
}

================================================================================
4. BASE URLS & ENVIRONMENTS
================================================================================

4.1 Environment Configuration
------------------------------

Development:
Base URL: http://localhost:5001/api
WebSocket: ws://localhost:5001

Staging:
Base URL: https://staging-api.dialer.example.com/api
WebSocket: wss://staging-api.dialer.example.com

Production:
Base URL: https://api.dialer.example.com/api
WebSocket: wss://api.dialer.example.com

4.2 Network Access
------------------

For network access from other machines:
- Replace localhost with the server IP address
- Ensure firewall rules allow traffic on port 5001
- Use HTTPS in production environments

Example:
http://192.168.0.238:5001/api

4.3 CORS Configuration
-----------------------

Cross-Origin Resource Sharing (CORS) is enabled for:
- Allowed Origins: Configured per environment
- Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed Headers: Content-Type, Authorization, X-API-Key
- Max Age: 3600 seconds

================================================================================
5. REQUEST/RESPONSE FORMAT
================================================================================

5.1 Request Headers
-------------------

Required Headers:
Content-Type: application/json
Accept: application/json

Optional Headers:
Authorization: Bearer <token> (Production)
X-API-Key: <api_key> (Production)
X-Request-ID: <uuid> (For request tracking)

5.2 Request Body Format
-----------------------

All POST and PUT requests must include JSON body with Content-Type header.

Example:
{
  "field1": "value1",
  "field2": 123,
  "field3": true
}

5.3 Response Format
--------------------

Standard Success Response (200 OK):
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Created Response (201 Created):
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

List Response:
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "timestamp": "2025-12-16T10:30:00.000Z"
  }
}

5.4 Response Headers
--------------------

Standard Response Headers:
Content-Type: application/json
X-Request-ID: <uuid>
X-Response-Time: <milliseconds>
API-Version: 1.0.0
RateLimit-Limit: 1000
RateLimit-Remaining: 999
RateLimit-Reset: <timestamp>

5.5 Pagination
--------------

For list endpoints, pagination is supported via query parameters:

- page: Page number (default: 1)
- pageSize: Items per page (default: 20, max: 100)
- sortBy: Field to sort by
- sortOrder: asc or desc (default: desc)

Example:
GET /api/call-logs?page=1&pageSize=50&sortBy=startTime&sortOrder=desc

Response includes pagination metadata:
{
  "data": [ ... ],
  "meta": {
    "total": 500,
    "page": 1,
    "pageSize": 50,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}

================================================================================
6. ERROR HANDLING
================================================================================

6.1 Error Response Format
-------------------------

All errors follow a consistent format:

{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... },
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

6.2 HTTP Status Codes
---------------------

200 OK: Request successful
201 Created: Resource created successfully
400 Bad Request: Invalid request parameters
401 Unauthorized: Authentication required
403 Forbidden: Insufficient permissions
404 Not Found: Resource not found
409 Conflict: Resource conflict (e.g., duplicate)
422 Unprocessable Entity: Validation error
429 Too Many Requests: Rate limit exceeded
500 Internal Server Error: Server error
502 Bad Gateway: Upstream service error
503 Service Unavailable: Service temporarily unavailable

6.3 Error Codes
---------------

Standard Error Codes:

VALIDATION_ERROR: Request validation failed
AUTHENTICATION_REQUIRED: Authentication token missing or invalid
AUTHORIZATION_DENIED: Insufficient permissions
RESOURCE_NOT_FOUND: Requested resource does not exist
RESOURCE_CONFLICT: Resource already exists or conflict
RATE_LIMIT_EXCEEDED: Too many requests
INTERNAL_ERROR: Internal server error
EXTERNAL_SERVICE_ERROR: External service unavailable
INVALID_PHONE_NUMBER: Phone number format invalid
GSM_PORT_UNAVAILABLE: GSM port not available
CALL_IN_PROGRESS: Call already in progress
INVALID_SIP_USER: SIP user configuration invalid

6.4 Error Examples
-------------------

400 Bad Request:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number is required",
    "details": {
      "field": "number",
      "reason": "missing_required_field"
    },
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

401 Unauthorized:
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication token is missing or invalid",
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

404 Not Found:
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Call log with ID '123' not found",
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

429 Too Many Requests:
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds",
    "details": {
      "retryAfter": 60,
      "limit": 1000,
      "remaining": 0
    },
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

500 Internal Server Error:
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred. Please contact support.",
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

================================================================================
7. RATE LIMITING
================================================================================

7.1 Rate Limit Policy
----------------------

Rate limits are applied per API key or authenticated user:

- Standard Tier: 1000 requests per hour
- Premium Tier: 10000 requests per hour
- Enterprise Tier: Unlimited (with fair use policy)

7.2 Rate Limit Headers
-----------------------

Every response includes rate limit information:

X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1734345600

7.3 Rate Limit Exceeded
------------------------

When rate limit is exceeded, API returns 429 status with Retry-After header:

HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1734345600

7.4 Best Practices
-------------------

- Implement exponential backoff when receiving 429 responses
- Cache responses when appropriate to reduce API calls
- Use WebSocket connections for real-time updates instead of polling
- Batch operations when possible

================================================================================
8. API ENDPOINTS SPECIFICATION
================================================================================

8.1 Health Check
================================================================================

GET /api/health

Description:
Returns the health status of the API server and its dependencies.

Authentication: Optional (required in production)

Request Parameters: None

Response Status: 200 OK

Response Body:
{
  "status": "ok",
  "timestamp": "2025-12-16T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "asterisk": "healthy",
    "gsmGateway": "healthy"
  }
}

cURL Example:
curl -X GET http://localhost:5001/api/health \
  -H "Accept: application/json"

================================================================================

8.2 Dialer Operations
================================================================================

POST /api/dialer/call

Description:
Initiates a new call using either SIP or GSM port.

Authentication: Required

Request Body:
{
  "number": "string (required)",
  "port": "string (optional, default: 'sip')",
  "type": "string (optional, enum: ['sip', 'gsm'], default: 'sip')"
}

Request Validation:
- number: Required, string, 3-20 characters, alphanumeric with + prefix allowed
- port: Optional, string, must match existing GSM port identifier
- type: Optional, must be 'sip' or 'gsm'

Response Status: 201 Created

Response Body:
{
  "data": {
    "id": "string",
    "number": "string",
    "port": "string",
    "type": "string",
    "status": "string (enum: ['initiating', 'ringing', 'connected', 'failed'])",
    "startTime": "2025-12-16T10:30:00.000Z",
    "channel": "string (Asterisk channel ID)"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 400: Invalid phone number format
- 400: GSM port not available
- 409: Call already in progress
- 500: Failed to initiate call

cURL Example:
curl -X POST http://localhost:5001/api/dialer/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "number": "8074296912",
    "port": "sip",
    "type": "sip"
  }'

--------------------------------------------------------------------------------

POST /api/dialer/hangup

Description:
Terminates an active call.

Authentication: Required

Request Body:
{
  "callId": "string (optional)",
  "channel": "string (optional)"
}

Request Validation:
- At least one of callId or channel must be provided
- callId: String, UUID format
- channel: String, Asterisk channel format (e.g., SIP/600-00000001)

Response Status: 200 OK

Response Body:
{
  "data": {
    "message": "Call hung up successfully",
    "callId": "string",
    "channel": "string"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 400: Call ID or channel required
- 404: Call not found
- 500: Failed to hangup call

cURL Example:
curl -X POST http://localhost:5001/api/dialer/hangup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "callId": "1734345600000",
    "channel": "SIP/600-00000001"
  }'

--------------------------------------------------------------------------------

GET /api/dialer/recent

Description:
Retrieves recent call history.

Authentication: Required

Query Parameters:
- limit: integer (optional, default: 10, min: 1, max: 100)
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- type: string (optional, enum: ['sip', 'gsm', 'all'])

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "number": "string",
      "type": "string",
      "direction": "string (enum: ['inbound', 'outbound'])",
      "duration": "integer (seconds)",
      "timestamp": "2025-12-16T10:30:00.000Z",
      "status": "string (enum: ['completed', 'failed', 'missed'])"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 10,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/dialer/recent?limit=10" \
  -H "Authorization: Bearer <token>"

================================================================================

8.3 Call Recordings
================================================================================

GET /api/call-recordings

Description:
Retrieves list of all call recordings with metadata.

Authentication: Required

Query Parameters:
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- direction: string (optional, enum: ['inbound', 'outbound'])
- page: integer (optional, default: 1)
- pageSize: integer (optional, default: 20, max: 100)

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "caller": "string",
      "callee": "string",
      "direction": "string",
      "duration": "integer (seconds, 0 if unknown)",
      "date": "2025-12-16T09:09:46.373Z",
      "size": "integer (bytes)",
      "filePath": "string",
      "filename": "string",
      "status": "string (enum: ['available', 'processing', 'deleted'])"
    }
  ],
  "meta": {
    "total": 500,
    "page": 1,
    "pageSize": 20,
    "totalPages": 25,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/call-recordings?page=1&pageSize=20" \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

GET /api/call-recordings/:id/download

Description:
Downloads a specific recording file as audio stream.

Authentication: Required

Path Parameters:
- id: string (required) - Recording ID

Response Status: 200 OK

Response Headers:
Content-Type: audio/wav
Content-Disposition: attachment; filename="recording.wav"
Content-Length: <file_size>

Response Body: Binary audio stream (WAV format)

Error Responses:
- 404: Recording not found
- 410: Recording has been deleted
- 502: Upstream service unavailable

cURL Example:
curl -X GET http://localhost:5001/api/call-recordings/outbound_2025_12_16_gsm-1765876186.37.wav/download \
  -H "Authorization: Bearer <token>" \
  -o recording.wav

================================================================================

8.4 GSM Port Management
================================================================================

GET /api/gsm-ports

Description:
Retrieves status and configuration of all GSM ports.

Authentication: Required

Query Parameters: None

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "port": "string (format: COM0, COM1, etc.)",
      "portNumber": "string",
      "simNumber": "string (ICCID)",
      "operator": "string",
      "signal": "integer (0-100)",
      "signalRaw": "integer",
      "battery": "integer (0-100)",
      "status": "string (enum: ['active', 'inactive', 'error'])",
      "statusRaw": "string",
      "callStatus": "string (enum: ['Idle', 'Ringing', 'Connected', 'Busy'])",
      "imsi": "string",
      "imei": "string",
      "iccid": "string",
      "type": "string (enum: ['2G', '3G', '4G', '5G'])",
      "network": "string",
      "callLimit": "string",
      "asr": "string (Answer Seizure Ratio)",
      "acd": "string (Average Call Duration)",
      "pdd": "string (Post Dial Delay)"
    }
  ],
  "meta": {
    "total": 12,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET http://localhost:5001/api/gsm-ports \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

GET /api/gsm-ports/:id

Description:
Retrieves detailed information for a specific GSM port.

Authentication: Required

Path Parameters:
- id: string (required) - Port ID (e.g., "COM0" or "1")

Response Status: 200 OK

Response Body:
{
  "data": {
    "id": "string",
    "port": "string",
    "simNumber": "string",
    "operator": "string",
    "signal": "integer",
    "battery": "integer",
    "status": "string",
    "callStatus": "string",
    "imsi": "string",
    "imei": "string",
    "iccid": "string",
    "lastUpdate": "2025-12-16T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: GSM port not found

cURL Example:
curl -X GET http://localhost:5001/api/gsm-ports/COM0 \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

POST /api/gsm-ports

Description:
Creates and configures a new GSM port.

Authentication: Required (Administrator role)

Request Body:
{
  "port": "string (required, format: COM0-COM99)",
  "simNumber": "string (optional, ICCID)",
  "operator": "string (optional)",
  "imsi": "string (optional)",
  "callLimit": "string (optional)"
}

Request Validation:
- port: Required, string, must match pattern COM[0-9]+
- simNumber: Optional, string, 15-20 digits
- operator: Optional, string, max 50 characters
- imsi: Optional, string, 15 digits

Response Status: 201 Created

Response Body:
{
  "data": {
    "id": "string",
    "port": "string",
    "simNumber": "string",
    "operator": "string",
    "signal": 0,
    "battery": 0,
    "status": "inactive",
    "imsi": "string",
    "createdAt": "2025-12-16T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 400: Invalid port format
- 409: Port already exists
- 403: Insufficient permissions

cURL Example:
curl -X POST http://localhost:5001/api/gsm-ports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "port": "COM2",
    "simNumber": "89014103211118510720",
    "operator": "Airtel",
    "imsi": "404030123456789"
  }'

--------------------------------------------------------------------------------

PUT /api/gsm-ports/:id

Description:
Updates configuration of an existing GSM port.

Authentication: Required (Administrator role)

Path Parameters:
- id: string (required) - Port ID

Request Body:
{
  "operator": "string (optional)",
  "callLimit": "string (optional)",
  "status": "string (optional, enum: ['active', 'inactive'])"
}

Response Status: 200 OK

Response Body:
{
  "data": {
    "id": "string",
    "port": "string",
    "operator": "string",
    "callLimit": "string",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: GSM port not found
- 403: Insufficient permissions

cURL Example:
curl -X PUT http://localhost:5001/api/gsm-ports/COM0 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "operator": "Jio",
    "callLimit": "200"
  }'

--------------------------------------------------------------------------------

POST /api/gsm-ports/:id/test

Description:
Initiates a connection test for a GSM port.

Authentication: Required (Administrator role)

Path Parameters:
- id: string (required) - Port ID

Response Status: 200 OK

Response Body:
{
  "data": {
    "message": "GSM port test initiated",
    "portId": "string",
    "testId": "string",
    "status": "string (enum: ['initiated', 'in_progress', 'completed', 'failed'])"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X POST http://localhost:5001/api/gsm-ports/COM0/test \
  -H "Authorization: Bearer <token>"

================================================================================

8.5 Call Logs
================================================================================

GET /api/call-logs

Description:
Retrieves historical call logs with filtering and pagination support.

Authentication: Required

Query Parameters:
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- status: string (optional, enum: ['answered', 'missed', 'busy', 'failed'])
- direction: string (optional, enum: ['inbound', 'outbound'])
- gsmPort: string (optional, filter by GSM port)
- page: integer (optional, default: 1)
- pageSize: integer (optional, default: 20, max: 100)
- sortBy: string (optional, default: 'startTime')
- sortOrder: string (optional, enum: ['asc', 'desc'], default: 'desc')

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "caller": "string",
      "callee": "string",
      "direction": "string",
      "duration": "integer (seconds)",
      "status": "string",
      "startTime": "2025-12-16T10:30:00.000Z",
      "endTime": "2025-12-16T10:32:00.000Z",
      "gsmPort": "string",
      "callType": "string (enum: ['sip', 'gsm'])",
      "cost": "number (optional)"
    }
  ],
  "meta": {
    "total": 1000,
    "page": 1,
    "pageSize": 20,
    "totalPages": 50,
    "hasNext": true,
    "hasPrevious": false,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/call-logs?startDate=2025-12-01&endDate=2025-12-31&status=answered&direction=outbound&page=1&pageSize=50" \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

GET /api/call-logs/:id

Description:
Retrieves detailed information for a specific call log entry.

Authentication: Required

Path Parameters:
- id: string (required) - Call log ID

Response Status: 200 OK

Response Body:
{
  "data": {
    "id": "string",
    "caller": "string",
    "callee": "string",
    "direction": "string",
    "duration": "integer",
    "status": "string",
    "startTime": "2025-12-16T10:30:00.000Z",
    "endTime": "2025-12-16T10:32:00.000Z",
    "answerTime": "2025-12-16T10:30:05.000Z",
    "gsmPort": "string",
    "callType": "string",
    "channel": "string",
    "cost": "number",
    "recordingId": "string (optional)",
    "notes": "string (optional)"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: Call log not found

cURL Example:
curl -X GET http://localhost:5001/api/call-logs/1 \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

GET /api/call-logs/export

Description:
Exports call logs in specified format.

Authentication: Required

Query Parameters:
- format: string (required, enum: ['csv', 'json', 'xlsx'])
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- status: string (optional)
- direction: string (optional)

Response Status: 200 OK

Response Headers:
Content-Type: application/csv (for CSV)
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (for XLSX)
Content-Disposition: attachment; filename="call-logs-export.csv"

Response Body: File download (format depends on format parameter)

Error Responses:
- 400: Invalid format specified
- 500: Export generation failed

cURL Example:
curl -X GET "http://localhost:5001/api/call-logs/export?format=csv&startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer <token>" \
  -o call-logs-export.csv

================================================================================

8.6 Live Calls
================================================================================

GET /api/live-calls

Description:
Retrieves list of all currently active calls.

Authentication: Required

Query Parameters: None

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "caller": "string",
      "callee": "string",
      "direction": "string",
      "duration": "integer (seconds)",
      "startTime": "2025-12-16T10:30:00.000Z",
      "channel": "string",
      "gsmPort": "string (optional)",
      "callType": "string",
      "status": "string (enum: ['ringing', 'connected', 'on_hold'])"
    }
  ],
  "meta": {
    "total": 5,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET http://localhost:5001/api/live-calls \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

POST /api/live-calls/:id/hangup

Description:
Terminates a specific active call.

Authentication: Required

Path Parameters:
- id: string (required) - Call ID

Response Status: 200 OK

Response Body:
{
  "data": {
    "message": "Call hung up successfully",
    "callId": "string",
    "channel": "string"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: Call not found
- 409: Call already terminated

cURL Example:
curl -X POST http://localhost:5001/api/live-calls/1/hangup \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

POST /api/live-calls/:id/mute

Description:
Mutes or unmutes audio for a specific active call.

Authentication: Required

Path Parameters:
- id: string (required) - Call ID

Request Body:
{
  "muted": "boolean (required)"
}

Response Status: 200 OK

Response Body:
{
  "data": {
    "message": "Call muted",
    "callId": "string",
    "muted": true
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: Call not found
- 400: Invalid request body

cURL Example:
curl -X POST http://localhost:5001/api/live-calls/1/mute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"muted": true}'

--------------------------------------------------------------------------------

POST /api/live-calls/:id/monitor

Description:
Initiates call monitoring/recording for an active call.

Authentication: Required (Operator role or higher)

Path Parameters:
- id: string (required) - Call ID

Request Body:
{
  "action": "string (required, enum: ['start', 'stop'])"
}

Response Status: 200 OK

Response Body:
{
  "data": {
    "message": "Call monitoring started",
    "callId": "string",
    "monitoringId": "string",
    "status": "string"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: Call not found
- 409: Monitoring already active
- 403: Insufficient permissions

cURL Example:
curl -X POST http://localhost:5001/api/live-calls/1/monitor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"action": "start"}'

================================================================================

8.7 SMS & USSD Services
================================================================================

GET /api/sms-ussd/sms

Description:
Retrieves SMS message history with filtering support.

Authentication: Required

Query Parameters:
- port: string (optional, filter by GSM port)
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- direction: string (optional, enum: ['inbound', 'outbound'])
- status: string (optional, enum: ['sent', 'delivered', 'failed', 'received'])
- page: integer (optional, default: 1)
- pageSize: integer (optional, default: 20, max: 100)

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "number": "string",
      "message": "string",
      "direction": "string",
      "status": "string",
      "timestamp": "2025-12-16T10:30:00.000Z",
      "gsmPort": "string",
      "messageId": "string (optional, provider message ID)"
    }
  ],
  "meta": {
    "total": 500,
    "page": 1,
    "pageSize": 20,
    "totalPages": 25,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/sms-ussd/sms?port=COM0&direction=outbound&page=1&pageSize=20" \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

POST /api/sms-ussd/sms

Description:
Sends an SMS message via specified GSM port.

Authentication: Required

Request Body:
{
  "number": "string (required)",
  "message": "string (required, max: 160 characters for single SMS, 1600 for concatenated)",
  "gsmPort": "string (optional, default: COM0)"
}

Request Validation:
- number: Required, string, valid phone number format (international format preferred)
- message: Required, string, 1-1600 characters
- gsmPort: Optional, string, must match existing GSM port identifier

Response Status: 201 Created

Response Body:
{
  "data": {
    "id": "string",
    "number": "string",
    "message": "string",
    "direction": "outbound",
    "status": "sent",
    "timestamp": "2025-12-16T10:30:00.000Z",
    "gsmPort": "string",
    "messageId": "string (provider message ID)"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 400: Phone number and message are required
- 400: Invalid phone number format
- 400: Message exceeds maximum length
- 404: GSM port not found
- 409: GSM port not available (not registered or busy)
- 500: Failed to send SMS

cURL Example:
curl -X POST http://localhost:5001/api/sms-ussd/sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "number": "+918074296912",
    "message": "Hello, this is a test SMS",
    "gsmPort": "COM0"
  }'

--------------------------------------------------------------------------------

GET /api/sms-ussd/ussd

Description:
Retrieves USSD code execution history.

Authentication: Required

Query Parameters:
- port: string (optional, filter by GSM port)
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- status: string (optional, enum: ['success', 'failed', 'timeout'])
- page: integer (optional, default: 1)
- pageSize: integer (optional, default: 20, max: 100)

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "code": "string",
      "response": "string",
      "status": "string",
      "timestamp": "2025-12-16T10:30:00.000Z",
      "gsmPort": "string",
      "executionTime": "integer (milliseconds)"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/sms-ussd/ussd?port=COM0&status=success" \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

POST /api/sms-ussd/ussd

Description:
Executes a USSD code via specified GSM port.

Authentication: Required

Request Body:
{
  "code": "string (required, format: *XXX# or #XXX#)",
  "gsmPort": "string (optional, default: COM0)"
}

Request Validation:
- code: Required, string, must match USSD code pattern (*XXX# or #XXX#)
- gsmPort: Optional, string, must match existing GSM port identifier

Response Status: 201 Created

Response Body:
{
  "data": {
    "id": "string",
    "code": "string",
    "response": "string",
    "status": "string (enum: ['success', 'failed', 'timeout'])",
    "timestamp": "2025-12-16T10:30:00.000Z",
    "gsmPort": "string",
    "executionTime": "integer (milliseconds)"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 400: USSD code is required
- 400: Invalid USSD code format
- 404: GSM port not found
- 409: GSM port not available
- 500: Failed to execute USSD code
- 504: USSD execution timeout

cURL Example:
curl -X POST http://localhost:5001/api/sms-ussd/ussd \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "code": "*100#",
    "gsmPort": "COM0"
  }'

================================================================================

8.8 Dashboard Analytics
================================================================================

GET /api/dashboard/stats

Description:
Retrieves comprehensive dashboard statistics and metrics.

Authentication: Required

Query Parameters:
- period: string (optional, enum: ['today', 'week', 'month', 'year'], default: 'today')
- startDate: string (optional, ISO 8601 format, overrides period)
- endDate: string (optional, ISO 8601 format)

Response Status: 200 OK

Response Body:
{
  "data": {
    "totalCallsToday": "integer",
    "activeCalls": "integer",
    "sipUsers": "integer",
    "gsmPorts": "integer",
    "gsmPortsActive": "integer",
    "totalCalls": "integer",
    "answeredCalls": "integer",
    "missedCalls": "integer",
    "averageCallDuration": "number (seconds)",
    "callVolume": [
      {
        "time": "string (HH:mm format)",
        "calls": "integer"
      }
    ],
    "callTypes": [
      {
        "type": "string",
        "count": "integer",
        "percentage": "number"
      }
    ],
    "gsmPortStatus": [
      {
        "port": "string",
        "status": "string",
        "calls": "integer",
        "signal": "integer"
      }
    ],
    "topCallers": [
      {
        "number": "string",
        "count": "integer"
      }
    ]
  },
  "meta": {
    "period": "string",
    "startDate": "2025-12-16T00:00:00.000Z",
    "endDate": "2025-12-16T23:59:59.999Z",
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/dashboard/stats?period=week" \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

GET /api/dashboard/recent-activity

Description:
Retrieves recent system activity feed.

Authentication: Required

Query Parameters:
- limit: integer (optional, default: 20, max: 100)
- type: string (optional, enum: ['call', 'sms', 'ussd', 'system'], filter by activity type)

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "type": "string",
      "description": "string",
      "timestamp": "2025-12-16T10:30:00.000Z",
      "userId": "string (optional)",
      "details": {
        "key": "value"
      }
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/dashboard/recent-activity?limit=50&type=call" \
  -H "Authorization: Bearer <token>"

================================================================================

8.9 SIP User Management
================================================================================

GET /api/sip-users

Description:
Retrieves list of all SIP users with their registration status.

Authentication: Required

Query Parameters:
- status: string (optional, enum: ['active', 'inactive'], filter by status)
- registration: string (optional, enum: ['Registered', 'Not Registered'], filter by registration)
- page: integer (optional, default: 1)
- pageSize: integer (optional, default: 20, max: 100)

Response Status: 200 OK

Response Body:
{
  "data": [
    {
      "id": "string",
      "username": "string",
      "domain": "string",
      "status": "string",
      "registration": "string",
      "lastRegistration": "2025-12-16T10:30:00.000Z (optional)",
      "ipAddress": "string (optional)",
      "userAgent": "string (optional)"
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8,
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

cURL Example:
curl -X GET "http://localhost:5001/api/sip-users?status=active&registration=Registered" \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

GET /api/sip-users/:id

Description:
Retrieves detailed information for a specific SIP user.

Authentication: Required

Path Parameters:
- id: string (required) - User ID

Response Status: 200 OK

Response Body:
{
  "data": {
    "id": "string",
    "username": "string",
    "domain": "string",
    "status": "string",
    "registration": "string",
    "lastRegistration": "2025-12-16T10:30:00.000Z",
    "ipAddress": "string",
    "userAgent": "string",
    "createdAt": "2025-12-16T10:30:00.000Z",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: SIP user not found

cURL Example:
curl -X GET http://localhost:5001/api/sip-users/1 \
  -H "Authorization: Bearer <token>"

--------------------------------------------------------------------------------

POST /api/sip-users

Description:
Creates a new SIP user account.

Authentication: Required (Administrator role)

Request Body:
{
  "username": "string (required, 3-50 characters, alphanumeric and underscore)",
  "password": "string (required, min: 8 characters)",
  "domain": "string (required, valid domain format)"
}

Request Validation:
- username: Required, string, 3-50 characters, alphanumeric and underscore only
- password: Required, string, minimum 8 characters, must contain letters and numbers
- domain: Required, string, valid domain format

Response Status: 201 Created

Response Body:
{
  "data": {
    "id": "string",
    "username": "string",
    "domain": "string",
    "status": "active",
    "createdAt": "2025-12-16T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 400: Validation error
- 409: Username already exists
- 403: Insufficient permissions

cURL Example:
curl -X POST http://localhost:5001/api/sip-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "username": "user004",
    "password": "SecurePassword123",
    "domain": "sip.example.com"
  }'

--------------------------------------------------------------------------------

PUT /api/sip-users/:id

Description:
Updates configuration for an existing SIP user.

Authentication: Required (Administrator role)

Path Parameters:
- id: string (required) - User ID

Request Body:
{
  "username": "string (optional)",
  "password": "string (optional, min: 8 characters)",
  "domain": "string (optional)",
  "status": "string (optional, enum: ['active', 'inactive'])"
}

Response Status: 200 OK

Response Body:
{
  "data": {
    "id": "string",
    "username": "string",
    "domain": "string",
    "status": "string",
    "updatedAt": "2025-12-16T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: SIP user not found
- 400: Validation error
- 403: Insufficient permissions

cURL Example:
curl -X PUT http://localhost:5001/api/sip-users/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "username": "user004",
    "password": "NewPassword123",
    "domain": "sip.example.com"
  }'

--------------------------------------------------------------------------------

DELETE /api/sip-users/:id

Description:
Deletes a SIP user account.

Authentication: Required (Administrator role)

Path Parameters:
- id: string (required) - User ID

Response Status: 200 OK

Response Body:
{
  "data": {
    "message": "SIP user deleted successfully",
    "userId": "string"
  },
  "meta": {
    "timestamp": "2025-12-16T10:30:00.000Z",
    "requestId": "uuid-string"
  }
}

Error Responses:
- 404: SIP user not found
- 409: User has active calls
- 403: Insufficient permissions

cURL Example:
curl -X DELETE http://localhost:5001/api/sip-users/1 \
  -H "Authorization: Bearer <token>"

================================================================================
9. DATA MODELS
================================================================================

9.1 Common Data Types
---------------------

String: UTF-8 encoded text
Integer: 32-bit signed integer
Number: Floating point number (IEEE 754)
Boolean: true or false
Date/DateTime: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
UUID: RFC 4122 format

9.2 Call Object
---------------

{
  "id": "string (UUID)",
  "number": "string",
  "port": "string",
  "type": "string (enum: ['sip', 'gsm'])",
  "direction": "string (enum: ['inbound', 'outbound'])",
  "status": "string",
  "duration": "integer (seconds)",
  "startTime": "ISO 8601 datetime",
  "endTime": "ISO 8601 datetime (optional)",
  "channel": "string (optional)",
  "gsmPort": "string (optional)",
  "cost": "number (optional)"
}

9.3 Recording Object
--------------------

{
  "id": "string",
  "caller": "string",
  "callee": "string",
  "direction": "string",
  "duration": "integer (seconds)",
  "date": "ISO 8601 datetime",
  "size": "integer (bytes)",
  "filePath": "string",
  "filename": "string",
  "status": "string"
}

9.4 GSM Port Object
-------------------

{
  "id": "string",
  "port": "string",
  "portNumber": "string",
  "simNumber": "string",
  "operator": "string",
  "signal": "integer (0-100)",
  "battery": "integer (0-100)",
  "status": "string",
  "callStatus": "string",
  "imsi": "string",
  "imei": "string",
  "iccid": "string",
  "type": "string",
  "network": "string"
}

9.5 SIP User Object
-------------------

{
  "id": "string",
  "username": "string",
  "domain": "string",
  "status": "string",
  "registration": "string",
  "lastRegistration": "ISO 8601 datetime (optional)",
  "ipAddress": "string (optional)",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}

================================================================================
10. WEBHOOKS & REAL-TIME UPDATES
================================================================================

10.1 WebSocket Connection
--------------------------

The API supports WebSocket connections for real-time updates:

Connection URL: ws://localhost:5001 (or wss:// for production)

Message Format:
{
  "type": "string",
  "data": { ... },
  "timestamp": "ISO 8601 datetime"
}

10.2 Event Types
----------------

- call.started: New call initiated
- call.answered: Call answered
- call.ended: Call terminated
- call.failed: Call failed
- recording.available: New recording available
- gsm.port.status.changed: GSM port status updated
- sip.user.registered: SIP user registered
- sip.user.unregistered: SIP user unregistered

10.3 Webhook Configuration
---------------------------

Webhooks can be configured to receive HTTP POST notifications for events.

Endpoint: POST /api/webhooks

Request Body:
{
  "url": "string (required, valid HTTPS URL)",
  "events": ["array of event types"],
  "secret": "string (optional, for signature verification)"
}

================================================================================
11. SECURITY CONSIDERATIONS
================================================================================

11.1 Transport Security
------------------------

- All production APIs must use HTTPS (TLS 1.2 or higher)
- TLS certificates must be valid and not expired
- Certificate pinning recommended for mobile applications

11.2 Authentication Security
----------------------------

- Tokens must be stored securely (never in localStorage for web apps)
- Tokens should be rotated regularly
- Implement token refresh mechanism
- Use short-lived access tokens

11.3 Input Validation
---------------------

- All user inputs must be validated server-side
- Sanitize all string inputs to prevent injection attacks
- Validate phone number formats
- Enforce maximum length limits

11.4 Rate Limiting
------------------

- Implement client-side rate limiting
- Respect server rate limit headers
- Use exponential backoff for retries

11.5 Data Privacy
------------------

- Never log sensitive data (passwords, tokens)
- Encrypt sensitive data at rest
- Implement proper access controls
- Comply with data protection regulations (GDPR, etc.)

11.6 Best Practices
-------------------

- Use HTTPS for all API calls in production
- Implement request signing for critical operations
- Monitor API usage for anomalies
- Keep API keys and tokens secure
- Regularly audit access logs
- Implement IP whitelisting for sensitive endpoints

================================================================================
12. TESTING & VALIDATION
================================================================================

12.1 Test Environment
---------------------

A dedicated test environment is available for integration testing:

Base URL: https://test-api.dialer.example.com/api

Test credentials and sample data are provided separately.

12.2 API Testing Tools
----------------------

Recommended tools:
- Postman (Collection available)
- cURL (Command line)
- REST Client (VS Code extension)
- Automated testing frameworks (Jest, Mocha, etc.)

12.3 Test Scenarios
-------------------

Standard test scenarios include:
- Successful request/response flows
- Error handling (400, 401, 404, 500)
- Rate limiting behavior
- Authentication/authorization
- Input validation
- Pagination
- Filtering and sorting

12.4 Mock Data
--------------

Test endpoints return mock data in development environment.
Production endpoints return real data from connected systems.

12.5 Performance Testing
------------------------

- Response time targets: < 200ms for simple queries, < 1000ms for complex operations
- Concurrent request handling: Test with multiple simultaneous requests
- Load testing: Verify system behavior under expected load

================================================================================
13. VERSIONING & DEPRECATION
================================================================================

13.1 Version Strategy
----------------------

- API version is included in response headers
- Major version changes will be communicated 6 months in advance
- Minor version changes maintain backward compatibility
- Deprecated endpoints will be supported for at least 12 months

13.2 Deprecation Process
-------------------------

1. Deprecation notice sent via email and API headers
2. 6-month grace period for migration
3. Deprecated endpoints marked in documentation
4. Alternative endpoints provided
5. Final removal after grace period

13.3 Version History
---------------------

v1.0.0 (Current):
- Initial production release
- All 29 endpoints available
- Full feature set implemented

================================================================================
14. SUPPORT & CONTACT INFORMATION
================================================================================

14.1 Technical Support
----------------------

Email: api-support@dialer.example.com
Response Time: Within 24 hours (business days)

14.2 Documentation Updates
---------------------------

Documentation is updated with each API version release.
Latest version always available at: https://docs.dialer.example.com/api

14.3 Issue Reporting
--------------------

Report bugs or issues via:
- Email: api-issues@dialer.example.com
- Include: API version, endpoint, request/response details, error messages

14.4 Feature Requests
---------------------

Submit feature requests to: api-features@dialer.example.com

14.5 Service Status
-------------------

Check API status and uptime at: https://status.dialer.example.com

================================================================================
15. APPENDIX
================================================================================

15.1 Quick Reference Table
----------------------------

Endpoint                              Method   Auth   Description
--------------------------------------------------------------------------------
/api/health                           GET      Opt    Health check
/api/dialer/call                      POST     Req    Make a call
/api/dialer/hangup                    POST     Req    Hangup call
/api/dialer/recent                    GET      Req    Recent calls
/api/call-recordings                  GET      Req    List recordings
/api/call-recordings/:id/download     GET      Req    Download recording
/api/gsm-ports                        GET      Req    List GSM ports
/api/gsm-ports/:id                    GET      Req    Get port details
/api/gsm-ports                        POST     Req    Create GSM port
/api/gsm-ports/:id                    PUT      Req    Update GSM port
/api/gsm-ports/:id/test               POST     Req    Test GSM port
/api/call-logs                        GET      Req    Get call logs
/api/call-logs/:id                    GET      Req    Get specific call log
/api/call-logs/export                 GET      Req    Export call logs
/api/live-calls                       GET      Req    Get active calls
/api/live-calls/:id/hangup            POST     Req    Hangup live call
/api/live-calls/:id/mute              POST     Req    Mute/unmute call
/api/live-calls/:id/monitor           POST     Req    Monitor call
/api/sms-ussd/sms                     GET      Req    Get SMS history
/api/sms-ussd/sms                     POST     Req    Send SMS
/api/sms-ussd/ussd                    GET      Req    Get USSD history
/api/sms-ussd/ussd                    POST     Req    Execute USSD
/api/dashboard/stats                  GET      Req    Dashboard stats
/api/dashboard/recent-activity        GET      Req    Recent activity
/api/sip-users                       GET      Req    List SIP users
/api/sip-users/:id                   GET      Req    Get SIP user
/api/sip-users                       POST     Req    Create SIP user
/api/sip-users/:id                   PUT      Req    Update SIP user
/api/sip-users/:id                   DELETE   Req    Delete SIP user

Auth: Opt = Optional, Req = Required

15.2 HTTP Status Code Reference
--------------------------------

200 OK: Request successful
201 Created: Resource created
400 Bad Request: Invalid request
401 Unauthorized: Authentication required
403 Forbidden: Insufficient permissions
404 Not Found: Resource not found
409 Conflict: Resource conflict
422 Unprocessable Entity: Validation error
429 Too Many Requests: Rate limit exceeded
500 Internal Server Error: Server error
502 Bad Gateway: Upstream service error
503 Service Unavailable: Service unavailable

15.3 Common Error Codes
-----------------------

VALIDATION_ERROR: Request validation failed
AUTHENTICATION_REQUIRED: Authentication required
AUTHORIZATION_DENIED: Insufficient permissions
RESOURCE_NOT_FOUND: Resource not found
RESOURCE_CONFLICT: Resource conflict
RATE_LIMIT_EXCEEDED: Rate limit exceeded
INTERNAL_ERROR: Internal server error
EXTERNAL_SERVICE_ERROR: External service error

15.4 Glossary
-------------

API: Application Programming Interface
GSM: Global System for Mobile Communications
SIP: Session Initiation Protocol
USSD: Unstructured Supplementary Service Data
ICCID: Integrated Circuit Card Identifier
IMSI: International Mobile Subscriber Identity
IMEI: International Mobile Equipment Identity
ASR: Answer Seizure Ratio
ACD: Average Call Duration
PDD: Post Dial Delay
REST: Representational State Transfer
JSON: JavaScript Object Notation
HTTPS: Hypertext Transfer Protocol Secure
TLS: Transport Layer Security
UUID: Universally Unique Identifier
ISO 8601: International date and time format standard

15.5 Change Log
---------------

Version 1.0.0 (December 16, 2025):
- Initial production release
- 29 API endpoints implemented
- Complete documentation published
- Authentication and authorization implemented
- Rate limiting configured
- Error handling standardized

================================================================================
END OF DOCUMENT
================================================================================

This document is the official specification for the Dialer Application REST API.
For questions or clarifications, please contact the API support team.

Document Control:
- Version: 1.0.0
- Last Updated: December 16, 2025
- Next Review: March 16, 2026
- Status: Production Ready
