# Maintenance Guide

## Regular Maintenance Tasks

### Daily Tasks

#### 1. Monitor Application Health

```bash
# Check application status
pm2 status

# Check logs for errors
pm2 logs --lines 100 | grep -i error

# Check API health
curl http://localhost:4000/api/health

# Monitor system resources
htop
df -h
```

#### 2. Review Error Logs

```bash
# Backend errors
tail -f /var/log/dialer/backend-error.log

# Nginx errors
sudo tail -f /var/log/nginx/error.log

# MySQL errors
sudo tail -f /var/log/mysql/error.log
```

#### 3. Check Database Connections

```bash
# Active connections
mysql -u root -p -e "SHOW PROCESSLIST;"

# Connection count
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

### Weekly Tasks

#### 1. Database Maintenance

```bash
# Optimize tables
mysql -u root -p automated_dialer -e "OPTIMIZE TABLE calls, campaigns, leads;"

# Check table integrity
mysql -u root -p automated_dialer -e "CHECK TABLE calls, campaigns, leads;"

# Analyze tables for query optimization
mysql -u root -p automated_dialer -e "ANALYZE TABLE calls, campaigns, leads;"
```

#### 2. Clean Up Old Data

```sql
-- Archive old call records (older than 90 days)
INSERT INTO calls_archive SELECT * FROM calls WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM calls WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Clean up old recordings (older than 60 days)
DELETE FROM recordings WHERE createdAt < DATE_SUB(NOW(), INTERVAL 60 DAY);
```

```bash
# Remove old recording files
find /home/dialer/app/apps/backend/uploads/recordings -type f -mtime +60 -delete
```

#### 3. Review Performance Metrics

```bash
# Check slow queries
mysql -u root -p -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;"

# Check application response times
# Review monitoring dashboard (Sentry, New Relic, etc.)

