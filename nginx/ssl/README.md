# SSL Certificate Setup

This directory should contain your SSL certificates for `demandconnect.demand-tech.com`.

## Required Files

1. `fullchain.pem` - Full certificate chain (certificate + intermediate certificates)
2. `privkey.pem` - Private key file

## Getting SSL Certificates

### Option 1: Let's Encrypt (Recommended - Free)

Use Certbot to automatically obtain and renew certificates:

```bash
# Install certbot on the host (if not using Docker for certbot)
sudo apt-get update
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d demandconnect.demand-tech.com

# Copy certificates to nginx/ssl directory
sudo cp /etc/letsencrypt/live/demandconnect.demand-tech.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/demandconnect.demand-tech.com/privkey.pem ./nginx/ssl/
sudo chown $USER:$USER ./nginx/ssl/*.pem
```

### Option 2: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate (NOT for production)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=demandconnect.demand-tech.com"
```

### Option 3: Commercial Certificate

If you have a commercial SSL certificate:
1. Place the certificate file as `fullchain.pem`
2. Place the private key as `privkey.pem`

## File Permissions

Ensure proper permissions:
```bash
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem
```

## Auto-Renewal Setup (Let's Encrypt)

For Let's Encrypt certificates, set up auto-renewal:

```bash
# Add to crontab (runs twice daily)
0 0,12 * * * certbot renew --quiet && docker-compose restart nginx
```

Or use a certbot Docker container for automatic renewal (see docker-compose.certbot.yml.example).

