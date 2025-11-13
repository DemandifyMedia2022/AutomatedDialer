# Development Guide

## Development Workflow

### Getting Started

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd automated-dialer
   npm install
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start Development Servers**
   ```bash
   npm run dev:all
   ```

4. **Make Changes and Test**
   - Write code
   - Test locally
   - Run linter
   - Commit changes

5. **Submit Pull Request**
   - Push to remote
   - Create PR
   - Request review

## Project Structure Deep Dive

### Frontend Structure

```
apps/frontend/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth route group
│   │   └── login/              # Login page
│   ├── dashboard/              # Dashboard route group
│   │   ├── agent/             # Agent dashboard
│   │   │   ├── dialer/       # Dialer features
│   │   │   │   ├── manual/
│   │   │   │   └── automated/
│   │   │   ├── campaigns/    # Campaign management
│   │   │   ├── my-calls/     # Call history
│   │   │   └── settings/     # Agent settings
│   │   ├── manager/          # Manager dashboard
│   │   │   ├── monitoring/
│   │   │   ├── call-management/
│   │   │   ├── administration/
│   │   │   └── settings/
│   │   └── superadmin/       # Super admin dashboard
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
│
├── components/                # React components
│   ├── layout/               # Layout components
│   │   ├── sidebar/
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── nav-main.tsx
│   │   │   └── nav-user.tsx
│   │   └── header/
│   │       └── breadcrumb-header.tsx
│   └── ui/                   # UI primitives
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
│
├── hooks/                    # Custom hooks
│   ├── use-mobile.tsx
│   ├── use-toast.tsx
│   └── use-auth.tsx
│
├── lib/                      # Utilities
│   ├── utils.ts             # Helper functions
│   └── api.ts               # API client
│
└── types/                    # TypeScript types
    ├── index.ts
    ├── api.ts
    └── models.ts
```

### Backend Structure

```
apps/backend/src/
├── config/                   # Configuration
│   └── env.ts               # Environment variables
│
├── controllers/             # Request handlers
│   ├── authController.ts
│   ├── callController.ts
│   ├── campaignController.ts
│   ├── leadController.ts
│   └── healthController.ts
│
├── services/               # Business logic
│   ├── authService.ts
│   ├── callService.ts
│   ├── campaignService.ts
│   └── leadService.ts
│
├── routes/                 # API routes
│   ├── index.ts           # Route aggregator
│   ├── auth.ts
│   ├── calls.ts
│   ├── campaigns.ts
│   └── leads.ts
│
├── middlewares/           # Express middlewares
│   ├── auth.ts           # Authentication
│   ├── errorHandler.ts   # Error handling
│   ├── validator.ts      # Input validation
│   └── upload.ts         # File upload
│
├── validators/           # Validation schemas
│   ├── authSchemas.ts
│   ├── callSchemas.ts
│   └── campaignSchemas.ts
│
├── db/                   # Database
│   ├── pool.ts          # Connection pool
│   └── queries.ts       # SQL queries
│
├── utils/               # Utilities
│   ├── logger.ts       # Logging
│   ├── helpers.ts      # Helper functions
│   └── constants.ts    # Constants
│
├── agentic-dialing/    # Python service
│   └── app/
│       ├── app.py
│       └── requirements.txt
│
├── app.ts              # Express app
└── server.ts           # Server entry
```

## Coding Standards

### TypeScript Guidelines

**1. Use Strict Mode**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**2. Type Everything**
```typescript
// ❌ Bad
function getUser(id) {
  return fetch(`/api/users/${id}`);
}

// ✅ Good
interface User {
  id: number;
  email: string;
  name: string;
}

async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

**3. Use Interfaces for Objects**
```typescript
// ✅ Good
interface CallRecord {
  id: number;
  agentId: number;
  destination: string;
  status: CallStatus;
  duration?: number;
}

type CallStatus = 'answered' | 'no_answer' | 'busy' | 'failed';
```

**4. Avoid `any`**
```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
interface DataInput {
  value: string;
}

function processData(data: DataInput): string {
  return data.value;
}
```

### React Best Practices

**1. Component Structure**
```typescript
// ✅ Good component structure
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CallDialerProps {
  agentId: number;
  onCallComplete: (callId: number) => void;
}

