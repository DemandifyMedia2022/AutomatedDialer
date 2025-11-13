import { Router } from 'express';
import { setupSuperadmin, login, me, logout } from '../controllers/authController';
import { forgotPassword, verifyOtp, resetPassword } from '../controllers/passwordResetController';
import { requireAuth } from '../middlewares/auth';
import { csrfProtect } from '../middlewares/csrf';
import { env } from '../config/env';

// Lightweight in-memory rate limiter
function makeLimiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  const buckets = new Map<string, { c: number; t: number }>();
  return function limiter(req: any, res: any, next: any) {
    const now = Date.now();
    const key = `${req.ip || req.headers['x-forwarded-for'] || 'ip'}:${req.path}`;
    const b = buckets.get(key);
    if (!b || now - b.t > windowMs) {
      buckets.set(key, { c: 1, t: now });
      return next();
    }
    if (b.c >= limit) {
      return res.status(429).json({ success: false, message: 'Too many requests' });
    }
    b.c += 1;
    return next();
  };
}

const loginLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 10 });
const logoutLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 30 });
const setupLimiter = makeLimiter({ windowMs: 10 * 60 * 1000, limit: 3 });
const forgotLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 5 });
const verifyLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 10 });
const resetLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 5 });

// Gate for setup route
function setupGate(req: any, res: any, next: any) {
  if (!env.ALLOW_SETUP) return res.status(404).json({ success: false, message: 'Not found' });
  const token = req.header('x-setup-token') || req.header('X-Setup-Token') || '';
  if (env.SETUP_TOKEN && token !== env.SETUP_TOKEN) {
    return res.status(403).json({ success: false, message: 'Invalid setup token' });
  }
  next();
}

const router = Router();

router.post('/setup', setupGate, setupLimiter, setupSuperadmin);
router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, me);
router.post('/logout', logoutLimiter, requireAuth, csrfProtect, logout);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/verify-otp', verifyLimiter, verifyOtp);
router.post('/reset-password', resetLimiter, resetPassword);

if (env.NODE_ENV !== 'production' && env.ALLOW_SETUP) {
  router.get('/setup-form', (_req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Initialize Superadmin</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:520px;margin:40px auto;padding:0 16px}
            form{display:flex;flex-direction:column;gap:12px}
            input,button{padding:10px;font-size:16px}
            .card{border:1px solid #ddd;border-radius:8px;padding:20px}
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Initialize Superadmin</h2>
            <form method="post" action="/api/auth/setup">
              <input name="username" placeholder="Username" required />
              <input type="email" name="usermail" placeholder="Email" required />
              <input type="password" name="password" placeholder="Password (min 6)" minlength="6" required />
              <button type="submit">Create Superadmin</button>
            </form>
          </div>
        </body>
      </html>
    `);
  });
}

if (env.NODE_ENV !== 'production') {
  router.get('/login-form', (_req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Login</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:520px;margin:40px auto;padding:0 16px}
            form{display:flex;flex-direction:column;gap:12px}
            input,button{padding:10px;font-size:16px}
            .card{border:1px solid #ddd;border-radius:8px;padding:20px}
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Login</h2>
            <form method="post" action="/api/auth/login">
              <input type="email" name="usermail" placeholder="Email" required />
              <input type="password" name="password" placeholder="Password" required />
              <button type="submit">Login</button>
            </form>
          </div>
        </body>
      </html>
    `);
  });
}

export default router;
