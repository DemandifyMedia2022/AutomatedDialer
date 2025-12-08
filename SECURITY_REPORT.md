# Security Vulnerability Report

This report details security vulnerabilities found in the `automated-dialer-backend` application.

## 1. Critical Vulnerabilities

### 1.1. Unauthenticated Remote Command Execution (RCE)
**Severity:** **Critical**
**Location:** `apps/backend/src/agentic-dialing/server.ts`

**Description:**
The `agentic-dialing` server (running on port 8000 by default) exposes several endpoints (`/start_call`, `/end_call`, `/csv/upload`, etc.) without any authentication.

Furthermore, the `/start_call` endpoint uses `child_process.spawn` with `shell: true` to execute a command. While the arguments seem to be partially controlled, `shell: true` is inherently dangerous.

```typescript
    const agentProcess = spawn('node', [
        '-r', 'ts-node/register',
        path.join(BASE_DIR, 'agent.ts'),
        'start'
    ], {
        env,
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        shell: true // <--- DANGER!
    });
```

Anyone with network access to the server can:
1.  Start arbitrary dialing campaigns.
2.  Upload malicious CSV files.
3.  Download any file from the system (limited by `safeCsvName` but still sensitive data).
4.  Potentially achieve Remote Command Execution if they can manipulate the arguments or environment variables in a way that exploits the shell.

**Recommendation:**
1.  **Implement Authentication:** Require the same JWT authentication as the main backend for all endpoints in the agentic server.
2.  **Disable `shell: true`:** Use `shell: false` (the default) for `spawn`. It is rarely needed and introduces significant risk.
3.  **Validate Input:** Strictly validate `lead_global_index` and `campaign` inputs.

### 1.2. Default Weak Secrets
**Severity:** **Critical**
**Location:** `apps/backend/src/config/env.ts`

**Description:**
The application falls back to insecure default values if environment variables are not set.

```typescript
  JWT_SECRET: process.env.JWT_SECRET || '', // Defaults to empty string!
```

If `JWT_SECRET` is not set in the production environment, the application will sign and verify tokens with an empty string. This allows an attacker to trivially forge valid JWTs (Authentication Bypass).

**Recommendation:**
1.  **Remove Default Value:** Do not provide a default value for `JWT_SECRET`. Throw an error and crash the application at startup if it is missing.
2.  **Enforce Strong Secrets:** Ensure `JWT_SECRET` is a long, random string in production.

## 2. High Vulnerabilities

### 2.1. Stored Cross-Site Scripting (XSS) via File Uploads
**Severity:** **High**
**Location:** `apps/backend/src/routes/calls.ts` and `apps/backend/src/app.ts`

**Description:**
The application allows uploading call recordings and serving them statically.

In `apps/backend/src/routes/calls.ts`:
```typescript
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsPath),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `rec_${ts}${ext}`);
  },
});
```

The code trusts `path.extname(file.originalname)`. An attacker can upload a file named `exploit.html` (containing malicious JavaScript). The server will save it as `rec_<timestamp>.html`.

In `apps/backend/src/app.ts`:
```typescript
  app.use('/uploads', express.static(recordingsPath));
```

The `uploads` directory is served statically. If an attacker uploads `exploit.html`, they can then access it via `/uploads/rec_<timestamp>.html`. If a victim (e.g., an admin) visits this link, the script executes in their browser context, potentially stealing cookies or performing actions on their behalf.

**Recommendation:**
1.  **Validate File Type:** Do not rely on the file extension provided by the user. Use a library like `file-type` to detect the actual MIME type of the uploaded file.
2.  **Force Content-Disposition:** When serving uploaded files, set the `Content-Disposition` header to `attachment` to force the browser to download the file instead of rendering it.
3.  **Restrict Extensions:** Whitelist allowed extensions (e.g., `.webm`, `.mp3`, `.wav`) and reject anything else.

### 2.2. Missing CSRF Protection on Multipart/Form-Data Uploads
**Severity:** **High**
**Location:** `apps/backend/src/routes/calls.ts`

