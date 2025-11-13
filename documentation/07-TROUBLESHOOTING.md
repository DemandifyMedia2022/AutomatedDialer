# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Issue: npm install fails with permission errors

**Symptoms:**
```
EACCES: permission denied
```

**Solution:**
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ./node_modules

# Or use nvm to manage Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Issue: Module not found after installation

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# For workspace issues
npm install --workspaces
```

### Database Issues

#### Issue: Cannot connect to MySQL

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
ER_ACCESS_DENIED_ERROR: Access denied for user
```

**Solution:**
```bash
# Check if MySQL is running
# Windows:
sc query MySQL80
net start MySQL80

# Linux:
sudo systemctl status mysql
sudo systemctl start mysql

# Mac:
brew services list
brew services start mysql

# Verify credentials
mysql -u dialer_user -p automated_dialer

# Reset password if needed
mysql -u root -p
ALTER USER 'dialer_user'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### Issue: Prisma Client not generated

**Symptoms:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
cd apps/backend
npx prisma generate
npx prisma migrate deploy
```

#### Issue: Migration fails

**Symptoms:**
```
Error: P3009: migrate found failed migrations
```

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# Reset database (development only!)
npx prisma migrate reset

# For production, manually fix and mark as applied
npx prisma migrate resolve --applied "migration_name"
```

### Application Runtime Issues

#### Issue: Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find and kill process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

#### Issue: Frontend can't connect to backend

**Symptoms:**
- API calls fail with CORS errors
- Network errors in browser console

**Solution:**
```bash
# Check backend is running
curl http://localhost:4000/api/health

# Verify CORS configuration in backend
# apps/backend/src/app.ts
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

# Check frontend API URL
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Issue: Application crashes on startup

**Symptoms:**
- Process exits immediately
- Error in logs

**Solution:**
```bash
# Check logs
pm2 logs
npm run dev # Run in development to see errors

# Common causes:
# 1. Missing environment variables
cat apps/backend/.env

# 2. Database connection
mysql -u user -p automated_dialer

# 3. Port conflicts
netstat -tulpn | grep LISTEN

# 4. File permissions
ls -la apps/backend/uploads
chmod -R 755 apps/backend/uploads
```

### SIP/WebRTC Issues

#### Issue: JsSIP registration fails

**Symptoms:**
```
JsSIP:UA registration failed
```

**Solution:**
```javascript
// Check SIP configuration
const configuration = {
  sockets: [new JsSIP.WebSocketInterface('wss://sip-server:7443')],
  uri: 'sip:agent@domain.com',
  password: 'correct_password',
  register: true
};

// Enable debug logging
JsSIP.debug.enable('JsSIP:*');

// Check WebSocket connection
const ws = new WebSocket('wss://sip-server:7443');
ws.onopen = () => console.log('Connected');
ws.onerror = (err) => console.error('Error:', err);
```

#### Issue: No audio in calls

**Symptoms:**
- Call connects but no audio
- One-way audio

**Solution:**
```javascript
// Check microphone permissions
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Mic access granted'))
  .catch(err => console.error('Mic access denied:', err));

// Check audio elements
const remoteAudio = document.getElementById('remoteAudio');
remoteAudio.srcObject = remoteStream;
remoteAudio.play();

// Check NAT/firewall settings
// Ensure STUN/TURN servers are configured
const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:turn-server:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
};
```

### File Upload Issues

#### Issue: File upload fails

**Symptoms:**
```
Error: File too large
Error: Invalid file type
```

**Solution:**
```bash
# Check file size limit
# apps/backend/.env
MAX_FILE_SIZE=10485760  # 10MB

# Check upload directory permissions
ls -la apps/backend/uploads
chmod -R 755 apps/backend/uploads
chown -R user:user apps/backend/uploads

# Check Nginx file size limit (if using)
# /etc/nginx/nginx.conf
client_max_body_size 10M;
```

#### Issue: Uploaded files not accessible

**Symptoms:**
- 404 error when accessing uploaded files
- Permission denied

**Solution:**
```bash
# Check file exists
ls -la apps/backend/uploads/recordings/

# Check Nginx static file serving
# /etc/nginx/sites-available/dialer
location /uploads {
    alias /path/to/uploads;
    expires 30d;
}

# Restart Nginx
sudo systemctl restart nginx
```

### Performance Issues

#### Issue: Slow API responses

**Symptoms:**
- API calls take > 1 second
- Timeout errors

