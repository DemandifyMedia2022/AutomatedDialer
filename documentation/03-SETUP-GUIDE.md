# Setup and Installation Guide

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended Version | Purpose |
|----------|----------------|---------------------|---------|
| Node.js | 18.0.0 | 20.x LTS | Runtime environment |
| npm | 9.0.0 | 10.x | Package manager |
| MySQL | 8.0 | 8.0.x | Database server |
| Git | 2.30 | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| Python 3.9+ | Agentic dialing service |
| Docker | Containerized development |
| VS Code | Recommended IDE |
| MySQL Workbench | Database management |
| Postman | API testing |

### System Requirements

**Development Machine**
- OS: Windows 10/11, macOS 10.15+, or Linux
- RAM: 8GB minimum, 16GB recommended
- Storage: 10GB free space
- CPU: Multi-core processor recommended

**Production Server**
- OS: Linux (Ubuntu 20.04+ or CentOS 8+)
- RAM: 16GB minimum, 32GB recommended
- Storage: 100GB+ SSD
- CPU: 4+ cores
- Network: Static IP, open ports 80, 443

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone <repository-url> automated-dialer
cd automated-dialer

# Verify the structure
ls -la
```

Expected output:
```
apps/
documentation/
node_modules/
.git/
.gitignore
package.json
README.md
FEATURES.md
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# This will automatically install dependencies for all workspaces:
# - apps/frontend
# - apps/backend
```

**Troubleshooting Installation Issues:**

```bash
# If you encounter permission errors on Linux/Mac
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ./node_modules

# Clear npm cache if installation fails
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# For Windows permission issues, run terminal as Administrator
```

### 3. Database Setup

#### Install MySQL

**Windows:**
```bash
# Download MySQL installer from https://dev.mysql.com/downloads/installer/
# Run the installer and follow the wizard
# Choose "Developer Default" setup type
```

**macOS:**
```bash
# Using Homebrew
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### Secure MySQL Installation

```bash
# Run security script
sudo mysql_secure_installation

# Follow prompts:
# - Set root password
# - Remove anonymous users: Yes
# - Disallow root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes
```

#### Create Database and User

```bash
# Login to MySQL
mysql -u root -p

# Run the following SQL commands:
```

```sql
-- Create database
CREATE DATABASE automated_dialer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_password' with a strong password)
CREATE USER 'dialer_user'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON automated_dialer.* TO 'dialer_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = 'dialer_user';

-- Exit
EXIT;
```

#### Test Database Connection

```bash
# Test connection with new user
mysql -u dialer_user -p automated_dialer

# If successful, you'll see:
# mysql>

# Exit
EXIT;
```

### 4. Environment Configuration

#### Backend Environment Setup

```bash
# Navigate to backend directory
cd apps/backend

# Create .env file
touch .env

# Edit .env file with your preferred editor
```

**apps/backend/.env:**
```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL=mysql://dialer_user:your_password@localhost:3306/automated_dialer

# JWT Configuration (generate a secure secret)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# SIP Configuration (if applicable)
SIP_SERVER_URL=wss://your-sip-server:7443
SIP_DOMAIN=your-domain.com

# Logging
LOG_LEVEL=debug
```

**Generate Secure JWT Secret:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

#### Frontend Environment Setup

```bash
# Navigate to frontend directory
cd apps/frontend

# Create .env.local file
touch .env.local

# Edit .env.local file
```

**apps/frontend/.env.local:**
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_API_TIMEOUT=30000

# SIP Configuration
NEXT_PUBLIC_SIP_SERVER=wss://your-sip-server:7443
NEXT_PUBLIC_SIP_DOMAIN=your-domain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_RECORDING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Environment
NEXT_PUBLIC_ENV=development
```

### 5. Database Migration

```bash
# Navigate to backend directory
cd apps/backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (if seed script exists)
npx prisma db seed
```

**Verify Migration:**
```bash
# Check database tables
mysql -u dialer_user -p automated_dialer -e "SHOW TABLES;"

# Or use Prisma Studio
npx prisma studio
# Opens at http://localhost:5555
```

### 6. Python Service Setup (Optional)

The agentic dialing service requires Python 3.9+.

```bash
# Check Python version
python --version
# or
python3 --version