**Description:**
While `csrfProtect` middleware is used in some places, the `calls` upload route seems to rely on `csrfProtect` only if `USE_AUTH_COOKIE` is true.

```typescript
if (env.USE_AUTH_COOKIE) {
  router.post(
    '/calls',
    callsLimiter,
    requireAuth,
    requireRoles(['agent', 'manager', 'superadmin']),
    csrfProtect,
    uploadCalls,
    callsHandler
  );
} else {
    // ... no csrfProtect
}
```

If the application is configured to use cookies for auth (`USE_AUTH_COOKIE=true`), CSRF protection is crucial. Standard CSRF tokens often don't work easily with `multipart/form-data` unless passed as a query parameter or a special header that the client JS must attach. If the `csrfProtect` middleware expects a body parameter, it might fail or be bypassed with multipart data if not configured correctly for it.

**Recommendation:**
Ensure `csrfProtect` properly handles `multipart/form-data` or requires the token in a header (e.g., `X-CSRF-Token`).

## 3. Medium Vulnerabilities

### 3.1. Sensitive Data Exposure in Logs
**Severity:** **Medium**
**Location:** `apps/backend/src/routes/calls.ts`

**Description:**
The application logs the entire request body for the `/calls` endpoint.

```typescript
    try { console.log('[calls] incoming body', b); } catch { }
```

The body `b` contains sensitive prospect information (name, email, phone number, etc.). In a production environment, logs might be stored insecurely or accessed by unauthorized personnel.

**Recommendation:**
1.  **Redact Sensitive Data:** Log only non-sensitive fields or hash/redact PII (Personally Identifiable Information) before logging.
2.  **Disable Debug Logs in Production:** Use a logging library (like `winston` or `pino`) and configure the log level to `info` or `error` in production, avoiding verbose debug logs.

### 3.2. Potential DoS via Unrestricted File Upload Size
**Severity:** **Medium**
**Location:** `apps/backend/src/routes/calls.ts`, `apps/backend/src/routes/dialerSheets.ts`

**Description:**
`multer` is used without explicitly setting `limits.fileSize`. This might allow an attacker to upload extremely large files, exhausting disk space or causing Denial of Service.

**Recommendation:**
Set a reasonable file size limit in `multer` configuration:
```typescript
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
```

### 3.3. Insecure CORS Configuration
**Severity:** **Medium**
**Location:** `apps/backend/src/config/env.ts`

**Description:**
The default `CORS_ORIGIN` is `http://localhost:3000`.

```typescript
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
```

If deployed with this default, it might block legitimate cross-origin requests (if the frontend is on a different domain) or allow local development access in production if not overridden.

**Recommendation:**
Ensure `CORS_ORIGIN` is explicitly set to the production frontend domain in the environment variables. Consider supporting multiple origins if needed (e.g., array of strings).

## 4. Low Vulnerabilities

### 4.1. "First Run" Logic Security
**Severity:** **Low**
**Location:** `apps/backend/src/controllers/authController.ts`

**Description:**
The `setupSuperadmin` function allows creating a superadmin if `db.users.count() > 0` returns false.

```typescript
    const totalUsers = await db.users.count();
    if (totalUsers > 0) {
      return res.status(403).json({ success: false, message: 'Already initialized' });
    }
```

There is a race condition here. If two requests come in simultaneously when the DB is empty, both might pass the check and create two superadmins. While likely low impact, it's a logic flaw.

**Recommendation:**
Use a database constraint or transaction to ensure only one initial superadmin can be created. Or rely on the `SETUP_TOKEN` mechanism more strictly.

### 4.2. Information Disclosure via Stack Traces
**Severity:** **Low**
**Location:** `apps/backend/src/middlewares/errorHandler.ts` (Assumed based on usage in `app.ts`)

**Description:**
If the error handler returns `err.stack` to the client in production, it leaks internal path and code structure information.

**Recommendation:**
Ensure the global error handler does not return stack traces when `NODE_ENV === 'production'`.

---
**Report Generated By:** Jules (AI Software Engineer)
**Date:** 2024-05-23
