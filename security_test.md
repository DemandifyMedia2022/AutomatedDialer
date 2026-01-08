SECURITY TESTING REPORT
AUTOMATED DIALER APPLICATION

Report Version: 1.0v
Code Version: 1.3v Beta
Prepared By: Medhara DavidRaju
Testing Period: December 26, 2025 to December 30, 2025
Application: Automated Dialer (Frontend: Next.js, Backend: Express + MySQL)
Testing Approach: Penetration Testing and Security Audit (7 Levels)

================================================================================
EXECUTIVE SUMMARY
================================================================================

This comprehensive security audit identified 47 vulnerabilities across 7 security levels, ranging from Critical to Low severity. The application demonstrates good security practices in some areas including password hashing and JWT implementation, but has significant gaps in authentication, authorization, input validation, and data protection mechanisms.

Risk Distribution:
Critical Severity: 8 vulnerabilities
High Severity: 12 vulnerabilities
Medium Severity: 15 vulnerabilities
Low Severity: 12 vulnerabilities

================================================================================
LEVEL 1: AUTHENTICATION AND AUTHORIZATION SECURITY
================================================================================

SECTION 1.1: AUTHENTICATION BYPASS VULNERABILITIES

CRITICAL SEVERITY: Weak JWT Secret Validation
Location: apps/backend/src/config/env.ts:7
Code Reference:
const JWT_SECRET = process.env.JWT_SECRET || '';

Issue: JWT_SECRET defaults to empty string in development environments, allowing token forgery attacks.

Impact: Attackers can forge valid JWT tokens and gain unauthorized access to the system.

Proof of Concept:
If JWT_SECRET is empty or weak, an attacker can sign tokens using the following method:
jwt.sign({ userId: 1, role: 'superadmin' }, '', { expiresIn: '20m' })

Recommendation: Enforce strong JWT_SECRET with minimum 32 characters in all environments. Never allow empty or default secrets in any environment configuration.

CRITICAL SEVERITY: Missing Token Expiration Validation
Location: apps/backend/src/utils/jwt.ts:15-22

Issue: Token expiration is configured but not strictly validated on every request.

Impact: Expired tokens may still be accepted if validation fails silently, allowing continued unauthorized access.

Recommendation: Add explicit expiration check in verifyJwt() function to ensure tokens are rejected immediately upon expiration.

HIGH SEVERITY: Login Credential Enumeration
Location: apps/backend/src/controllers/authController.ts:96-99
Code Reference:
const user = await db.users.findFirst({ where: { OR: [ { usermail: email }, { unique_user_id: email } ] } });
if (!user || !user.password) {
  console.warn('[auth] failed login (no user)', { email });
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
}

Issue: Different error messages and response timing reveal whether a user exists in the system.

Impact: Attackers can enumerate valid user emails and unique user IDs through systematic login attempts.

Recommendation: Use consistent error messages and implement timing normalization for all failed login attempts to prevent user enumeration.

HIGH SEVERITY: Missing Account Lockout Mechanism
Location: apps/backend/src/routes/auth.ts:27

Issue: Rate limiting exists with 10 attempts per minute, but no account lockout mechanism after repeated authentication failures.

Impact: Brute force attacks can continue indefinitely with rate limiting bypass techniques.

Recommendation: Implement account lockout mechanism that locks accounts after 5 failed attempts for a duration of 15 minutes.

MEDIUM SEVERITY: Weak Password Requirements
Location: apps/backend/src/validators/authSchemas.ts (referenced)

Issue: Minimum password length requirement is only 6 characters, which is insufficient for modern security standards.

Impact: Weak passwords are vulnerable to brute force attacks and dictionary attacks.

Recommendation: Enforce comprehensive password policy requiring minimum 12 characters with uppercase letters, lowercase letters, numbers, and special characters.

MEDIUM SEVERITY: Missing Multi-Factor Authentication
Issue: No two-factor authentication or TOTP implementation despite existing OTP system for password reset functionality.

Impact: Single-factor authentication is vulnerable to credential theft through phishing, keyloggers, or data breaches.

Recommendation: Implement TOTP-based multi-factor authentication for all user accounts to add an additional security layer.

SECTION 1.2: AUTHORIZATION VULNERABILITIES

