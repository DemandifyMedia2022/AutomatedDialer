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

model users {
  id          Int       @id @default(autoincrement())
  usermail    String    @unique
  password    String
  role        Role
  status      String    @default("active")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model calls {
  id                          BigInt    @id @default(autoincrement())
  user_id                     Int
  destination                 String
  direction                   String
  status                      String
  duration                    Int?
  recording_path              String?
  start_time                  DateTime
  end_time                    DateTime?
  metadata                    Json?
  transcripts                 transcripts[]
  call_transcription_metadata call_transcription_metadata?
  transcription_keywords      transcription_keywords[]
  transcription_segments      transcription_segments[]
  qa_call_reviews             qa_call_reviews[]
  notes                       notes[]
}

model transcripts {
  id         BigInt   @id @default(autoincrement())
  call_id    BigInt
  ts         DateTime
  speaker    String   @db.VarChar(32)
  text       String   @db.VarChar(2000)
  sentiment  String?  @db.VarChar(32)
  confidence Float?
  calls      calls    @relation(fields: [call_id], references: [id], onDelete: Cascade)
  
  @@index([call_id, ts])
}

model call_transcription_metadata {
  id               BigInt    @id @default(autoincrement())
  call_id          BigInt    @unique
  full_transcript  String?   @db.LongText
  language         String?   @default("en-US")
  avg_confidence   Float?
  word_count       Int?      @default(0)
  duration_seconds Decimal?
  provider         String?   @default("deepgram")
  metadata_json    String?   @db.LongText
  created_at       DateTime  @default(now())
  updated_at       DateTime  @default(now())
  calls            calls     @relation(fields: [call_id], references: [id], onDelete: Cascade)
}

model transcription_keywords {
  id                    BigInt    @id @default(autoincrement())
  call_id               BigInt
  keyword               String
  occurrences           Int?      @default(1)
  first_occurrence_time Decimal?
  category              String?
  created_at            DateTime  @default(now())
  calls                 calls     @relation(fields: [call_id], references: [id], onDelete: Cascade)
  
  @@index([call_id])
  @@index([keyword])
  @@index([category])
}

model transcription_segments {
  id            BigInt   @id @default(autoincrement())
  call_id       BigInt
  transcript_id BigInt?
  speaker       String?  @default("unknown")
  text          String   @db.Text
  start_time    Decimal?
  end_time      Decimal?
  confidence    Float?
  created_at    DateTime @default(now())
  calls         calls    @relation(fields: [call_id], references: [id], onDelete: Cascade)
  
  @@index([call_id])
}

model agentic_campaigns {
  id           Int      @id @default(autoincrement())
  module       String   @unique @db.VarChar(255)
  name         String   @db.VarChar(255)
  agent_text   String   @db.Text
  session_text String   @db.Text
  created_at   DateTime @default(now())
  updated_at   DateTime @default(now())
}

model agentic_csv_files {
  id         Int      @id @default(autoincrement())
  name       String   @unique @db.VarChar(255)
  size       Int
  mtime      BigInt
  active     Boolean  @default(false)
  created_at DateTime @default(now())
  updated_at DateTime @default(now())
}

model dialing_contacts {
  id             BigInt   @id @default(autoincrement())
  campaign_id    BigInt?
  csv_name       String?  @db.VarChar(255)
  phone          String   @db.VarChar(64)
  name           String?  @db.VarChar(255)
  email          String?  @db.VarChar(255)
  company        String?  @db.VarChar(255)
  job_title      String?  @db.VarChar(255)
  job_level      String?  @db.VarChar(64)
  region         String?  @db.VarChar(64)
  remarks        String?  @db.Text
  priority       Int?     @default(0)
  timezone       String?  @db.VarChar(64)
  consent        Boolean?
  status         String   @default("PENDING")
  attempts       Int      @default(0)
  last_called_at DateTime?
  created_at     DateTime @default(now())
  updated_at     DateTime @default(now())
}

model password_resets {
  id          Int       @id @default(autoincrement())
  user_id     Int
  otp_hash    String?
  reset_token String    @unique @db.Char(36)
  expires_at  DateTime
  attempts    Int       @default(0)
  used_at     DateTime?
  created_at  DateTime  @default(now())
  updated_at  DateTime  @default(now())
  users       users     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, used_at, expires_at])
}

model qa_call_reviews {
  id                BigInt   @id @default(autoincrement())
  call_id           BigInt
  agent_user_id     Int?
  reviewer_user_id  Int
  overall_score     Int?
  is_lead           Boolean  @default(false)
  lead_quality      String?
  notes             String?  @db.Text
  issues_json       String?  @db.LongText
  created_at        DateTime @default(now())
  updated_at        DateTime @default(now())
  calls             calls    @relation(fields: [call_id], references: [id], onDelete: Cascade)
  
  @@index([call_id])
  @@index([agent_user_id])
  @@index([reviewer_user_id])
  @@index([is_lead])
  @@index([lead_quality])
}

model notes {
  id         Int      @id @default(autoincrement())
  user_id    Int
  call_id    BigInt?
  phone_e164 String   @default("")
  title      String
  body       String   @db.Text
  tags_csv   String   @default("")
  visibility String   @default("private")
  created_at DateTime @default(now())
  updated_at DateTime @default(now())
  calls      calls?   @relation(fields: [call_id], references: [id])
  users      users    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([call_id])
  @@index([phone_e164])
  @@index([user_id, created_at])
}

