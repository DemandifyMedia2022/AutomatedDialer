# Automated Dialer Monorepo

Enterprise-style monorepo with separate frontend (Next.js) and backend (Express + MySQL).

## Structure

```
apps/
  frontend/   # Next.js app (App Router)
  backend/    # Express API (TypeScript)
```

## Requirements

- Node 18+
- MySQL 8+

## Install

```bash
npm install
```

## Development

Run both apps concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:4000
- Health:   http://localhost:4000/api/health

Run individually:

```bash
npm run start:frontend   # Next.js
npm run start:backend    # Compiled Express
```

## Backend Environment

Create `apps/backend/.env`:

```
PORT=4000
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/automated_dialer
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Notes

- Frontend dark mode image swap implemented on the sign-in page.
- For API calls from frontend, use `http://localhost:4000` in development or configure `NEXT_PUBLIC_API_URL`.