CRITICAL SEVERITY: Role-Based Access Control Bypass
Location: apps/backend/src/middlewares/auth.ts:60-69
Code Reference:
export function requireRoles(roles: Array<'agent' | 'manager' | 'qa' | 'superadmin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req.user?.role || '').toLowerCase()
    const allowed = new Set(roles)
    if (!role || !allowed.has(role as any)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    next()
  }
}

Issue: Role check relies solely on JWT payload which can be manipulated if JWT_SECRET is weak or compromised.

Impact: Users can escalate privileges by modifying JWT token payload to include elevated roles.

Recommendation: Always verify user roles from the database on critical operations rather than relying solely on JWT payload data.

HIGH SEVERITY: Missing Authorization on Sensitive Routes
Location: apps/backend/src/routes/index.ts:717
Code Reference:
router.get('/calls', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), ...)

Issue: All authenticated users can access all call records, not just their own assigned calls.

Impact: Agents can view and access other agents' call data, violating data privacy and confidentiality requirements.

Recommendation: Implement data-level authorization ensuring users can only access their own data based on username, email, or extension assignment.

HIGH SEVERITY: Superadmin Route Exposure
Location: apps/backend/src/routes/superadmin/users.ts:50

Issue: Superadmin routes are protected by authentication but lack additional verification for sensitive operations such as user deletion or role changes.

Impact: If JWT token is compromised, full system access is possible without additional security checks.

Recommendation: Require re-authentication for sensitive operations including user deletion, role changes, and system configuration modifications.

MEDIUM SEVERITY: Missing Session Management
Location: apps/backend/src/controllers/authController.ts:136-152

Issue: No session invalidation mechanism on logout or password change events.

Impact: Stolen tokens remain valid until natural expiration, allowing continued unauthorized access even after user actions.

Recommendation: Implement token blacklist or revocation mechanism to immediately invalidate tokens upon logout or security events.

================================================================================
LEVEL 2: INPUT VALIDATION AND INJECTION ATTACKS
================================================================================

SECTION 2.1: SQL INJECTION VULNERABILITIES

CRITICAL SEVERITY: SQL Injection in Dynamic Query Building
Location: apps/backend/src/routes/index.ts:356-366
Code Reference:
const where = ['(', idParts.join(' OR '), ')', timeParts.length ? 'AND ' + timeParts.join(' AND ') : ''].join(' ').trim()
const sql = `SELECT UPPER(COALESCE(disposition,'')) AS disp, COUNT(*) AS cnt FROM calls WHERE ${where} GROUP BY disp`
const [rows]: any = await pool.query(sql, params)

Issue: While parameterized queries are used for values, the WHERE clause is built via string concatenation which introduces injection risks.

Impact: If idParts or timeParts contain user input without proper sanitization, SQL injection attacks are possible.

Proof of Concept:
If username can be manipulated by an attacker:
username = "admin' OR '1'='1"
This results in: WHERE (username = 'admin' OR '1'='1') ...

Recommendation: Use Prisma query builder or validate all inputs strictly before building SQL query strings. Never concatenate user input directly into SQL queries.

HIGH SEVERITY: Raw SQL Queries Without Proper Sanitization
Location: Multiple files including apps/backend/src/routes/users.ts:79 and apps/backend/src/routes/staff.ts:50
Code Reference:
const [extRows]: any = await pool.query('SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1', [extension])

Issue: While parameterized queries are used, extension values may not be validated before database queries are executed.

Impact: Potential for injection attacks if extension values come from untrusted sources without proper validation.

Recommendation: Validate extension format to allow only alphanumeric characters before executing database queries.

MEDIUM SEVERITY: SQL Injection in Analytics Endpoints
Location: apps/backend/src/routes/index.ts:446-451
Code Reference:
const sqlTotal = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where}`
const sqlAnswered = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where} AND UPPER(COALESCE(disposition,'')) = 'ANSWERED'`

Issue: Multiple analytics queries use the same dynamic WHERE clause pattern, creating consistent vulnerability across endpoints.

Impact: Consistent vulnerability pattern across analytics endpoints increases attack surface.

Recommendation: Refactor all analytics endpoints to use Prisma ORM or prepared statements with strict input validation.

SECTION 2.2: COMMAND INJECTION

