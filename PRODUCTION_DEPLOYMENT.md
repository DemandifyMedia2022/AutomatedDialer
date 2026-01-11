# Production Deployment Guide

This guide covers deploying the AutomatedDialer to production on `demandconnect.demand-tech.com` with Docker.

## Prerequisites

- Server with Docker and Docker Compose installed
- Domain `demandconnect.demand-tech.com` pointing to your server's IP
- Ports 80 and 443 open in firewall
- SSH access to the server

## Step 1: Server Setup

### Install Docker and Docker Compose

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### Configure Firewall

```bash
# Allow only ports 80 and 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

## Step 2: Deploy Application

### Clone/Upload Code to Server

```bash
# Create project directory
mkdir -p /opt/automated-dialer
cd /opt/automated-dialer

# Upload your code (use scp, git clone, or rsync)
# For example:
# scp -r /path/to/AutomatedDialer/* user@server:/opt/automated-dialer/
```

### Configure Environment Variables

```bash
# Copy production environment template
cp .env.production .env

# Edit .env with your production values
nano .env

# IMPORTANT: Update these values:
# - MYSQL_ROOT_PASSWORD (use a strong password)
# - MYSQL_PASSWORD (use a strong password)
# - JWT_SECRET (use a strong random string)
# - DATABASE_URL (update with correct password)
```

### Set Up SSL Certificates

**Option 1: Let's Encrypt (Recommended)**

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate (make sure port 80 is accessible)
sudo certbot certonly --standalone -d demandconnect.demand-tech.com

# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/demandconnect.demand-tech.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/demandconnect.demand-tech.com/privkey.pem nginx/ssl/

# Set proper permissions
sudo chown $USER:$USER nginx/ssl/*.pem
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem
```

**Option 2: Self-Signed (Development Only)**

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=demandconnect.demand-tech.com"
```

## Step 3: Deploy with Docker Compose

### Start Services

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Verify Services

```bash
# Check all containers are running
docker-compose ps

# Check health
curl http://localhost/health

# Check HTTPS (after SSL is configured)
curl -k https://localhost/health
```

## Step 4: Database Initialization

The database will be automatically initialized on first deployment:

1. MySQL container starts and creates the database
2. `db-init` container runs after MySQL is healthy
3. Database schema is created using Prisma
4. Data from JSON backups is restored
5. Extensions table is populated with passwords

**Monitor initialization:**

```bash
# Watch db-init logs
docker-compose logs -f db-init

# Check database contents
docker-compose exec mysql mysql -uroot -prootpassword demandify_db -e "SHOW TABLES;"
docker-compose exec mysql mysql -uroot -prootpassword demandify_db -e "SELECT COUNT(*) FROM users;"
docker-compose exec mysql mysql -uroot -prootpassword demandify_db -e "SELECT extension_id FROM extensions LIMIT 5;"
```

## Step 5: Auto-Renewal for SSL (Let's Encrypt)

Set up automatic certificate renewal:

```bash
# Edit crontab
crontab -e

# Add this line (runs twice daily at midnight and noon)
0 0,12 * * * certbot renew --quiet && docker-compose -f /opt/automated-dialer/docker-compose.yml restart nginx
```

Or use a certbot Docker container (see docker-compose.certbot.yml.example).

## Step 6: Maintenance Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
docker-compose logs -f mysql
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
docker-compose restart nginx
```

### Update Application

```bash
# Pull latest code (if using git)
git pull

# Rebuild and restart
docker-compose up -d --build

# Force recreate containers
docker-compose up -d --force-recreate --build
```

### Backup Database

```bash
# Create backup
docker-compose exec mysql mysqldump -uroot -prootpassword demandify_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T mysql mysql -uroot -prootpassword demandify_db < backup_YYYYMMDD_HHMMSS.sql
```

### Clean Up

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove unused images
docker image prune -a
```

## Step 7: Monitoring and Health Checks

### Health Check Endpoints

- `http://demandconnect.demand-tech.com/health` - Nginx health
- `https://demandconnect.demand-tech.com/health` - HTTPS health

### Check Service Status

```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Service health
docker-compose ps | grep -v "Up (healthy)"
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs

# Check container status
docker-compose ps

# Check network
docker network ls
docker network inspect automateddialer_dialer-network
```

### Database Connection Issues

```bash
# Check MySQL is running
docker-compose exec mysql mysqladmin ping -h localhost -u root -prootpassword

# Test connection from backend
docker-compose exec backend node -e "require('mysql2').createConnection({host:'mysql',user:'demandify',password:'Demandify@765',database:'demandify_db'}).connect(console.log)"
```

### SSL Certificate Issues

```bash
# Test SSL configuration
openssl s_client -connect demandconnect.demand-tech.com:443 -servername demandconnect.demand-tech.com

# Check certificate expiration
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Verify Nginx can read certificates
docker-compose exec nginx ls -la /etc/nginx/ssl/
```

### Port Conflicts

```bash
# Check if ports 80/443 are in use
sudo netstat -tlnp | grep -E ':80|:443'

# Find process using port
sudo lsof -i :80
sudo lsof -i :443
```

## Security Considerations

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Use Strong Secrets**: Generate strong random strings for JWT_SECRET
3. **Restrict Database Access**: Database is only accessible internally (no exposed ports)
4. **SSL/TLS**: Always use HTTPS in production
5. **Regular Updates**: Keep Docker images and system packages updated
6. **Backup Regularly**: Set up automated database backups
7. **Monitor Logs**: Regularly check logs for security issues

## Performance Optimization

1. **Resource Limits**: Add resource limits to docker-compose.yml if needed
2. **Caching**: Nginx can be configured with caching for static assets
3. **Database Optimization**: Regularly optimize MySQL tables
4. **Log Rotation**: Configure log rotation for large log files

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose config`
3. Test connectivity: `curl -I https://demandconnect.demand-tech.com`