export function CallDialer({ agentId, onCallComplete }: CallDialerProps) {
  const [isDialing, setIsDialing] = useState(false);
  
  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    };
  }, []);
  
  const handleDial = async () => {
    setIsDialing(true);
    try {
      // Dial logic
    } catch (error) {
      console.error('Dial failed:', error);
    } finally {
      setIsDialing(false);
    }
  };
  
  return (
    <div>
      <Button onClick={handleDial} disabled={isDialing}>
        {isDialing ? 'Dialing...' : 'Dial'}
      </Button>
    </div>
  );
}
```

**2. Custom Hooks**
```typescript
// hooks/use-call-manager.ts
import { useState, useCallback } from 'react';

export function useCallManager() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calls');
      const data = await response.json();
      setCalls(data.data);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return { calls, isLoading, fetchCalls };
}
```

**3. Server vs Client Components**
```typescript
// Server Component (default in App Router)
// app/dashboard/page.tsx
import { CallList } from './call-list';

export default async function DashboardPage() {
  // Can fetch data directly
  const calls = await fetchCalls();
  
  return <CallList calls={calls} />;
}

// Client Component (interactive)
// app/dashboard/call-list.tsx
'use client';

import { useState } from 'react';

export function CallList({ calls }) {
  const [filter, setFilter] = useState('all');
  
  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="answered">Answered</option>
      </select>
      {/* Render calls */}
    </div>
  );
}
```

### Express Best Practices

**1. Controller Pattern**
```typescript
// controllers/callController.ts
import { Request, Response, NextFunction } from 'express';
import { CallService } from '../services/callService';

export class CallController {
  constructor(private callService: CallService) {}
  
  async getCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const calls = await this.callService.findAll({
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json({
        success: true,
        data: calls
      });
    } catch (error) {
      next(error);
    }
  }
}
```

**2. Service Layer**
```typescript
// services/callService.ts
import { getPool } from '../db/pool';

export class CallService {
  async findAll(options: { page: number; limit: number }) {
    const pool = getPool();
    const offset = (options.page - 1) * options.limit;
    
    const [rows] = await pool.query(
      'SELECT * FROM calls LIMIT ? OFFSET ?',
      [options.limit, offset]
    );
    
    return rows;
  }
  
  async create(data: CreateCallDto) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO calls SET ?',
      [data]
    );
    
    return result;
  }
}
```

**3. Validation with Zod**
```typescript
// validators/callSchemas.ts
import { z } from 'zod';

export const createCallSchema = z.object({
  agentId: z.number().positive(),
  destination: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  direction: z.enum(['inbound', 'outbound']),
  status: z.enum(['answered', 'no_answer', 'busy', 'failed']),
  duration: z.number().nonnegative().optional(),
  metadata: z.record(z.any()).optional()
});

export type CreateCallDto = z.infer<typeof createCallSchema>;
```

**4. Middleware Usage**
```typescript
// middlewares/validator.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      });
    }
  };
};

// Usage in routes
router.post('/calls', validate(createCallSchema), callController.create);
```

## Database Development

### Prisma Workflow

**1. Update Schema**
```prisma
// prisma/schema.prisma
model Call {
  id          Int       @id @default(autoincrement())
  agentId     Int
  destination String
  status      CallStatus
  createdAt   DateTime  @default(now())
  
  agent       Agent     @relation(fields: [agentId], references: [id])
  
  @@index([agentId])
  @@index([createdAt])
}
```

**2. Create Migration**
```bash
npx prisma migrate dev --name add_call_indexes
```

**3. Generate Client**
```bash
npx prisma generate
```

**4. Use in Code**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCalls() {
  return await prisma.call.findMany({
    include: {
      agent: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}
```

### Raw SQL Queries

```typescript
// For complex queries not supported by Prisma
import { getPool } from '../db/pool';

async function getCallStatistics(agentId: number) {
  const pool = getPool();
  
  const [rows] = await pool.query(`
    SELECT 
      COUNT(*) as totalCalls,
      SUM(CASE WHEN status = 'answered' THEN 1 ELSE 0 END) as answeredCalls,
      AVG(duration) as avgDuration
    FROM calls
    WHERE agentId = ?
    GROUP BY agentId
  `, [agentId]);
  
  return rows[0];
}
```

## Testing

### Unit Tests (Jest)

