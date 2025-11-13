# Security Guide

## Security Overview

This guide outlines security best practices, configurations, and procedures for the Automated Dialer application.

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                              │
│ - Firewall (UFW)                                       │
│ - DDoS Protection                                      │
│ - Rate Limiting                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Transport Security                            │
│ - HTTPS/TLS 1.3                                        │
│ - WSS for WebRTC                                       │
│ - Certificate Management                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Application Security                          │
│ - Authentication (JWT)                                 │
│ - Authorization (RBAC)                                 │
│ - Input Validation                                     │
│ - CSRF Protection                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Data Security                                 │
│ - Encryption at Rest                                   │
│ - Secure Password Storage                              │
│ - SQL Injection Prevention                             │
└─────────────────────────────────────────────────────────┘
```

## Authentication and Authorization

### JWT Implementation

**Token Generation (Backend):**
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Password verification
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(userId: number, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!);
}
```

**Authentication Middleware:**
```typescript
import { Request, Response, NextFunction } from 'express';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }
    
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
}
```

### Role-Based Access Control (RBAC)

```typescript
// Authorization middleware
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
    }
    
    next();
  };
}

// Usage in routes
router.get('/admin/users', authenticate, authorize('admin', 'superadmin'), getUsersController);
router.get('/agent/calls', authenticate, authorize('agent', 'manager', 'admin'), getCallsController);
```

## Input Validation

### Zod Validation

```typescript
import { z } from 'zod';

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const createCallSchema = z.object({
  destination: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  agentId: z.number().positive(),
  metadata: z.record(z.any()).optional()
});

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors
          }
        });
      }
      next(error);
    }
  };
};
```

## SQL Injection Prevention

```typescript
// ✅ GOOD - Using parameterized queries
const [rows] = await pool.query(
  'SELECT * FROM users WHERE email = ?',
  [email]
);

// ✅ GOOD - Using Prisma ORM
const user = await prisma.user.findUnique({
  where: { email }
});

// ❌ BAD - String concatenation (vulnerable)
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

## XSS Prevention

```typescript
// React automatically escapes content
<div>{userInput}</div>  // Safe

// For dangerouslySetInnerHTML, sanitize first
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(htmlContent) 
}} />
```

## CSRF Protection

```typescript
import csrf from 'csurf';

// Enable CSRF protection
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);

// Send token to client
app.get('/form', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Validate on POST
app.post('/api/data', csrfProtection, (req, res) => {
  // Process request
});
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

## Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Environment Variables Security

```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Use strong secrets
JWT_SECRET=$(openssl rand -hex 64)

# Restrict file permissions
chmod 600 .env
```

## File Upload Security

```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = /jpeg|jpg|png|pdf|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## Database Security

```sql
-- Create dedicated database user with limited privileges
CREATE USER 'dialer_app'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON automated_dialer.* TO 'dialer_app'@'localhost';
FLUSH PRIVILEGES;

-- Enable SSL for database connections
-- my.cnf
[mysqld]
require_secure_transport=ON
ssl-ca=/path/to/ca.pem
ssl-cert=/path/to/server-cert.pem
ssl-key=/path/to/server-key.pem
```

## Logging and Monitoring

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log security events
logger.warn('Failed login attempt', {
  email: req.body.email,
  ip: req.ip,
  timestamp: new Date()
});

// Never log sensitive data
// ❌ BAD
logger.info('User login', { password: req.body.password });

// ✅ GOOD
logger.info('User login', { email: req.body.email });
```

## Security Checklist

### Development
- [ ] Use HTTPS in all environments
- [ ] Implement authentication and authorization
- [ ] Validate all user inputs
- [ ] Use parameterized queries
- [ ] Hash passwords with bcrypt
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Enable CORS properly
- [ ] Sanitize file uploads
- [ ] Log security events

### Deployment
- [ ] Use environment variables for secrets
- [ ] Enable firewall (UFW)
- [ ] Configure fail2ban
- [ ] Set up SSL certificates
- [ ] Disable unnecessary services
- [ ] Keep software updated
- [ ] Configure backup encryption
- [ ] Set up monitoring alerts
- [ ] Review access controls
- [ ] Conduct security audit

### Ongoing
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Review access logs
- [ ] Rotate secrets periodically
- [ ] Conduct penetration testing
- [ ] Update dependencies
- [ ] Review user permissions
- [ ] Backup verification

## Incident Response

### Security Incident Procedure

1. **Detection**
   - Monitor logs and alerts
   - Identify suspicious activity

2. **Containment**
   - Isolate affected systems
   - Block malicious IPs
   - Disable compromised accounts

3. **Investigation**
   - Analyze logs
   - Determine scope of breach
   - Identify vulnerabilities

4. **Remediation**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Update security measures

5. **Recovery**
   - Restore from clean backups
   - Verify system integrity
   - Resume normal operations

6. **Post-Incident**
   - Document incident
   - Update security procedures
   - Conduct lessons learned

## Compliance

### Data Protection
- Implement data encryption
- Secure data transmission
- Regular data backups
- Data retention policies
- Right to deletion

### Call Recording Compliance
- Obtain consent before recording
- Secure storage of recordings
- Access controls
- Retention period limits
- Deletion procedures

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial security guide |