# Check disk usage
du -sh /home/dialer/app/apps/backend/uploads/*
```

#### 4. Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update patch versions (safe)
npm update

# Review and update minor/major versions
npm install package@latest
```

### Monthly Tasks

#### 1. Security Updates

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Update Node.js (if needed)
nvm install 20
nvm use 20

# Update npm
npm install -g npm@latest

# Update PM2
npm install -g pm2@latest
pm2 update
```

#### 2. SSL Certificate Renewal

```bash
# Check certificate expiry
sudo certbot certificates

# Renew if needed (auto-renewal should handle this)
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

#### 3. Backup Verification

```bash
# Test database restore
mysql -u root -p test_db < /var/backups/dialer/db_latest.sql.gz

# Verify backup integrity
gunzip -t /var/backups/dialer/db_latest.sql.gz

# Test file restore
tar -tzf /var/backups/dialer/uploads_latest.tar.gz
```

#### 4. Performance Audit

```bash
# Run load tests
# Use tools like Apache Bench, k6, or Artillery

# Frontend performance
npm run build
# Check bundle size and lighthouse scores

# Database performance
# Review slow query log
# Check index usage
```

#### 5. Security Audit

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check for security updates
npm outdated

# Review access logs for suspicious activity
sudo grep "POST /api/auth/login" /var/log/nginx/access.log | grep "401"
```

### Quarterly Tasks

#### 1. Comprehensive Backup Test

```bash
# Full system restore test on staging environment
# 1. Restore database
# 2. Restore application files
# 3. Restore uploads
# 4. Verify functionality
```

#### 2. Capacity Planning

```bash
# Review growth metrics
# - Database size growth
# - Storage usage growth
# - User growth
# - Call volume growth

# Plan for scaling if needed
```

#### 3. Documentation Review

```bash
# Update documentation
# - API changes
# - New features
# - Configuration changes
# - Known issues
```

#### 4. Disaster Recovery Drill

```bash
# Test disaster recovery procedures
# 1. Simulate server failure
# 2. Restore from backups
# 3. Verify data integrity
# 4. Document recovery time
```

## Backup Procedures

### Automated Backups

**Daily Database Backup:**
```bash
#!/bin/bash
# /home/dialer/scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/dialer"
DB_NAME="automated_dialer"
DB_USER="dialer_user"
DB_PASS="your_password"

# Create backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -type f -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-bucket/backups/
```

**Daily File Backup:**
```bash
#!/bin/bash
# /home/dialer/scripts/backup-files.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/dialer"
UPLOAD_DIR="/home/dialer/app/apps/backend/uploads"

# Create backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz $UPLOAD_DIR

# Keep only last 7 days
find $BACKUP_DIR -name "uploads_*.tar.gz" -type f -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/uploads_$DATE.tar.gz s3://your-bucket/backups/
```

**Cron Schedule:**
```bash
# Edit crontab
crontab -e

# Daily backups at 2 AM
0 2 * * * /home/dialer/scripts/backup-db.sh
30 2 * * * /home/dialer/scripts/backup-files.sh
```

### Manual Backup

```bash
# Database backup
mysqldump -u dialer_user -p automated_dialer > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql

# Files backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /home/dialer/app/apps/backend/uploads
```

### Restore Procedures

**Database Restore:**
```bash
# Decompress
gunzip backup_20251113.sql.gz

# Restore
mysql -u dialer_user -p automated_dialer < backup_20251113.sql

# Verify
mysql -u dialer_user -p automated_dialer -e "SELECT COUNT(*) FROM calls;"
```

**Files Restore:**
```bash
# Extract
tar -xzf uploads_backup_20251113.tar.gz -C /

# Verify permissions
chown -R dialer:dialer /home/dialer/app/apps/backend/uploads
chmod -R 755 /home/dialer/app/apps/backend/uploads
```

## Log Management

### Log Rotation

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

/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### Log Analysis

```bash
# Find errors in last 24 hours
grep -i error /var/log/dialer/backend-error.log | grep "$(date +%Y-%m-%d)"

# Count errors by type
grep -i error /var/log/dialer/backend-error.log | awk '{print $5}' | sort | uniq -c | sort -rn

# Find slow requests (> 1s)
grep "duration" /var/log/dialer/backend-out.log | awk '$NF > 1000' | tail -20

# Top IP addresses
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

## Performance Monitoring

### System Monitoring

```bash
# CPU usage
top -bn1 | grep "Cpu(s)"

# Memory usage
free -h

# Disk I/O
iostat -x 1 5

# Network traffic
iftop -i eth0
```

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/api/health

# Database connections
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

**curl-format.txt:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
```

## Database Optimization

### Index Optimization

```sql
-- Check index usage
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    SEQ_IN_INDEX,
    COLUMN_NAME,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'automated_dialer'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- Find unused indexes
SELECT 
    s.TABLE_NAME,
    s.INDEX_NAME
FROM information_schema.STATISTICS s
LEFT JOIN information_schema.INDEX_STATISTICS i
    ON s.TABLE_SCHEMA = i.TABLE_SCHEMA
    AND s.TABLE_NAME = i.TABLE_NAME
    AND s.INDEX_NAME = i.INDEX_NAME
WHERE s.TABLE_SCHEMA = 'automated_dialer'
    AND i.INDEX_NAME IS NULL
    AND s.INDEX_NAME != 'PRIMARY';
```

### Query Optimization

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow-query.log';

-- Analyze slow queries
SELECT 
    query_time,
    lock_time,
    rows_sent,
    rows_examined,
    sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 10;
```

## Security Maintenance

### Access Review

```bash
# Review user accounts
mysql -u root -p -e "SELECT user, host FROM mysql.user;"

# Review sudo access
sudo cat /etc/sudoers

# Review SSH keys
cat ~/.ssh/authorized_keys
```

### Security Scanning

```bash
# Check for rootkits
sudo rkhunter --check

# Check for vulnerabilities
sudo lynis audit system

# Check open ports
sudo nmap -sT -O localhost
```

### Update Security Policies

```bash
# Review firewall rules
sudo ufw status verbose

# Review fail2ban
sudo fail2ban-client status

# Check SSL configuration
sudo sslscan yourdomain.com
```

## Upgrade Procedures

### Application Upgrade

```bash
# 1. Backup current version
cd /home/dialer
tar -czf app_backup_$(date +%Y%m%d).tar.gz app/

# 2. Pull latest code
cd app
git fetch origin
git checkout main
git pull origin main

# 3. Install dependencies
npm install

# 4. Run migrations
cd apps/backend
npx prisma migrate deploy

# 5. Build applications
cd ../..
npm run build

# 6. Restart services
pm2 restart all

# 7. Verify
curl http://localhost:4000/api/health
```

### Database Upgrade

```bash
# 1. Backup database
mysqldump -u dialer_user -p automated_dialer > pre_upgrade_backup.sql

# 2. Run migrations
cd apps/backend
npx prisma migrate deploy

# 3. Verify
npx prisma studio

# 4. Rollback if needed
mysql -u dialer_user -p automated_dialer < pre_upgrade_backup.sql
```

## Monitoring Alerts

### Setup Email Alerts

```bash
# Install mailutils
sudo apt install -y mailutils

# Configure alert script
# /home/dialer/scripts/alert.sh
#!/bin/bash
SUBJECT="$1"
MESSAGE="$2"
EMAIL="admin@yourdomain.com"

echo "$MESSAGE" | mail -s "$SUBJECT" $EMAIL
```

### Disk Space Alert

```bash
#!/bin/bash
# /home/dialer/scripts/check-disk.sh

THRESHOLD=80
USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
    /home/dialer/scripts/alert.sh "Disk Space Alert" "Disk usage is at ${USAGE}%"
fi
```

### Application Down Alert

```bash
#!/bin/bash
# /home/dialer/scripts/check-app.sh

if ! curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
    /home/dialer/scripts/alert.sh "Application Down" "Backend is not responding"
    pm2 restart dialer-backend
fi
```

**Cron Schedule:**
```bash
# Check every 5 minutes
*/5 * * * * /home/dialer/scripts/check-disk.sh
*/5 * * * * /home/dialer/scripts/check-app.sh
```

## Maintenance Windows

### Planned Maintenance

```bash
# 1. Notify users (24 hours in advance)
# 2. Schedule during low-traffic period (e.g., 2-4 AM)
# 3. Create maintenance page

# 4. Put application in maintenance mode
# Create maintenance.html
sudo cp /var/www/maintenance.html /var/www/html/

# Update Nginx config
# /etc/nginx/sites-available/dialer
if (-f /var/www/html/maintenance.html) {
    return 503;
}
error_page 503 @maintenance;
location @maintenance {
    rewrite ^(.*)$ /maintenance.html break;
}

# 5. Perform maintenance tasks
# 6. Test thoroughly
# 7. Remove maintenance mode
# 8. Monitor for issues
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial maintenance guide |
