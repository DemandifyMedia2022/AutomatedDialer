# System Architecture

## Architecture Overview

The Automated Dialer follows a modern three-tier architecture pattern with clear separation of concerns between presentation, business logic, and data layers.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Frontend                          │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │   Pages    │  │ Components │  │   State Management     │ │ │
│  │  │ (App Router)│  │   (React)  │  │   (React Hooks)        │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │  JsSIP     │  │  Tailwind  │  │   Theme Provider       │ │ │
│  │  │  (WebRTC)  │  │    CSS     │  │   (Dark/Light)         │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                                │
                                │ REST API (HTTP/HTTPS)
                                │ JSON Payloads
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Express Backend                           │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │   Routes   │→ │Controllers │→ │      Services          │ │ │
│  │  │  (API)     │  │  (Logic)   │  │  (Business Logic)      │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │Middlewares │  │ Validators │  │   File Handling        │ │ │
│  │  │(CORS, etc) │  │   (Zod)    │  │   (Multer/Upload)      │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Agentic Dialing Service (Python)                │ │
│  │  - FastAPI/Uvicorn                                           │ │
│  │  - Port 4100                                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL Queries
                                │ Connection Pool
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    MySQL Database                            │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │   Users    │  │    CDR     │  │     Campaigns          │ │ │
│  │  │   Agents   │  │  Records   │  │     Leads              │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │ │
│  │  │   Roles    │  │ Recordings │  │   Configuration        │ │ │
│  │  │Permissions │  │  Metadata  │  │   Settings             │ │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                                │
                                │ File System
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  Local File Storage                          │ │
│  │  - uploads/recordings/  (Call recordings)                    │ │
│  │  - uploads/sheets/      (CSV/XLSX uploads)                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Architecture

#### Directory Structure
```
apps/frontend/src/
├── app/                    # Next.js App Router
│   ├── login/             # Authentication pages
│   ├── dashboard/         # Role-based dashboards
│   │   ├── agent/        # Agent dashboard & features
│   │   ├── manager/      # Manager dashboard & features
│   │   └── superadmin/   # Super admin dashboard
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Home page (redirects)
│
├── components/            # React components
│   ├── layout/           # Layout components
│   │   ├── sidebar/     # Sidebar navigation
│   │   ├── header/      # Header/breadcrumbs
│   │   └── nav-user/    # User menu
│   └── ui/              # Reusable UI components
│       ├── button/
│       ├── input/
│       ├── card/
│       └── ...
│
├── hooks/                # Custom React hooks
│   └── use-mobile.tsx   # Responsive utilities
│
├── lib/                  # Utility libraries
│   └── utils.ts         # Helper functions
│
└── types/               # TypeScript definitions
    └── index.ts         # Shared types
```

#### Key Frontend Patterns

**1. Server Components by Default**
- Next.js App Router uses React Server Components
- Client components marked with `'use client'`
- Optimizes initial page load and SEO

**2. Component Composition**
```typescript
// Layout composition pattern
<ThemeProvider>
  <RootLayout>
    <DashboardLayout>
      <Sidebar />
      <MainContent>
        <Header />
        <PageContent />
      </MainContent>
    </DashboardLayout>
  </RootLayout>
</ThemeProvider>
```

**3. State Management**
- React hooks (useState, useEffect) for local state
- Context API for theme management
- No external state management library (Redux, Zustand) currently

**4. Routing Strategy**
- File-based routing via Next.js App Router
- Dynamic routes for role-based dashboards
- Middleware for route protection (to be implemented)

### Backend Architecture

