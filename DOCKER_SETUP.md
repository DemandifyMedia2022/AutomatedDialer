# Docker Setup Guide

This guide explains how to build and run the Automated Dialer application using Docker Compose.

## Prerequisites

- Docker Desktop (or Docker Engine) installed
- Docker Compose v3.8 or higher
- All environment variables set in `.env` file

## Quick Start

1. **Build and start all services:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## Services

The Docker Compose setup includes the following services:

1. **MySQL** (Port 3307)
   - Database container with persistent volume
   - Automatically runs SQL initialization scripts
   - Health checks enabled

2. **db-init** (One-time)
   - Initializes database schema
   - Restores data from JSON backup files in `auto_dialer/database-backups/`
   - Runs automatically after MySQL is healthy
   - Uses the latest `database_data_*.json` file found

3. **Backend** (Port 4000)
   - Node.js/Express API server
   - Waits for database initialization to complete
   - Connects to MySQL service

4. **Frontend** (Port 3000)
   - Next.js application
   - Depends on backend service

5. **Nginx** (Port 8050)
   - Reverse proxy for frontend and backend
   - Configuration in `nginx/conf.d/`

## Database Setup

The database is automatically initialized with:

1. **SQL Scripts** (run in order):
   - `organization_segregation.sql` - Adds organization_id columns to tables
   - `populate_organization_data.sql` - Populates organization data

2. **JSON Data Restore**:
   - Automatically finds the latest `database_data_*.json` file in `auto_dialer/database-backups/`
   - Uses the `restore-database.js` script to restore all data
   - Data is restored in batches with proper dependency ordering

## Environment Variables

The `.env` file should contain all necessary environment variables. Key variables:

- `MYSQL_ROOT_PASSWORD` - Root password for MySQL (default: rootpassword)
- `MYSQL_DATABASE` - Database name (default: demandify_db)
- `MYSQL_USER` - Database user (default: demandify)
- `MYSQL_PASSWORD` - Database password (default: Demandify@765)
  - Note: Password should be URL-encoded in DATABASE_URL (@ becomes %40)

The `DATABASE_URL` is automatically constructed from these variables and should NOT be set manually in `.env` for Docker setup.

## Volumes

- `mysql_data` - Persistent storage for MySQL data
- `./apps/backend/uploads` - Recording uploads directory
- `./nginx/conf.d` - Nginx configuration files

## Troubleshooting

### Database connection issues

1. Check MySQL is healthy:
   ```bash
   docker-compose ps mysql
   ```

2. Check database initialization logs:
   ```bash
   docker-compose logs db-init
   ```

3. Verify DATABASE_URL encoding:
   - Special characters in passwords must be URL-encoded
   - `@` becomes `%40`
   - `#` becomes `%23`
   - `%` becomes `%25`

### Rebuild after code changes

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Reset database

```bash
docker-compose down -v  # Removes volumes
docker-compose up -d    # Recreates and reinitializes
```

### Manual database restore

If automatic restore fails, you can manually restore:

```bash
docker-compose exec db-init node restore-database.js database-backups/database_data_2026-01-09T16-11-09.json
```

### View service logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mysql
docker-compose logs -f db-init
```

## Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Nginx (Reverse Proxy): http://localhost:8050
- MySQL: localhost:3307

## Production Considerations

For production deployment:

1. Use environment-specific `.env` files
2. Set strong passwords for MySQL
3. Enable SSL/TLS for database connections
4. Use secrets management for sensitive credentials
5. Configure proper backup strategies
6. Set resource limits in docker-compose.yml
7. Use Docker secrets instead of environment variables for sensitive data

