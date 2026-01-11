#!/bin/bash

# Production Deployment Script for AutomatedDialer
# Usage: ./deploy.sh

set -e

echo "🚀 Starting AutomatedDialer Production Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f .env.production ]; then
        cp .env.production .env
        echo -e "${GREEN}✅ Created .env from .env.production${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env file with your production values before continuing!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.production template not found!${NC}"
        exit 1
    fi
fi

# Check if SSL certificates exist
if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found in nginx/ssl/${NC}"
    echo "Options:"
    echo "1. Use Let's Encrypt (recommended):"
    echo "   sudo certbot certonly --standalone -d demandconnect.demand-tech.com"
    echo "   sudo cp /etc/letsencrypt/live/demandconnect.demand-tech.com/fullchain.pem nginx/ssl/"
    echo "   sudo cp /etc/letsencrypt/live/demandconnect.demand-tech.com/privkey.pem nginx/ssl/"
    echo ""
    echo "2. Use self-signed certificate (development only):"
    echo "   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
    echo "     -keyout nginx/ssl/privkey.pem \\"
    echo "     -out nginx/ssl/fullchain.pem \\"
    echo "     -subj \"/CN=demandconnect.demand-tech.com\""
    echo ""
    read -p "Do you want to create a self-signed certificate now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
          -keyout nginx/ssl/privkey.pem \
          -out nginx/ssl/fullchain.pem \
          -subj "/CN=demandconnect.demand-tech.com"
        chmod 600 nginx/ssl/privkey.pem
        chmod 644 nginx/ssl/fullchain.pem
        echo -e "${GREEN}✅ Created self-signed certificate${NC}"
    else
        echo -e "${RED}❌ SSL certificates required. Exiting.${NC}"
        exit 1
    fi
fi

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p apps/backend/uploads
mkdir -p auto_dialer/database-backups

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Pull latest images (if applicable)
echo "📥 Pulling Docker images..."
docker-compose pull || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
MAX_WAIT=300
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if docker-compose ps | grep -q "unhealthy"; then
        echo -e "${YELLOW}⚠️  Some services are still starting... (${WAITED}s/${MAX_WAIT}s)${NC}"
        sleep 10
        WAITED=$((WAITED + 10))
    else
        echo -e "${GREEN}✅ All services are healthy!${NC}"
        break
    fi
done

# Check database initialization
echo "🗄️  Checking database initialization..."
sleep 5
DB_INIT_STATUS=$(docker-compose ps db-init | grep -o "Exited (0)" || echo "")
if [ -z "$DB_INIT_STATUS" ]; then
    echo -e "${YELLOW}⚠️  Database initialization still in progress...${NC}"
    echo "   Check logs with: docker-compose logs -f db-init"
else
    echo -e "${GREEN}✅ Database initialization completed${NC}"
fi

# Display service status
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "🌐 Access your application at:"
echo "   http://demandconnect.demand-tech.com (redirects to HTTPS)"
echo "   https://demandconnect.demand-tech.com"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Restart services: docker-compose restart"
echo "   Stop services:    docker-compose down"
echo "   Check health:     curl https://demandconnect.demand-tech.com/health"
echo ""