#### Directory Structure
```
apps/backend/src/
├── config/              # Configuration management
│   └── env.ts          # Environment variables
│
├── controllers/         # Request handlers
│   ├── healthController.ts
│   ├── authController.ts
│   ├── cdrController.ts
│   └── ...
│
├── services/           # Business logic layer
│   ├── authService.ts
│   ├── callService.ts
│   └── ...
│
├── routes/             # API route definitions
│   ├── index.ts       # Route aggregator
│   ├── auth.ts
│   ├── cdr.ts
│   └── ...
│
├── middlewares/        # Express middlewares
│   ├── auth.ts        # Authentication
│   ├── errorHandler.ts
│   └── ...
│
├── validators/         # Input validation schemas
│   └── schemas.ts     # Zod schemas
│
├── db/                # Database layer
│   └── pool.ts        # MySQL connection pool
│
├── utils/             # Utility functions
│   └── helpers.ts
│
├── agentic-dialing/   # Python microservice
│   └── app/
│       └── app.py     # FastAPI application
│
├── app.ts             # Express app configuration
└── server.ts          # Server entry point
```

#### Backend Patterns

**1. Layered Architecture**
```
Request → Route → Controller → Service → Database
                     ↓
                 Validator
                     ↓
                 Middleware
```

**2. Dependency Injection**
```typescript
// Services injected into controllers
class CallController {
  constructor(private callService: CallService) {}
  
  async getCalls(req, res) {
    const calls = await this.callService.findAll();
    res.json(calls);
  }
}
```

**3. Error Handling**
```typescript
// Centralized error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message
  });
});
```

**4. Database Access Pattern**
```typescript
// Connection pool with lazy initialization
export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(DATABASE_URL);
  }
  return pool;
};
```

## Data Architecture

### Database Schema (Prisma)

```prisma
// Core entities (simplified representation)

model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String
  role        Role
  agent       Agent?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Agent {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique
  user        User      @relation(fields: [userId], references: [id])
  extension   String
  sipUsername String
  sipPassword String
  calls       Call[]
  campaigns   Campaign[]
}

model Call {
  id              Int       @id @default(autoincrement())
  agentId         Int
  agent           Agent     @relation(fields: [agentId], references: [id])
  destination     String
  direction       Direction
  status          CallStatus
  duration        Int?
  recordingPath   String?
  startTime       DateTime
  endTime         DateTime?
  metadata        Json?
}

model Campaign {
  id          Int       @id @default(autoincrement())
  name        String
  status      CampaignStatus
  agentId     Int
  agent       Agent     @relation(fields: [agentId], references: [id])
  leads       Lead[]
  createdAt   DateTime  @default(now())
}

model Lead {
  id          Int       @id @default(autoincrement())
  campaignId  Int
  campaign    Campaign  @relation(fields: [campaignId], references: [id])
  phoneNumber String
  name        String?
  status      LeadStatus
  metadata    Json?
}
```

### Data Flow Patterns

**1. Call Recording Flow**
```
Agent Browser (JsSIP)
    ↓ Record audio (MediaRecorder API)
    ↓ Convert to Blob
    ↓ POST /api/cdr/upload
Backend
    ↓ Multer middleware (file upload)
    ↓ Save to uploads/recordings/
    ↓ Create CDR record in database
    ↓ Return CDR ID
Frontend
    ↓ Display in call history
    ↓ Audio player with download
```

**2. Automated Dialing Flow**
```
Agent uploads CSV/XLSX
    ↓ Parse client-side (SheetJS)
    ↓ Extract phone numbers
    ↓ De-duplicate queue
    ↓ Register SIP (JsSIP)
    ↓ Auto-dial sequentially
    ↓ Record each call
    ↓ Upload CDR + recording
    ↓ Move to next number
```

## Integration Architecture

### SIP/WebRTC Integration

```
Browser (JsSIP Client)
    ↓ WebSocket/WSS
    ↓ SIP Signaling
SIP Server (External)
    ↓ RTP/SRTP
    ↓ Media Stream
PSTN/VoIP Network
```

**JsSIP Configuration**
```javascript
const socket = new JsSIP.WebSocketInterface('wss://sip-server:7443');
const configuration = {
  sockets: [socket],
  uri: 'sip:agent@domain.com',
  password: 'secret'
};
const ua = new JsSIP.UA(configuration);
```