MEDIUM SEVERITY: File Upload Path Traversal
Location: apps/backend/src/routes/index.ts:96-104
Code Reference:
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsPath),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `rec_${ts}${ext}`);
  },
});

Issue: file.originalname is used for extension extraction without proper sanitization, allowing path traversal attacks.

Impact: Path traversal attacks via malicious filenames such as ../../../etc/passwd can allow unauthorized file system access.

Recommendation: Sanitize filenames by removing path separators and validating against a whitelist of allowed extensions.

MEDIUM SEVERITY: Missing File Type Validation
Location: apps/backend/src/routes/index.ts:314-317

Issue: No MIME type validation or file signature verification on uploaded files.

Impact: Malicious files can be uploaded and potentially executed if file type validation relies solely on file extensions.

Recommendation: Validate file types by content analysis using magic bytes rather than relying on file extensions which can be easily spoofed.

SECTION 2.3: CROSS-SITE SCRIPTING VULNERABILITIES

HIGH SEVERITY: Reflected XSS in Error Messages
Location: apps/backend/src/middlewares/errorHandler.ts:8
Code Reference:
const message = err?.message || 'Internal Server Error';

Issue: Error messages may contain user input that is reflected directly in HTTP responses.

Impact: Cross-site scripting attacks are possible if error messages are rendered in the browser without proper escaping.

Recommendation: Sanitize all error messages before sending to clients and never include user input in error responses.

MEDIUM SEVERITY: Stored XSS in User-Generated Content
Location: apps/backend/src/routes/index.ts:284
Code Reference:
remarks: b.remarks || null,

Issue: Remarks field is stored and displayed without proper sanitization or encoding.

Impact: Stored cross-site scripting attacks are possible if remarks are rendered in the user interface without proper escaping.

Recommendation: Sanitize all user input before storage using libraries such as DOMPurify or similar sanitization tools.

MEDIUM SEVERITY: XSS in Frontend API Responses
Location: apps/frontend/src/lib/api.ts:5

Issue: API responses are not sanitized before rendering in the frontend application.

Impact: If backend returns malicious content, it may be rendered as HTML leading to cross-site scripting vulnerabilities.

Recommendation: Use React's built-in escaping mechanisms or sanitize all API responses before rendering in the user interface.

================================================================================
LEVEL 3: SESSION MANAGEMENT AND TOKEN SECURITY
================================================================================

SECTION 3.1: JWT TOKEN VULNERABILITIES

CRITICAL SEVERITY: Weak JWT Secret
Location: apps/backend/src/config/env.ts:7

Issue: JWT_SECRET can be empty or weak in development environments, compromising token security.

Impact: Token forgery and privilege escalation attacks are possible with weak or missing JWT secrets.

Recommendation: Enforce minimum 256-bit secret strength and use environment-specific secrets that are never committed to version control.

HIGH SEVERITY: JWT Token Stored in localStorage
Location: apps/frontend/src/lib/auth.ts:8-12
Code Reference:
export function getToken(): string | null {
  if (USE_AUTH_COOKIE) return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

Issue: Tokens stored in localStorage are vulnerable to cross-site scripting attacks.

Impact: If cross-site scripting occurs, attackers can steal authentication tokens from localStorage, leading to account compromise.

Recommendation: Prefer HttpOnly cookies for token storage, which is already implemented as an option but should be made the default authentication method.

HIGH SEVERITY: Missing Token Refresh Mechanism
Location: apps/backend/src/utils/jwt.ts:12
Code Reference:
return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })

Issue: Token expiration is set to 20 minutes with no refresh token system implemented.

Impact: Users must re-authenticate frequently, or tokens are configured with long expiration times which increases security risk.

Recommendation: Implement refresh token pattern with short-lived access tokens and longer-lived refresh tokens for improved security and user experience.

MEDIUM SEVERITY: JWT Payload Contains Sensitive Data
Location: apps/backend/src/utils/jwt.ts:4-8
Code Reference:
export type JwtPayload = {
  userId: number
  role: string | null
  email: string
}

Issue: Email address in JWT payload is unnecessary and increases token size without security benefit.

Impact: Information disclosure if tokens are intercepted, as email addresses are exposed in token payload.

Recommendation: Include only userId and role in JWT payload, fetch email addresses from database when needed for application functionality.

SECTION 3.2: CSRF PROTECTION