# Navigate to agentic service directory
cd apps/backend/src/agentic-dialing

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed successfully')"
```

## Running the Application

### Development Mode

#### Option 1: Run All Services Concurrently (Recommended)

```bash
# From project root
npm run dev:all
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Agentic Service: http://localhost:4100

#### Option 2: Run Services Individually

**Terminal 1 - Frontend:**
```bash
npm run start:frontend
# or
cd apps/frontend
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run start:backend
# or
cd apps/backend
npm run dev
```

**Terminal 3 - Agentic Service:**
```bash
npm run start:agentic
# or
cd apps/backend/src/agentic-dialing
python -m uvicorn app.app:app --host 127.0.0.1 --port 4100 --reload
```

### Verify Installation

#### 1. Check Backend Health

```bash
# Using curl
curl http://localhost:4000/api/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "db": "connected"
}
```

#### 2. Check Frontend

Open browser and navigate to:
- http://localhost:3000

You should see the login page.

#### 3. Check Agentic Service

```bash
curl http://localhost:4100/health

# Expected response:
{
  "status": "healthy"
}
```

### Production Build

```bash
# Build all applications
npm run build

# This creates:
# - apps/frontend/.next/ (Next.js production build)
# - apps/backend/dist/ (Compiled TypeScript)
```

### Production Deployment

#### Start Production Servers

```bash
# Frontend (after build)
cd apps/frontend
npm start
# Runs on port 3000

# Backend (after build)
cd apps/backend
npm start
# Runs on port 4000 (or PORT from .env)
```

## Docker Setup (Alternative)

### Create Dockerfile for Backend

**apps/backend/Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --workspace=apps/backend

# Copy source code
COPY apps/backend ./apps/backend

# Build
WORKDIR /app/apps/backend
RUN npm run build

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "start"]
```

### Create Dockerfile for Frontend

**apps/frontend/Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm ci --workspace=apps/frontend

# Copy source code
COPY apps/frontend ./apps/frontend

# Build
WORKDIR /app/apps/frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

### Docker Compose Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: automated_dialer
      MYSQL_USER: dialer_user
      MYSQL_PASSWORD: your_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: mysql://dialer_user:your_password@mysql:3306/automated_dialer
      PORT: 4000
      NODE_ENV: production
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./apps/backend/uploads:/app/apps/backend/uploads

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:4000
    depends_on:
      - backend

volumes:
  mysql_data:
```

### Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using the port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Issue 2: Database Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:**
```bash
# Check if MySQL is running
# Windows:
sc query MySQL80

# macOS:
brew services list

# Linux:
sudo systemctl status mysql

# Start MySQL if not running
# Windows:
net start MySQL80

# macOS:
brew services start mysql

# Linux:
sudo systemctl start mysql

# Verify DATABASE_URL in .env is correct
```

### Issue 3: Module Not Found

**Error:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Reinstall dependencies
cd apps/backend
rm -rf node_modules package-lock.json
npm install

# Or from root
npm install
```

### Issue 4: Prisma Client Not Generated

**Error:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
cd apps/backend
npx prisma generate
```

### Issue 5: Permission Denied (Linux/Mac)

**Error:**
```
EACCES: permission denied
```

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ./node_modules

# Fix upload directory permissions
chmod -R 755 apps/backend/uploads
```

## Development Tools Setup

### VS Code Extensions (Recommended)

Install these extensions for better development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-python.python",
    "rangav.vscode-thunder-client"
  ]
}
```

### VS Code Settings

**.vscode/settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Git Hooks Setup

```bash
# Install husky for git hooks
npm install --save-dev husky

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
```

## Next Steps

After successful setup:

1. ✅ Review the [API Documentation](./04-API-DOCUMENTATION.md)
2. ✅ Read the [Development Guide](./05-DEVELOPMENT-GUIDE.md)
3. ✅ Check the [Testing Guide](./06-TESTING-GUIDE.md)
4. ✅ Explore the [Deployment Guide](./07-DEPLOYMENT-GUIDE.md)

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting Guide](./08-TROUBLESHOOTING.md)
2. Review GitHub Issues
3. Contact the development team
4. Check application logs in `apps/backend/logs/`

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial setup guide |
