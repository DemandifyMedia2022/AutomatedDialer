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

// Security: Lockout after 5 failed attempts for 15 minutes
const loginLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, limit: 5 });
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



export default router;
