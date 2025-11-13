# Quick Reference Guide

## Essential Commands

### Development

```bash
# Install dependencies
npm install

# Start all services
npm run dev:all

# Start individual services
npm run start:frontend    # Port 3000
npm run start:backend     # Port 4000
npm run start:agentic     # Port 4100

# Build for production
npm run build

# Run linter
npm run lint
```

### Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Backup database
mysqldump -u dialer_user -p automated_dialer > backup.sql

# Restore database
mysql -u dialer_user -p automated_dialer < backup.sql
```

### Production (PM2)

```bash
# Start applications
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Monitor
pm2 monit
```

### Nginx

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Important File Locations

### Configuration Files
```
apps/backend/.env                    # Backend environment variables
apps/frontend/.env.local             # Frontend environment variables
apps/backend/prisma/schema.prisma    # Database schema
ecosystem.config.js                  # PM2 configuration
/etc/nginx/sites-available/dialer    # Nginx configuration
```

### Log Files
```
/var/log/dialer/backend-error.log    # Backend errors
/var/log/dialer/backend-out.log      # Backend output
/var/log/nginx/error.log             # Nginx errors
/var/log/nginx/access.log            # Nginx access logs
/var/log/mysql/error.log             # MySQL errors
```

### Data Directories
```
apps/backend/uploads/recordings/     # Call recordings
apps/backend/uploads/sheets/         # Uploaded CSV/XLSX files
/var/backups/dialer/                # Backups
```

## Common Issues Quick Fix

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed
```bash
# Check MySQL status
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql

# Test connection
mysql -u dialer_user -p automated_dialer
```

### Application Won't Start
```bash
# Check logs
pm2 logs

# Restart
pm2 restart all

# Check environment variables
cat apps/backend/.env
```

### Prisma Client Error
```bash
cd apps/backend
npx prisma generate
```

## API Quick Reference

### Base URL
```
Development: http://localhost:4000/api
Production: https://yourdomain.com/api
```

### Authentication
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token in requests
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/calls
```

### Common Endpoints
```
GET  /api/health              # Health check
POST /api/auth/login          # Login
GET  /api/calls               # Get calls
POST /api/calls               # Create call
GET  /api/campaigns           # Get campaigns
POST /api/leads/bulk-upload   # Upload leads
```

## Environment Variables Template

### Backend (.env)
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=mysql://user:password@localhost:3306/automated_dialer
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SIP_SERVER=wss://sip-server:7443
NEXT_PUBLIC_SIP_DOMAIN=yourdomain.com
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature

# Create pull request on GitHub/GitLab

# After merge, update main
git checkout main
git pull origin main
```

## Monitoring

### Check Application Health
```bash
# Backend health
curl http://localhost:4000/api/health

# Check all services
pm2 status

# System resources
htop
df -h
```

### View Logs
```bash
# Application logs
pm2 logs

# Specific application
pm2 logs dialer-backend

# Last 100 lines
pm2 logs --lines 100

# Follow logs
tail -f /var/log/dialer/backend-error.log
```

## Backup and Restore

### Quick Backup
```bash
# Database
mysqldump -u dialer_user -p automated_dialer | gzip > backup_$(date +%Y%m%d).sql.gz

# Files
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz apps/backend/uploads
```

### Quick Restore
```bash
# Database
gunzip < backup_20251113.sql.gz | mysql -u dialer_user -p automated_dialer

# Files
tar -xzf uploads_backup_20251113.tar.gz -C /
```

## Security

### Generate Secrets
```bash
# JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

### Check Security
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check SSL certificate
sudo certbot certificates
```

## Performance

### Database Optimization
```sql
-- Check slow queries
SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;

-- Optimize tables
OPTIMIZE TABLE calls, campaigns, leads;

-- Analyze tables
ANALYZE TABLE calls, campaigns, leads;
```

### Application Performance
```bash
# Check memory usage
pm2 monit

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/api/health
```

## Useful Links

- [Full Documentation](./README.md)
- [Setup Guide](./03-SETUP-GUIDE.md)
- [API Documentation](./04-API-DOCUMENTATION.md)
- [Troubleshooting](./07-TROUBLESHOOTING.md)
- [Deployment Guide](./06-DEPLOYMENT-GUIDE.md)

## Emergency Contacts

```
Development Team: dev-team@yourdomain.com
DevOps Team: devops@yourdomain.com
Security Team: security@yourdomain.com
On-Call: +1-XXX-XXX-XXXX
```

## Quick Troubleshooting Decision Tree

```
Application not responding?
├─ Check if services are running (pm2 status)
│  ├─ Not running → pm2 restart all
│  └─ Running → Check logs (pm2 logs)
│
├─ Database connection error?
│  ├─ Check MySQL status (systemctl status mysql)
│  └─ Verify DATABASE_URL in .env
│
├─ 502 Bad Gateway?
│  ├─ Check backend is running
│  └─ Check Nginx configuration (nginx -t)
│
└─ Still not working?
   └─ Check full troubleshooting guide
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial quick reference |