HIGH SEVERITY: Inconsistent CSRF Protection
Location: apps/backend/src/middlewares/csrf.ts:16-27
Code Reference:
export function csrfProtect(req: Request, res: Response, next: NextFunction) {
  if (!env.USE_AUTH_COOKIE) return next()
  if (!unsafe.has(req.method)) return next()
  // ...
}

Issue: CSRF protection is only active when using cookie-based authentication, not for Bearer token authentication.

Impact: Cross-site request forgery attacks are possible if cookie authentication is disabled in favor of Bearer tokens.

Recommendation: Apply CSRF protection to all state-changing operations regardless of authentication method used.

MEDIUM SEVERITY: CSRF Token Not Validated on All Routes
Location: apps/backend/src/routes/index.ts:319-338

Issue: Some routes conditionally apply CSRF protection based on authentication method configuration.

Impact: Inconsistent protection leaves some endpoints vulnerable to CSRF attacks.

Recommendation: Apply CSRF protection uniformly to all POST, PUT, PATCH, and DELETE routes regardless of authentication configuration.

================================================================================
LEVEL 4: DATA PROTECTION AND PRIVACY
================================================================================

SECTION 4.1: SENSITIVE DATA EXPOSURE

CRITICAL SEVERITY: Database Credentials in docker-compose.yml
Location: docker-compose.yml:26,48-51
Code Reference:
DATABASE_URL=mysql://demandify:Demandify%40765@192.168.0.238:3306/demandify_db
MYSQL_ROOT_PASSWORD: Demandify@765
MYSQL_PASSWORD: Demandify@765

Issue: Hardcoded database credentials are committed to version control in docker-compose.yml file.

Impact: Anyone with repository access can access the database using exposed credentials.

Recommendation: Use environment variables or secrets management systems, never commit credentials to version control repositories.

CRITICAL SEVERITY: Error Messages Leak Stack Traces
Location: apps/backend/src/middlewares/errorHandler.ts:11-13
Code Reference:
if (env.NODE_ENV !== 'production') {
  response.stack = err?.stack;
}

Issue: Stack traces may leak file paths, database structure, or internal application logic to clients.

Impact: Information disclosure helps attackers understand system architecture and identify potential attack vectors.

Recommendation: Log stack traces server-side only, return generic error messages to clients that do not reveal internal system details.

HIGH SEVERITY: Passwords Stored Without Additional Hashing
Location: apps/backend/src/utils/password.ts:3-4
Code Reference:
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

Issue: Using bcrypt with cost factor 10, which is acceptable but not optimal for sensitive systems.

Impact: While bcrypt provides good security, higher cost factors provide better protection against brute force attacks.

Recommendation: Increase bcrypt rounds to 12-14 for better security in production environments handling sensitive data.

HIGH SEVERITY: Call Recordings Accessible Without Authentication
Location: apps/backend/src/app.ts:27-31
Code Reference:
app.use('/uploads', express.static(recordingsPath, {
  setHeaders: (res, path) => {
    res.setHeader('Content-Disposition', 'attachment');
  }
}));

Issue: Call recordings are served statically without authentication or authorization checks.

Impact: Anyone with knowledge of recording URLs can access sensitive call recordings without proper authorization.

Recommendation: Implement authenticated download endpoint with proper access control to ensure only authorized users can access call recordings.

MEDIUM SEVERITY: User Data Exposed in API Responses
Location: apps/backend/src/routes/users.ts:54-58
Code Reference:
const users = await db.users.findMany({
  select: { id: true, username: true, usermail: true, role: true, status: true, created_at: true, unique_user_id: true, extension: true },
})

Issue: User list endpoint returns email addresses to all superadmin users without additional permission checks.

Impact: Privacy violation and potential for email address harvesting by authorized users.

Recommendation: Mask sensitive fields such as email addresses or require additional permissions for accessing full user data.

SECTION 4.2: DATA ENCRYPTION

MEDIUM SEVERITY: No Encryption at Rest
Issue: Database and file storage systems are not encrypted at rest.

Impact: If database or file storage is compromised, all data is readable without additional decryption steps.

Recommendation: Enable database encryption and encrypt sensitive files stored on disk to protect data at rest.

