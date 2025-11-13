# Project Overview

## Executive Summary

The Automated Dialer is an enterprise-grade contact center solution built as a monorepo application. It provides comprehensive call management, automated dialing capabilities, and role-based dashboards for Agents, Managers, and Super Administrators.

## Project Information

| Property | Value |
|----------|-------|
| **Project Name** | Automated Dialer |
| **Version** | 0.1.0 |
| **Architecture** | Monorepo (Frontend + Backend) |
| **Status** | Active Development |
| **License** | Private |

## Business Context

### Purpose
The Automated Dialer platform enables organizations to:
- Manage outbound calling campaigns efficiently
- Track agent performance and call metrics
- Automate dialing processes with intelligent queue management
- Monitor live calls and agent activities in real-time
- Generate comprehensive call detail records (CDR)

### Target Users
1. **Agents**: Front-line users who make calls, manage leads, and track their performance
2. **Managers**: Supervisors who monitor team performance, manage campaigns, and oversee operations
3. **Super Admins**: System administrators with full platform access and configuration capabilities

## Technical Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Next.js Frontend (Port 3000)                 │  │
│  │  - React 19 + App Router                            │  │
│  │  - Tailwind CSS v4                                   │  │
│  │  - JsSIP for WebRTC/SIP                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Port 4000)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - TypeScript + Express 4                           │  │
│  │  - RESTful API                                       │  │
│  │  - File Upload Handling                             │  │
│  │  - CDR Management                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MySQL Connection
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   MySQL Database                            │
│  - User Management                                          │
│  - Call Detail Records (CDR)                                │
│  - Campaign Data                                            │
│  - Agent Performance Metrics                                │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend (`apps/frontend`)
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives, shadcn-style components
- **Icons**: Lucide React
- **Theme Management**: next-themes
- **SIP/WebRTC**: JsSIP 3.10.1
- **File Processing**: SheetJS (XLSX)
- **Language**: TypeScript 5

#### Backend (`apps/backend`)
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Language**: TypeScript 5
- **Database**: MySQL 8+ via mysql2/promise
- **ORM**: Prisma (configured)
- **Validation**: Zod
- **Environment**: dotenv
- **CORS**: cors middleware

#### Development Tools
- **Package Manager**: npm with workspaces
- **Process Manager**: concurrently
- **Linting**: ESLint 9
- **Build**: TypeScript compiler

## Project Structure

```
automated-dialer/
├── apps/
│   ├── frontend/          # Next.js application
│   │   ├── src/
│   │   │   ├── app/       # App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/     # Custom React hooks
│   │   │   ├── lib/       # Utility libraries
│   │   │   └── types/     # TypeScript definitions
│   │   ├── public/        # Static assets
│   │   └── package.json
│   │
│   └── backend/           # Express API server
│       ├── src/
│       │   ├── config/    # Configuration files
│       │   ├── controllers/ # Route controllers
│       │   ├── db/        # Database connection
│       │   ├── middlewares/ # Express middlewares
│       │   ├── routes/    # API routes
│       │   ├── services/  # Business logic
│       │   ├── utils/     # Utility functions
│       │   ├── validators/ # Zod schemas
│       │   └── agentic-dialing/ # Python agentic service
│       ├── prisma/        # Database schema & migrations
│       ├── uploads/       # File uploads storage
│       └── package.json
│
├── documentation/         # Project documentation
├── node_modules/         # Root dependencies
├── package.json          # Root package configuration
├── README.md            # Quick start guide
└── FEATURES.md          # Feature documentation
```

## Key Features

### Agent Dashboard
- **Manual Dialer**: Click-to-dial interface
- **Automated Dialer**: 
  - CSV/XLSX upload for bulk dialing
  - Auto-registration with SIP server
  - Sequential auto-dialing with configurable delays
  - Call recording with CDR upload
  - Queue management (pause, skip, hang up)
- **Campaign Management**: Active campaigns and history
- **Call History**: Filterable call logs with playback
- **Lead Management**: Detailed lead information
- **Settings**: Profile and preferences

### Manager Dashboard
- **Overview**: KPIs and performance trends
- **Monitoring**: 
  - Agent tracking
  - Live call monitoring
- **Call Management**: 
  - DID configuration
  - Call Detail Records (CDR)
- **Administration**: 
  - Agent management
  - Campaign administration
- **Settings**: Profile and preferences

### Super Admin Dashboard
- Full system administration capabilities
- User and role management
- System configuration

## Integration Points

### External Services
- **SIP Server**: WebRTC/SIP integration via JsSIP
- **MySQL Database**: Primary data store
- **File Storage**: Local uploads directory (can be migrated to cloud storage)

### API Endpoints
- Health check: `GET /api/health`
- Additional endpoints documented in API documentation

## Development Status

### Completed Features
✅ Monorepo setup with npm workspaces
✅ Frontend and backend scaffolding
✅ Role-based dashboard layouts
✅ Automated dialer with CSV/XLSX upload
✅ Call recording and CDR management
✅ Database connectivity
✅ Dark/Light theme support
✅ Call history with filters and playback

### Pending Features
⏳ Authentication and authorization
⏳ Live call monitoring backend
⏳ Campaign management backend
⏳ Real-time agent tracking
⏳ Comprehensive API documentation
⏳ Unit and integration tests
⏳ Production deployment configuration

## Success Metrics

### Performance Targets
- API response time: < 200ms (p95)
- Frontend load time: < 2s
- Database query time: < 100ms (p95)
- Concurrent users: 100+

### Business Metrics
- Call completion rate
- Agent productivity (calls per hour)
- Campaign conversion rates
- System uptime: 99.9%

## Compliance and Security

### Security Considerations
- Authentication required (to be implemented)
- Role-based access control (RBAC)
- Secure SIP communication
- Data encryption at rest and in transit
- Input validation and sanitization

### Compliance
- GDPR considerations for call recording
- Data retention policies
- Audit logging requirements

## Support and Maintenance

### Monitoring
- Application health checks
- Database connectivity monitoring
- Error logging and tracking
- Performance metrics

### Backup Strategy
- Database backups (to be configured)
- File upload backups
- Configuration backups

## Glossary

| Term | Definition |
|------|------------|
| **CDR** | Call Detail Record - metadata about a call |
| **DID** | Direct Inward Dialing - phone number routing |
| **SIP** | Session Initiation Protocol - VoIP signaling |
| **WebRTC** | Web Real-Time Communication - browser-based calling |
| **Monorepo** | Single repository containing multiple applications |
| **JsSIP** | JavaScript SIP library for WebRTC |

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial documentation |
