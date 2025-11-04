# Automated Dialer – Project Overview and Feature Documentation

## Overview
An enterprise-style monorepo for an Automated Dialer platform with a Next.js frontend and an Express + MySQL backend. The app currently provides role-oriented dashboards (Agent, Manager, Super Admin), a themed UI, and a backend health check with database connectivity.

## Architecture
- **Monorepo** using npm workspaces
- **Frontend**: `apps/frontend` (Next.js App Router)
- **Backend**: `apps/backend` (Express + TypeScript)
- **Database**: MySQL via `mysql2/promise`

## Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, next-themes, Radix UI primitives, shadcn-style UI components, Lucide icons
- **Backend**: Express 4, TypeScript 5, zod (ready for validation), dotenv, cors, mysql2
- **Tooling**: concurrently (run FE+BE), ESLint 9

## Local Development
- Install: `npm install`
- Run both apps: `npm run dev`
  - Frontend: http://localhost:3000
  - Backend: http://localhost:4000
  - Health: http://localhost:4000/api/health
- Build all: `npm run build`
- Start individually:
  - Frontend: `npm run start:frontend`
  - Backend: `npm run start:backend`

## Configuration
- Backend `.env` (create at `apps/backend/.env`):
  - `PORT=4000`
  - `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/automated_dialer`
- Frontend API base URL: use `http://localhost:4000` in dev, or set `NEXT_PUBLIC_API_URL` if you add configurable API usage on the frontend.

## Backend Features
- **Express App** (`src/app.ts`)
  - CORS enabled, JSON parsing
  - Routes mounted under `/api`
  - Global error handler
- **Health Endpoint** (`GET /api/health`)
  - Pings MySQL with `SELECT 1 as ok`
  - Responds with `{ success, db, status }`
- **DB Pool** (`src/db/pool.ts`)
  - Lazily initialized MySQL pool using `DATABASE_URL`
- **Configuration** (`src/config/env.ts`)
  - Loads environment variables with defaults

### Current API Surface
- `GET /api/health` — application and database health status

> Note: No authentication/authorization middleware is implemented yet on the backend. Add as needed (e.g., JWT, session, or provider-based).

## Frontend Features
- **App Shell**
  - Root layout with `ThemeProvider` and Geist fonts
  - Global styles in `src/app/globals.css`
  - Light/Dark mode toggle available via user menu
- **Routing**
  - `/` redirects to `/login`
  - `/dashboard` redirects to `/dashboard/agent`
- **Authentication UI**
  - `/login` presents a login form (email/password)
  - Current behavior: client-side submit redirects to `/dashboard` without backend auth; intended as a placeholder
  - Dark mode image swap on the login illustration
- **Role Dashboards** (each with its own sidebar and breadcrumb header)
  - Agent (`/dashboard/agent`)
    - Dialer
      - Manual: `/dashboard/agent/dialer/manual`
      - Automated: `/dashboard/agent/dialer/automated`
    - Campaigns
      - Active Campaigns: `/dashboard/agent/campaigns/active`
      - Campaign History: `/dashboard/agent/campaigns/campaign-history`
    - My Calls
      - Call History: `/dashboard/agent/my-calls/call-history`
      - Lead Details: `/dashboard/agent/my-calls/lead-details`
    - Settings
      - Profile: `/dashboard/agent/settings/profile`
      - Preferences: `/dashboard/agent/settings/preferences`
  - Manager (`/dashboard/manager`)
    - Overview (KPIs, Trends placeholders)
    - Monitoring
      - Track Agent: `/dashboard/manager/monitoring/track-agent`
      - Live Calls: `/dashboard/manager/monitoring/live-calls`
    - Call Management
      - Change DID: `/dashboard/manager/call-management/change-did`
      - Call Details (CDR): `/dashboard/manager/call-management/cdr`
    - Administration
      - Agent: `/dashboard/manager/administration/agent`
      - Campaigns: `/dashboard/manager/administration/campaigns`
    - Settings
      - Profile: `/dashboard/manager/settings/profile`
      - Preferences: `/dashboard/manager/settings/preferences`
  - Super Admin (`/dashboard/superadmin`)
    - Sidebar and layout scaffolding ready (routes/components can be expanded)

### UI/UX Components
- **Sidebar System**: Collapsible sidebars with nested navigation and breadcrumbs
- **NavUser Menu**: Account, Billing, Notifications, Theme toggle, Logout item (placeholder)
- **UI Primitives**: Buttons, Inputs, Cards, Collapsibles, Dropdowns, Breadcrumbs, etc.

## Notable Libraries and Intent
- **jssip** is a root dependency, indicating planned SIP/WebRTC phone features for the dialer. Not yet wired on the frontend.
- **zod** is available for backend schema validation but not yet applied to routes.

## Security & Auth (Planned)
- Backend auth is not implemented; the login page is a UI stub.
- Recommend adding:
  - AuthN: JWT or session-based auth
  - AuthZ: role-based access control (Agent, Manager, Super Admin)
  - Input validation with zod
  - CSRF protection if using cookies

## Observability (Planned)
- Add structured logging (pino/winston)
- Request logging middleware
- Health and readiness probes (K8s friendly)

## Deployment (Planned)
- Frontend: Next.js build output via preferred host (Vercel/Netlify/Static + Node)
- Backend: Node process with environment-based configuration
- Database migrations and seed strategy (e.g., Prisma, Knex, or raw SQL)

## Future Enhancements
- Integrate SIP/WebRTC calling via `jssip` into Agent Dialer pages
- Implement campaigns, CDR, and live monitoring backends
- Real authentication and session handling across roles
- Connect UI to backend APIs through `NEXT_PUBLIC_API_URL`
- Add E2E tests (Playwright/Cypress) and API tests (Vitest/Jest + Supertest)

## Folder Map (High Level)
```
apps/
  frontend/
    src/app/login
    src/app/dashboard/agent/*
    src/app/dashboard/manager/*
    src/app/dashboard/superadmin/*
    src/components/{layout,ui}
  backend/
    src/{app.ts,server.ts}
    src/routes/index.ts
    src/controllers/healthController.ts
    src/db/pool.ts
    src/config/env.ts
```