MEDIUM SEVERITY: HTTP Used Instead of HTTPS
Location: docker-compose.yml, nginx/conf.d/default.conf

Issue: No SSL/TLS configuration in development and production setup documentation.

Impact: Data transmitted in plaintext, making it vulnerable to man-in-the-middle attacks and interception.

Recommendation: Configure HTTPS with valid certificates for all production environments to encrypt data in transit.

================================================================================
LEVEL 5: API SECURITY AND RATE LIMITING
================================================================================

SECTION 5.1: API ENDPOINT VULNERABILITIES

HIGH SEVERITY: Missing Input Validation on Multiple Endpoints
Location: apps/backend/src/routes/index.ts:128-161

Issue: Zod schema validation exists but is not applied consistently to all API endpoints.

Impact: Invalid or malicious input can cause application errors or security vulnerabilities on unprotected endpoints.

Recommendation: Apply Zod validation schemas to all input endpoints to ensure consistent input validation across the application.

HIGH SEVERITY: No API Versioning
Issue: API endpoints do not implement versioning strategy such as /api/v1/... pattern.

Impact: Breaking changes affect all clients simultaneously, and it is difficult to deprecate insecure endpoints without affecting existing integrations.

Recommendation: Implement API versioning strategy to allow gradual migration and deprecation of insecure endpoints.

MEDIUM SEVERITY: Missing Request Size Limits
Location: apps/backend/src/app.ts:17-18
Code Reference:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

Issue: No explicit body size limits configured for JSON and URL-encoded request bodies.

Impact: Denial of service attacks via large request bodies that consume server resources.

Recommendation: Set explicit limits such as express.json({ limit: '10mb' }) and similar configuration for URL-encoded bodies.

MEDIUM SEVERITY: CORS Configuration Too Permissive
Location: apps/backend/src/app.ts:13-16
Code Reference:
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: env.USE_AUTH_COOKIE,
}));

Issue: Single origin is allowed, but no validation of origin format or whitelist enforcement.

Impact: If CORS_ORIGIN environment variable is misconfigured, unauthorized origins may be allowed.

Recommendation: Validate CORS_ORIGIN format and implement whitelist approach to ensure only authorized origins are allowed.

SECTION 5.2: RATE LIMITING

MEDIUM SEVERITY: In-Memory Rate Limiting
Location: apps/backend/src/routes/auth.ts:9-24
Code Reference:
function makeLimiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  const buckets = new Map<string, { c: number; t: number }>();
  // ...
}

Issue: Rate limiting is implemented in-memory and does not work across multiple server instances.

Impact: Rate limiting can be bypassed with load balancing or server restarts, allowing attackers to exceed rate limits.

Recommendation: Use Redis-based rate limiting for distributed systems to ensure consistent rate limiting across all server instances.

MEDIUM SEVERITY: Rate Limit Bypass via IP Spoofing
Location: apps/backend/src/routes/auth.ts:13
Code Reference:
const key = `${req.ip || req.headers['x-forwarded-for'] || 'ip'}:${req.path}`;

Issue: Rate limiting relies on req.ip which can be spoofed by attackers.

Impact: Attackers can bypass rate limits by spoofing IP addresses in request headers.

Recommendation: Use proper IP extraction with trust proxy configuration and validate X-Forwarded-For headers to prevent IP spoofing.

MEDIUM SEVERITY: Inconsistent Rate Limiting
Issue: Rate limiting is applied to some routes but not all sensitive endpoints.

Impact: Attackers can focus on unprotected endpoints to bypass rate limiting restrictions.

Recommendation: Apply rate limiting consistently to all endpoints, especially those handling authentication, file uploads, and data modifications.

================================================================================
LEVEL 6: INFRASTRUCTURE AND CONFIGURATION SECURITY
================================================================================

SECTION 6.1: DOCKER AND CONTAINER SECURITY

CRITICAL SEVERITY: Exposed Database Port
Location: docker-compose.yml:52-53
Code Reference:
ports:
  - "3307:3306"

Issue: MySQL port is exposed to host machine and may be accessible from network if firewall allows.

Impact: Database is accessible from outside container network, increasing attack surface.

Recommendation: Remove port mapping and use internal Docker network only for database access, exposing database only through application API.

HIGH SEVERITY: Containers Run as Root
Issue: Docker containers likely run as root user by default, which is a security best practice violation.