```typescript
// __tests__/services/callService.test.ts
import { CallService } from '../../src/services/callService';

describe('CallService', () => {
  let callService: CallService;
  
  beforeEach(() => {
    callService = new CallService();
  });
  
  describe('findAll', () => {
    it('should return paginated calls', async () => {
      const calls = await callService.findAll({ page: 1, limit: 20 });
      
      expect(calls).toBeDefined();
      expect(Array.isArray(calls)).toBe(true);
    });
  });
  
  describe('create', () => {
    it('should create a new call record', async () => {
      const callData = {
        agentId: 1,
        destination: '+1234567890',
        direction: 'outbound',
        status: 'answered'
      };
      
      const result = await callService.create(callData);
      
      expect(result.insertId).toBeDefined();
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/calls.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Calls API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Login and get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    authToken = response.body.data.token;
  });
  
  describe('GET /api/calls', () => {
    it('should return calls list', async () => {
      const response = await request(app)
        .get('/api/calls')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

### Frontend Tests (React Testing Library)

```typescript
// __tests__/components/CallDialer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CallDialer } from '@/components/CallDialer';

describe('CallDialer', () => {
  it('should render dial button', () => {
    render(<CallDialer agentId={1} onCallComplete={jest.fn()} />);
    
    const button = screen.getByRole('button', { name: /dial/i });
    expect(button).toBeInTheDocument();
  });
  
  it('should disable button while dialing', async () => {
    render(<CallDialer agentId={1} onCallComplete={jest.fn()} />);
    
    const button = screen.getByRole('button', { name: /dial/i });
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
    expect(screen.getByText(/dialing/i)).toBeInTheDocument();
  });
});
```

## Debugging

### Backend Debugging

**VS Code Launch Configuration:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/apps/backend/src/server.ts",
      "preLaunchTask": "tsc: build - apps/backend/tsconfig.json",
      "outFiles": ["${workspaceFolder}/apps/backend/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

**Console Logging:**
```typescript
// Use structured logging
import { logger } from './utils/logger';

logger.info('Call created', { callId: 123, agentId: 1 });
logger.error('Call failed', { error: err.message, stack: err.stack });
```

### Frontend Debugging

**React DevTools:**
- Install React DevTools browser extension
- Inspect component tree
- View props and state
- Profile performance

**Console Debugging:**
```typescript
// Use console groups for better organization
console.group('Call Dialing');
console.log('Agent ID:', agentId);
console.log('Destination:', destination);
console.groupEnd();
```

## Git Workflow

### Branch Naming

```
feature/add-call-recording
bugfix/fix-login-redirect
hotfix/security-patch
refactor/improve-api-structure
docs/update-readme
```

### Commit Messages

Follow Conventional Commits:

```
feat: add call recording feature
fix: resolve login redirect issue
docs: update API documentation
refactor: improve database queries
test: add unit tests for CallService
chore: update dependencies
```

### Pull Request Process

1. **Create PR with description**
   - What changes were made
   - Why they were made
   - How to test

2. **Request review**
   - At least one approval required
   - Address review comments

3. **Merge**
   - Squash and merge for clean history
   - Delete branch after merge

## Performance Optimization

### Frontend Optimization

**1. Code Splitting**
```typescript
// Dynamic imports for large components
import dynamic from 'next/dynamic';

const CallRecorder = dynamic(() => import('./CallRecorder'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
```

**2. Memoization**
```typescript
import { useMemo, useCallback } from 'react';

function CallList({ calls }) {
  const filteredCalls = useMemo(() => {
    return calls.filter(call => call.status === 'answered');
  }, [calls]);
  
  const handleCallClick = useCallback((callId) => {
    // Handle click
  }, []);
  
  return <div>{/* Render calls */}</div>;
}
```

**3. Image Optimization**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority
/>
```

### Backend Optimization

**1. Database Indexing**
```sql
CREATE INDEX idx_calls_agent_created ON calls(agentId, createdAt);
CREATE INDEX idx_calls_status ON calls(status);
```

**2. Query Optimization**
```typescript
// ❌ Bad - N+1 query problem
const calls = await prisma.call.findMany();
for (const call of calls) {
  const agent = await prisma.agent.findUnique({ where: { id: call.agentId } });
}

// ✅ Good - Single query with join
const calls = await prisma.call.findMany({
  include: {
    agent: true
  }
});
```

**3. Caching**
```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function getCachedCalls(agentId: number) {
  const cacheKey = `calls:agent:${agentId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const calls = await fetchCallsFromDb(agentId);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(calls));
  
  return calls;
}
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial development guide |