### File Upload Architecture

```
Client
    ↓ FormData with file
    ↓ POST /api/upload
Backend (Multer)
    ↓ Validate file type/size
    ↓ Generate unique filename
    ↓ Save to uploads/
    ↓ Store metadata in DB
    ↓ Return file URL
```

## Security Architecture

### Authentication Flow (Planned)

```
1. User submits credentials
    ↓
2. Backend validates against database
    ↓
3. Generate JWT token
    ↓
4. Return token to client
    ↓
5. Client stores in httpOnly cookie
    ↓
6. Include token in subsequent requests
    ↓
7. Backend validates token via middleware
    ↓
8. Attach user context to request
```

### Authorization Model

```
Role Hierarchy:
- Super Admin (full access)
    ↓
- Manager (team management, monitoring)
    ↓
- Agent (own calls, assigned campaigns)
```

### Security Layers

1. **Transport Security**: HTTPS/WSS
2. **Authentication**: JWT tokens
3. **Authorization**: Role-based access control (RBAC)
4. **Input Validation**: Zod schemas
5. **SQL Injection Prevention**: Parameterized queries
6. **XSS Prevention**: React auto-escaping
7. **CSRF Protection**: SameSite cookies

## Scalability Considerations

### Horizontal Scaling

**Frontend**
- Stateless Next.js instances
- CDN for static assets
- Load balancer distribution

**Backend**
- Stateless Express instances
- Session store (Redis) for shared state
- Load balancer with sticky sessions

**Database**
- Read replicas for queries
- Write master for transactions
- Connection pooling

### Performance Optimization

**Frontend**
- Code splitting (Next.js automatic)
- Image optimization (next/image)
- Lazy loading components
- Service worker caching

**Backend**
- Database query optimization
- Response caching (Redis)
- Compression middleware
- Rate limiting

## Monitoring and Observability

### Logging Strategy

```
Application Logs
    ↓ Structured JSON format
    ↓ Log aggregation service
    ↓ Centralized dashboard
```

### Metrics Collection

- Request rate and latency
- Error rates by endpoint
- Database query performance
- System resource usage
- Active user sessions

### Health Checks

```
GET /api/health
{
  "success": true,
  "status": "healthy",
  "db": "connected",
  "timestamp": "2025-11-13T10:00:00Z"
}
```

## Deployment Architecture

### Development Environment
```
Local Machine
├── Frontend: localhost:3000
├── Backend: localhost:4000
├── Agentic: localhost:4100
└── MySQL: localhost:3306
```

### Production Environment (Recommended)
```
Load Balancer
    ↓
Frontend Servers (Next.js)
    ↓ API Calls
Backend Servers (Express)
    ↓ Queries
Database Cluster (MySQL)
    ↓ Backups
Object Storage (Recordings)
```

## Technology Decisions

### Why Next.js?
- Server-side rendering for SEO
- App Router for modern routing
- Built-in optimization
- TypeScript support
- Large ecosystem

### Why Express?
- Lightweight and flexible
- Mature ecosystem
- Easy to understand
- Good TypeScript support
- Middleware architecture

### Why MySQL?
- ACID compliance
- Relational data model
- Proven reliability
- Good performance
- Wide tooling support

### Why Monorepo?
- Shared code and types
- Consistent tooling
- Simplified deployment
- Better developer experience
- Atomic commits across apps

## Future Architecture Enhancements

### Microservices Migration
- Split backend into domain services
- API gateway pattern
- Service mesh for communication
- Independent scaling

### Event-Driven Architecture
- Message queue (RabbitMQ/Kafka)
- Async processing
- Event sourcing for audit
- CQRS pattern

### Cloud-Native Features
- Container orchestration (Kubernetes)
- Auto-scaling policies
- Multi-region deployment
- Disaster recovery

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial architecture documentation |