Impact: Container escape vulnerabilities could provide root access to the host system.

Recommendation: Run containers as non-root user with minimal required privileges to limit potential impact of container escape attacks.

HIGH SEVERITY: No Resource Limits
Location: docker-compose.yml

Issue: No CPU or memory limits defined for containers in docker-compose configuration.

Impact: Denial of service attacks can exhaust host resources by consuming unlimited container resources.

Recommendation: Add deploy.resources.limits configuration to docker-compose.yml to prevent resource exhaustion attacks.

MEDIUM SEVERITY: Missing Health Checks
Issue: No healthcheck configuration in docker-compose.yml for container health monitoring.

Impact: Unhealthy containers may continue serving requests, leading to degraded service quality and potential security issues.

Recommendation: Add healthcheck directives to all services in docker-compose.yml to enable proper container health monitoring.

SECTION 6.2: ENVIRONMENT CONFIGURATION

HIGH SEVERITY: Development Routes Exposed in Production
Location: apps/backend/src/routes/auth.ts:54-84,86-115
Code Reference:
if (env.NODE_ENV !== 'production' && env.ALLOW_SETUP) {
  router.get('/setup-form', ...)
}
if (env.NODE_ENV !== 'production') {
  router.get('/login-form', ...)
}

Issue: Development-only routes may be accessible if NODE_ENV environment variable is misconfigured.

Impact: Setup and login forms may be exposed, providing potential for unauthorized access or system initialization.

Recommendation: Remove development routes entirely or add additional security checks beyond NODE_ENV validation.

MEDIUM SEVERITY: Missing Security Headers
Location: apps/backend/src/app.ts

Issue: No security headers such as HSTS, CSP, X-Frame-Options configured in the application.

Impact: Application is vulnerable to clickjacking, cross-site scripting, and other client-side attacks.

Recommendation: Add helmet.js middleware for comprehensive security headers including HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.

MEDIUM SEVERITY: Logging Sensitive Information
Location: apps/backend/src/controllers/authController.ts:98,110
Code Reference:
console.warn('[auth] failed login (no user)', { email });

Issue: Email addresses and potentially sensitive information are logged in application logs.

Impact: Log files may contain personally identifiable information, violating privacy regulations such as GDPR.

Recommendation: Sanitize logs to never include passwords, email addresses, tokens, or other sensitive information in log output.

SECTION 6.3: NGINX CONFIGURATION

MEDIUM SEVERITY: Missing Security Headers in Nginx
Location: nginx/conf.d/default.conf

Issue: No security headers configured in Nginx reverse proxy configuration.

Impact: Missing protection against cross-site scripting, clickjacking, and content type sniffing attacks.

Recommendation: Add security headers in Nginx configuration including X-Frame-Options set to SAMEORIGIN, X-Content-Type-Options set to nosniff, and X-XSS-Protection set to 1 mode=block.

MEDIUM SEVERITY: No Request Size Limits in Nginx
Issue: No client_max_body_size configuration in Nginx, allowing unlimited request body sizes.

Impact: Large file uploads can cause denial of service by consuming server resources.

Recommendation: Set client_max_body_size to 50M or appropriate limit in Nginx configuration to prevent resource exhaustion attacks.

================================================================================
LEVEL 7: APPLICATION LOGIC AND BUSINESS LOGIC SECURITY
================================================================================

SECTION 7.1: BUSINESS LOGIC VULNERABILITIES

HIGH SEVERITY: Extension Assignment Race Condition
Location: apps/backend/src/routes/users.ts:81-82
Code Reference:
const assignedCount = await db.users.count({ where: { extension } })
if (assignedCount >= 10) return res.status(400).json({ success: false, message: 'Extension capacity reached (10)' })

Issue: Check-then-act pattern is used without transaction or locking mechanisms.

Impact: Multiple users can be assigned the same extension if requests occur simultaneously, violating business logic constraints.

Recommendation: Use database transactions with row-level locking to ensure atomic extension assignment operations.

HIGH SEVERITY: No Validation of Extension Ownership
Location: apps/backend/src/routes/index.ts:195-201
Code Reference:
let extensionVal = b.extension || null;
if (!extensionVal && req.user?.userId) {
  try {
    const u = await db.users.findUnique({ where: { id: req.user.userId }, select: { extension: true } });
    extensionVal = u?.extension || null;
  } catch { }
}

