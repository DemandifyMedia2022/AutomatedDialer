# Quick Start - Docker Compose

## Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## What Gets Set Up Automatically

1. **MySQL Database** (Port 3307)
   - Creates database from `.env` variables
   - Runs SQL initialization scripts:
     - `organization_segregation.sql`
     - `populate_organization_data.sql`

2. **Database Initialization Service** (One-time)
   - Waits for MySQL to be healthy
   - Runs Prisma migrations
   - Restores data from latest JSON backup in `auto_dialer/database-backups/`
   - Automatically finds and uses the latest `database_data_*.json` file

3. **Backend** (Port 4000)
   - Constructs `DATABASE_URL` from `MYSQL_*` environment variables
   - URL-encodes password automatically (handles special characters)
   - Waits for database initialization to complete
   - Connects to MySQL service

4. **Frontend** (Port 3000)
   - Next.js application
   - All environment variables from `.env` are passed

5. **Nginx** (Port 8050)
   - Reverse proxy for frontend and backend

## Important Notes

- **DATABASE_URL is NOT needed in `.env`** - it's automatically constructed from `MYSQL_*` variables
- The latest JSON backup file in `auto_dialer/database-backups/` will be automatically restored
- Database password special characters (like `@`, `#`) are automatically URL-encoded
- All services wait for dependencies before starting

## Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Nginx Proxy: http://localhost:8050
- MySQL: localhost:3307

## Troubleshooting

```bash
# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs mysql
docker-compose logs db-init
docker-compose logs backend

# Restart a service
docker-compose restart backend

# Rebuild after code changes
docker-compose build --no-cache backend
docker-compose up -d backend
```