model documents {
  id               Int      @id @default(autoincrement())
  type             String   @default("guide")
  title            String
  description      String   @db.Text
  file_url         String?  @db.VarChar(2000)
  file_mime        String?
  file_size_bytes  BigInt?
  content_richtext String?  @db.LongText
  version          Int      @default(1)
  tags_csv         String   @default("")
  created_by       Int
  visibility       String   @default("org")
  created_at       DateTime @default(now())
  updated_at       DateTime @default(now())
  users            users    @relation(fields: [created_by], references: [id])
  
  @@index([created_by])
  @@index([type])
  @@index([visibility])
}

model feature_flags {
  id                 Int      @id @default(autoincrement())
  name               String   @unique
  description        String?  @db.Text
  enabled            Boolean  @default(false)
  rollout_percentage Int      @default(0)
  target_roles       String?  @db.LongText
  target_users       String?  @db.LongText
  created_at         DateTime @default(now())
  modified_at        DateTime @default(now())
  modified_by        Int?
}

model system_config {
  id          Int      @id @default(autoincrement())
  category    String   @db.VarChar(100)
  key         String   @unique
  value       String   @db.LongText
  type        String   @db.VarChar(50)
  description String?  @db.Text
  modified_by Int?
  modified_at DateTime @default(now())
  created_at  DateTime @default(now())
}

model resource_metrics {
  id                 BigInt   @id @default(autoincrement())
  cpu_usage          Float
  memory_used        BigInt
  memory_total       BigInt
  disk_used          BigInt
  disk_total         BigInt
  active_connections Int?
  timestamp          DateTime @default(now())
  
  @@index([timestamp])
}

model agent_sessions {
  id            BigInt         @id @default(autoincrement())
  user_id       Int
  login_at      DateTime       @default(now())
  logout_at     DateTime?
  agent_breaks  agent_breaks[]
}

model agent_breaks {
  id              BigInt          @id @default(autoincrement())
  user_id         Int
  session_id      BigInt
  break_reason_id Int?
  start_at        DateTime        @default(now())
  end_at          DateTime?
  ended_by        String?
  agent_sessions  agent_sessions  @relation(fields: [session_id], references: [id], onDelete: Cascade)
}

model dm_form {
  f_id            Int      @id @default(autoincrement())
  f_campaign_name String?
  f_prospect_name String?
  f_company_name  String?
  f_phone         String?
  f_email         String?
  f_notes         String?  @db.Text
  f_created_at    DateTime @default(now())
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

## AI Voice Agent Architecture

### Agentic Dialing Service

The system includes a Python-based AI voice agent service that makes autonomous phone calls using conversational AI.

**Architecture:**
```
FastAPI Web UI (Port 4100)
    ↓
Python Agent (agent.py)
    ↓
LiveKit Agents Framework
    ↓
Google Realtime API (Voice AI)
    ↓
SIP/WebRTC → PSTN
```

**Key Components:**

1. **Campaign Management** (`apps/backend/src/agentic-dialing/app/app.py`)
   - Web dashboard for prospect selection
   - CSV upload and management
   - Campaign prompt configuration
   - Real-time call status monitoring

2. **AI Agent** (`apps/backend/src/agentic-dialing/agent.py`)
   - Google Realtime voice model integration
   - Dynamic prompt loading per campaign
   - Lead context injection
   - Noise cancellation (BVCTelephony)

3. **Campaign Prompts** (`campaigns_prompts/`)
   - Modular prompt system
   - Agent instructions (personality, goals)
   - Session instructions (call script with placeholders)
   - Dynamic campaign creation via API

**Data Flow:**
```
1. Upload CSV with prospects
2. Select campaign (prompt template)
3. AI agent reads lead data
4. Injects context into prompts
5. Initiates call via LiveKit
6. Conducts conversation using Google AI
7. Records call and transcription
8. Logs results to database
```

**Environment Variables:**
```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# SIP Configuration (for PSTN calling)
SIP_USER_ID=agent_username
SIP_PASSWORD=agent_password
SIP_URL=pbx.provider.com
SIP_WS_URL=wss://pbx.provider.com:7443

# Backend Integration
BACKEND_API_BASE=http://localhost:4000/api/agentic
LEADS_CSV_PATH=/path/to/leads.csv
LEADS_CSV_DIR=/path/to/csv/storage

# Campaign Configuration
CAMPAIGN_PROMPT_MODULE=backend.campaigns_prompts.google
CAMPAIGN_AGENT_NAME=ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS
CAMPAIGN_SESSION_NAME=SESSION_INSTRUCTION
RUN_SINGLE_CALL=1  # For child process execution
LEAD_INDEX=1  # 1-based index for specific lead
```

### Real-Time Activity Monitoring

**WebSocket Architecture:**
```
Client Browser
    ↓ WebSocket Connection
Activity Feed Server (activityFeedServer.ts)
    ↓ Event Broadcasting
Multiple Connected Clients
```

**Features:**
- Real-time event streaming
- Client-side filtering (auth, api, database, error)
- Subscription management (activity, health, metrics)
- Automatic reconnection
- Authentication via JWT

**Message Types:**
```typescript
// Client → Server
{
  type: "set_filters",
  filters: ["auth", "api"]
}

{
  type: "subscribe",
  subscriptions: ["activity", "health"]
}

// Server → Client
{
  type: "activity",
  data: {
    id: 1,
    type: "auth",
    severity: "info",
    message: "User logged in",
    timestamp: "2025-12-08T10:00:00Z"
  }
}
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial architecture documentation |
| 1.1 | 2025-12-08 | System | Added AI voice agent architecture, updated database schema, added WebSocket monitoring |