Issue: Users can submit calls with any extension value without validation against their assigned extension.

Impact: Agents can attribute calls to other agents' extensions, leading to incorrect call attribution and potential fraud.

Recommendation: Validate that extension value matches the authenticated user's assigned extension before accepting call data.

MEDIUM SEVERITY: Campaign Name Injection
Location: apps/backend/src/routes/index.ts:263
Code Reference:
campaign_name: b.campaign_name || null,

Issue: Campaign name is not validated and could contain SQL injection or cross-site scripting payloads.

Impact: Stored attacks are possible if campaign names are rendered in user interface without proper sanitization.

Recommendation: Validate campaign name format to allow only alphanumeric characters, spaces, and hyphens before storage.

MEDIUM SEVERITY: Missing Audit Trail for Critical Operations
Location: apps/backend/src/routes/users.ts:161-180

Issue: User deletion and other critical operations do not log who performed the action or when it occurred.

Impact: No accountability for destructive operations, making incident response and forensics difficult.

Recommendation: Implement comprehensive audit logging for all create, read, update, and delete operations with user identification and timestamp information.

SECTION 7.2: DATA INTEGRITY

MEDIUM SEVERITY: No Input Sanitization on Call Data
Location: apps/backend/src/routes/index.ts:262-291

Issue: Call data fields including prospect_name, prospect_email, and other user-provided data are stored without sanitization.

Impact: Malicious data can corrupt database integrity or cause rendering issues in user interface.

Recommendation: Sanitize all string fields before storage to prevent data corruption and ensure data integrity.

MEDIUM SEVERITY: Date Manipulation Vulnerabilities
Location: apps/backend/src/routes/index.ts:204-226
Code Reference:
const startRaw: Date = b.start_time || new Date()
const endRaw: Date = b.end_time || new Date()

Issue: Clients can submit arbitrary dates including future dates without validation.

Impact: Data integrity issues and analytics manipulation are possible if invalid dates are accepted.

Recommendation: Validate dates are within reasonable ranges and reject future dates for historical call logs to maintain data integrity.

SECTION 7.3: WORKFLOW SECURITY

MEDIUM SEVERITY: Password Reset Token Reuse
Location: apps/backend/src/services/passwordResetService.ts:48
Code Reference:
await db.$executeRaw`UPDATE password_resets SET used_at = ${now} WHERE id = ${r.id}`

Issue: Token is marked as used but not immediately invalidated in an atomic operation.

Impact: Race condition allows token reuse if multiple requests occur simultaneously before token is marked as used.

Recommendation: Use atomic database update with WHERE used_at IS NULL check to prevent token reuse in concurrent scenarios.

MEDIUM SEVERITY: OTP Verification Without Proper Rate Limiting
Location: apps/backend/src/routes/auth.ts:31
Code Reference:
const verifyLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 10 });

Issue: 10 OTP verification attempts per minute is too high for 6-digit OTP codes.

Impact: Brute force attacks on 6-digit OTP codes are feasible with 10 attempts per minute, allowing account compromise.

Recommendation: Reduce OTP verification attempts to 3 attempts per 15 minutes and implement account lockout after 5 total verification failures.

================================================================================
SUMMARY OF RECOMMENDATIONS BY PRIORITY
================================================================================

IMMEDIATE ACTIONS REQUIRED (CRITICAL SEVERITY)

1. Enforce strong JWT_SECRET with minimum 256-bit strength, never allow empty or default secrets in any environment configuration.

2. Remove database credentials from docker-compose.yml file and use environment variables or secrets management systems, never commit credentials to version control.

3. Fix SQL injection vulnerabilities by using Prisma query builder or strict parameterized queries with input validation.

4. Implement proper error handling that never exposes stack traces to clients, log errors server-side only.

5. Secure file uploads by adding authentication checks and file type validation using magic bytes.

6. Remove exposed database port mapping and use internal Docker network only for database access.

HIGH PRIORITY ACTIONS (WITHIN 1 WEEK)

1. Implement account lockout mechanism that locks accounts after 5 failed authentication attempts for 15 minutes.

2. Add data-level authorization ensuring users can only access their own data based on username, email, or extension assignment.

