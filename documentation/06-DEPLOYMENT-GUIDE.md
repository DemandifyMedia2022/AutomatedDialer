# Deployment Guide

## Deployment Overview

This guide covers deploying the Automated Dialer application to production environments.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing
- [ ] No linting errors
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Changelog updated

### Security
- [ ] Environment variables secured
- [ ] Secrets rotated
- [ ] SSL certificates configured
- [ ] Security headers enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place

### Performance
- [ ] Database indexes optimized
- [ ] Static assets optimized
- [ ] Caching configured
- [ ] CDN setup (if applicable)
- [ ] Load testing completed

### Monitoring
- [ ] Logging configured
- [ ] Error tracking setup
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alerts configured

## Environment Setup

### Production Environment Variables

#### Backend (.env.production)
```env
# Server
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL=mysql://user:password@db-host:3306/automated_dialer
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# JWT
JWT_SECRET=<strong-random-secret-64-chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<another-strong-secret>
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/app/uploads

# SIP
SIP_SERVER_URL=wss://sip.yourdomain.com:7443
SIP_DOMAIN=yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/dialer/app.log

# Redis (if using)
REDIS_URL=redis://redis-host:6379

# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=<app-password>

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

#### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SIP_SERVER=wss://sip.yourdomain.com:7443
NEXT_PUBLIC_SIP_DOMAIN=yourdomain.com
NEXT_PUBLIC_ENV=production
```

## Deployment Options

### Option 1: Traditional VPS/Server Deployment

#### Server Requirements
- Ubuntu 20.04 LTS or newer
- 4+ CPU cores
- 16GB+ RAM
- 100GB+ SSD storage
- Static IP address

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Python (for agentic service)
sudo apt install -y python3.9 python3-pip python3-venv
```

#### 2. Application Deployment

```bash
# Create application user
sudo useradd -m -s /bin/bash dialer
sudo usermod -aG sudo dialer

# Switch to application user
sudo su - dialer

# Clone repository
git clone <repository-url> /home/dialer/app
cd /home/dialer/app

# Install dependencies
npm install

# Build applications
npm run build

# Setup environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.production.local
# Edit with production values

# Run database migrations
cd apps/backend
npx prisma migrate deploy
npx prisma generate
```

#### 3. PM2 Configuration

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'dialer-backend',
      cwd: '/home/dialer/app/apps/backend',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/log/dialer/backend-error.log',
      out_file: '/var/log/dialer/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'dialer-frontend',
      cwd: '/home/dialer/app/apps/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/dialer/frontend-error.log',
      out_file: '/var/log/dialer/frontend-out.log'
    },
    {
      name: 'dialer-agentic',
      cwd: '/home/dialer/app/apps/backend/src/agentic-dialing',
      script: 'venv/bin/uvicorn',
      args: 'app.app:app --host 0.0.0.0 --port 4100',
      interpreter: 'none',
      error_file: '/var/log/dialer/agentic-error.log',
      out_file: '/var/log/dialer/agentic-out.log'
    }
  ]
};
```

**Start applications:**
```bash
# Create log directory
sudo mkdir -p /var/log/dialer
sudo chown dialer:dialer /var/log/dialer

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# Monitor applications
pm2 status
pm2 logs
pm2 monit
```

#### 4. Nginx Configuration

**/etc/nginx/sites-available/dialer:**
```nginx
# Backend API
upstream backend {
    server 127.0.0.1:4000;
}

# Frontend
upstream frontend {
    server 127.0.0.1:3000;
}

# Agentic Service
upstream agentic {
    server 127.0.0.1:4100;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main application
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/dialer-access.log;
    error_log /var/log/nginx/dialer-error.log;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Agentic Service
    location /agentic {
        proxy_pass http://agentic;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (uploads)
    location /uploads {
        alias /home/dialer/app/apps/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    location /api/auth/login {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://backend;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/dialer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Option 2: Docker Deployment

#### 1. Production Dockerfiles

**apps/backend/Dockerfile.prod:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --workspace=apps/backend --only=production

# Copy source
COPY apps/backend ./apps/backend

# Build
WORKDIR /app/apps/backend
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/apps/backend/prisma ./prisma

# Create uploads directory
RUN mkdir -p /app/uploads

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

CMD ["node", "dist/server.js"]
```

**apps/frontend/Dockerfile.prod:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm ci --workspace=apps/frontend

# Copy source
COPY apps/frontend ./apps/frontend

# Build
WORKDIR /app/apps/frontend
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

#### 2. Docker Compose Production

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: automated_dialer
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/my.cnf:/etc/mysql/conf.d/my.cnf
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile.prod
    restart: always
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/automated_dialer
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile.prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    depends_on:
      - backend
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/uploads
    depends_on:
      - frontend
      - backend
    networks:
      - app_network

volumes:
  mysql_data:
  redis_data:
  uploads:

networks:
  app_network:
    driver: bridge
```

**Deploy:**
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Option 3: Cloud Platform Deployment

#### Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd apps/frontend
vercel --prod

# Configure environment variables in Vercel dashboard
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

#### AWS Deployment

**Using Elastic Beanstalk:**

1. Install EB CLI
```bash
pip install awsebcli
```

2. Initialize
```bash
eb init -p node.js automated-dialer
```

3. Create environment
```bash
eb create production-env
```

4. Deploy
```bash
eb deploy
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
3. Set environment variables
4. Deploy

## Database Migration

### Production Migration Strategy

```bash
# 1. Backup database
mysqldump -u user -p automated_dialer > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
cd apps/backend
npx prisma migrate deploy --preview-feature

# 3. If successful, run on production
npx prisma migrate deploy

# 4. Verify
npx prisma studio
```

### Rollback Plan

```bash
# Restore from backup
mysql -u user -p automated_dialer < backup_20251113_100000.sql

# Revert code
git revert <commit-hash>
pm2 restart all
```

## Monitoring Setup

### Application Monitoring

**Install Sentry:**
```bash
npm install @sentry/node @sentry/nextjs
```

**Backend (apps/backend/src/app.ts):**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Server Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup log rotation
sudo nano /etc/logrotate.d/dialer
```

**/etc/logrotate.d/dialer:**
```
/var/log/dialer/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 dialer dialer
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Backup Strategy

### Automated Backups

**Backup script (backup.sh):**
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/dialer"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u user -p$DB_PASSWORD automated_dialer | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/dialer/app/apps/backend/uploads

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://your-bucket/backups/
```

**Cron job:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/dialer/scripts/backup.sh
```

## Security Hardening

### Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MySQL (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 3306

# Check status
sudo ufw status
```

### Fail2Ban Setup

```bash
# Install
sudo apt install -y fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

**/etc/fail2ban/jail.local:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

## Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check logs
pm2 logs
journalctl -u nginx -f

# Check ports
sudo netstat -tulpn | grep LISTEN
```

**2. Database connection failed**
```bash
# Test connection
mysql -u user -p -h localhost automated_dialer

# Check MySQL status
sudo systemctl status mysql
```

**3. High memory usage**
```bash
# Check processes
pm2 monit
htop

# Restart applications
pm2 restart all
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial deployment guide |