**Solution:**
```bash
# Check database queries
# Enable query logging in MySQL
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';
SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 100;

# Add database indexes
CREATE INDEX idx_calls_agent_created ON calls(agentId, createdAt);

# Check for N+1 queries
# Use Prisma includes instead of separate queries

# Enable caching
# Install Redis
npm install ioredis
```

#### Issue: High memory usage

**Symptoms:**
- Application crashes with OOM
- Server becomes unresponsive

**Solution:**
```bash
# Check memory usage
free -h
pm2 monit

# Increase Node.js memory limit
# ecosystem.config.js
node_args: '--max-old-space-size=4096'

# Check for memory leaks
# Use Node.js profiler
node --inspect dist/server.js

# Restart application periodically
pm2 restart app --cron "0 3 * * *"
```

#### Issue: Frontend slow to load

**Symptoms:**
- Long initial page load
- Large bundle size

**Solution:**
```bash
# Analyze bundle
npm run build
# Check .next/analyze output

# Enable compression
# next.config.ts
compress: true

# Optimize images
# Use next/image component

# Enable caching
# Add Cache-Control headers
```

### Authentication Issues

#### Issue: JWT token expired

**Symptoms:**
```
Error: jwt expired
401 Unauthorized
```

**Solution:**
```typescript
// Implement token refresh
async function refreshToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  const { token } = await response.json();
  localStorage.setItem('token', token);
}

// Add axios interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await refreshToken();
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

#### Issue: CORS errors on login

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Solution:**
```typescript
// Backend CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Frontend fetch with credentials
fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password })
});
```

### Production Issues

#### Issue: PM2 process keeps restarting

**Symptoms:**
```
pm2 status shows "errored" or constant restarts
```

**Solution:**
```bash
# Check logs
pm2 logs app-name --lines 100

# Check for uncaught exceptions
# Add error handlers in code
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

# Increase restart delay
# ecosystem.config.js
restart_delay: 5000,
max_restarts: 10
```

#### Issue: Nginx 502 Bad Gateway

**Symptoms:**
- 502 error when accessing application
- Nginx error log shows connection refused

**Solution:**
```bash
# Check if backend is running
pm2 status
curl http://localhost:4000/api/health

# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify upstream configuration
# /etc/nginx/sites-available/dialer
upstream backend {
    server 127.0.0.1:4000;
}

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

#### Issue: SSL certificate errors

**Symptoms:**
```
NET::ERR_CERT_AUTHORITY_INVALID
```

**Solution:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

### Development Issues

#### Issue: Hot reload not working

**Symptoms:**
- Changes don't reflect in browser
- Need to manually refresh

**Solution:**
```bash
# Check Next.js dev server
# Delete .next directory
rm -rf apps/frontend/.next
npm run dev

# Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Disable antivirus scanning on project folder (Windows)
```

#### Issue: TypeScript errors in IDE

**Symptoms:**
- Red squiggly lines
- "Cannot find module" errors

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"

# Regenerate types
cd apps/backend
npx prisma generate

# Check tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Debugging Tools

### Backend Debugging

```bash
# Enable debug logging
DEBUG=* npm run dev

# Use Node.js inspector
node --inspect dist/server.js

# Chrome DevTools
# Open chrome://inspect
```

### Frontend Debugging

```bash
# React DevTools
# Install browser extension

# Next.js debug mode
NODE_OPTIONS='--inspect' npm run dev

# Check bundle analyzer
npm run build
# Open .next/analyze/client.html
```

### Database Debugging

```bash
# Enable MySQL query log
SET GLOBAL general_log = 'ON';

# Prisma Studio
npx prisma studio

# Check slow queries
SELECT * FROM mysql.slow_log;
```

## Getting Help

### Log Locations

```
Frontend logs: apps/frontend/.next/
Backend logs: /var/log/dialer/ or pm2 logs
Nginx logs: /var/log/nginx/
MySQL logs: /var/log/mysql/
System logs: /var/log/syslog or journalctl
```

### Useful Commands

```bash
# Check all services
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql

# Monitor resources
htop
iotop
nethogs

# Check disk space
df -h

# Check network
netstat -tulpn
ss -tulpn
```

### Support Channels

1. Check documentation in `/documentation`
2. Review GitHub Issues
3. Check application logs
4. Contact development team
5. Create detailed bug report with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial troubleshooting guide |