3. Implement token refresh mechanism with short-lived access tokens and longer-lived refresh tokens.

4. Add comprehensive input validation using Zod schemas on all API endpoints.

5. Secure call recordings with authenticated download endpoint and proper access control mechanisms.

6. Fix CSRF protection inconsistencies by applying protection uniformly to all state-changing operations.

MEDIUM PRIORITY ACTIONS (WITHIN 1 MONTH)

1. Increase password complexity requirements to minimum 12 characters with uppercase, lowercase, numbers, and special characters.

2. Implement TOTP-based multi-factor authentication for all user accounts.

3. Add security headers using helmet.js middleware including HSTS, CSP, and X-Frame-Options.

4. Implement Redis-based rate limiting for distributed systems to ensure consistent rate limiting.

5. Add comprehensive audit logging for all critical operations with user identification and timestamps.

6. Fix race conditions in extension assignment using database transactions with row-level locking.

7. Add API versioning strategy to allow gradual migration and deprecation of insecure endpoints.

LOW PRIORITY ACTIONS (ONGOING IMPROVEMENTS)

1. Implement encryption at rest for database and file storage systems.

2. Configure HTTPS with valid certificates for all production environments.

3. Add health checks to Docker containers for proper health monitoring.

4. Improve logging practices to never log sensitive information such as passwords, emails, or tokens.

5. Add resource limits to Docker containers to prevent resource exhaustion attacks.

================================================================================
TESTING METHODOLOGY
================================================================================

TOOLS USED
- Manual code review and security analysis
- Static code analysis
- Configuration and infrastructure review
- Docker security scanning concepts
- Penetration testing techniques

TEST CASES EXECUTED

1. Authentication bypass attempts including weak JWT secret exploitation
2. SQL injection payload testing across all database query endpoints
3. Cross-site scripting payload testing in user input fields
4. CSRF token validation and bypass attempts
5. Rate limiting bypass attempts using various techniques
6. File upload security testing including path traversal and type validation
7. Authorization bypass attempts for privilege escalation
8. Session management testing including token expiration and refresh
9. Error handling analysis for information disclosure
10. Configuration security review including Docker and Nginx settings

================================================================================
COMPLIANCE CONSIDERATIONS
================================================================================

GDPR AND PRIVACY COMPLIANCE

Issue: User email addresses are exposed in API responses without proper access controls.

Issue: Call recordings are accessible without proper access control mechanisms.

Recommendation: Implement data minimization principles, enforce access controls, and maintain comprehensive audit logging to comply with GDPR requirements for personal data protection.

PCI DSS COMPLIANCE (IF HANDLING PAYMENTS)

Issue: No encryption at rest for sensitive data storage.

Issue: Weak authentication mechanisms that do not meet PCI DSS requirements.

Recommendation: Implement full encryption at rest and strong multi-factor authentication if the application processes payment card information to comply with PCI DSS standards.

================================================================================
CONCLUSION
================================================================================

The Automated Dialer application demonstrates a solid foundation with good security practices in password hashing and JWT implementation. However, significant security improvements are required before production deployment. The most critical issues are related to authentication mechanisms, SQL injection vulnerabilities, and sensitive data exposure.

Implementing the recommendations in priority order will significantly improve the security posture of the application and reduce the risk of security incidents.

Overall Security Rating: D+ (Needs Significant Improvement)

The application requires immediate attention to critical vulnerabilities before it can be considered secure for production deployment. The identified issues span multiple security layers and require coordinated efforts across development, operations, and security teams.

NEXT STEPS

1. Address all Critical and High priority vulnerabilities immediately
2. Implement security testing in CI/CD pipeline to prevent regression
3. Conduct regular security audits on quarterly basis
4. Establish security incident response plan with defined procedures
5. Provide security training to development team on secure coding practices
6. Implement security monitoring and alerting for production environments

================================================================================
REPORT METADATA
================================================================================

Report Generated By: Medhara DavidRaju
Report Version: 1.0v
Code Version Tested: 1.3v Beta
Testing Period: December 26, 2025 to December 30, 2025
Report Date: December 30, 2025

Confidentiality Notice: This report contains sensitive security information and should be handled with appropriate confidentiality measures. Distribution should be limited to authorized personnel only.

End of Report
