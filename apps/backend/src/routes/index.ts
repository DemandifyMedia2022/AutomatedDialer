import { Router } from 'express';
import { health } from '../controllers/healthController';
import auth from './auth';
import users from './users';
import extensions from './extensions';
import agents from './agents';
import { env } from '../config/env';
import multer from 'multer';
import path from 'path';
import { db } from '../db/prisma';
import { requireAuth, requireRoles } from '../middlewares/auth';
import { csrfProtect } from '../middlewares/csrf';
import { z } from 'zod';

const router = Router();

router.get('/health', health);
router.use('/auth', auth);
router.use('/users', users);
router.use('/extensions', extensions);
router.use('/agents', agents);

router.get('/sip/config', (_req, res) => {
  res.json({
    wssUrl: env.SIP_WSS_URL,
    domain: env.SIP_DOMAIN,
    stunServer: env.STUN_SERVER,
  });
});

// Storage for recordings
const recordingsPath = path.isAbsolute(env.RECORDINGS_DIR)
  ? env.RECORDINGS_DIR
  : path.resolve(process.cwd(), env.RECORDINGS_DIR);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsPath),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `rec_${ts}${ext}`);
  },
});
const upload = multer({ storage });

// Save call detail and recording (Authenticated: agent/manager/superadmin). CSRF required when using cookie auth.
// Lightweight in-memory rate limiter for this route
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
const callsLimiter = makeLimiter({ windowMs: 60 * 1000, limit: 60 });

const CallsSchema = z.object({
  campaign_name: z.string().trim().min(1).optional().nullable(),
  useremail: z.string().email().optional().nullable(),
  username: z.string().trim().min(1).optional().nullable(),
  unique_id: z.string().trim().min(1).optional().nullable(),
  start_time: z.coerce.date().optional().nullable(),
  answer_time: z.coerce.date().optional().nullable(),
  end_time: z.coerce.date().optional().nullable(),
  call_duration: z.coerce.number().int().nonnegative().optional().nullable(),
  billed_duration: z.coerce.number().int().nonnegative().optional().nullable(),
  source: z.string().optional().nullable(),
  extension: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  charges: z.coerce.number().optional().nullable(),
  direction: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  disposition: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  recording_url: z.string().url().optional().nullable(),
  call_type: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  prospect_name: z.string().optional().nullable(),
  prospect_email: z.string().email().optional().nullable(),
  prospect_company: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  job_level: z.string().optional().nullable(),
  data_source_type: z.string().optional().nullable(),
});

const callsHandler = async (req: any, res: any, next: any) => {
  try {
    const parsed = CallsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() });
    }
    const b = parsed.data as any;
    const file = (req as any).file;

    const recording_url = file
      ? `${env.PUBLIC_BASE_URL}/uploads/${file.filename}`
      : b.recording_url || null;

    const data = {
      campaign_name: b.campaign_name || null,
      useremail: b.useremail || null,
      username: b.username || null,
      unique_id: b.unique_id || null,
      start_time: b.start_time || new Date(),
      answer_time: b.answer_time ?? null,
      end_time: b.end_time ?? null,
      call_duration: b.call_duration ?? null,
      billed_duration: b.billed_duration ?? null,
      source: b.source || null,
      extension: b.extension || null,
      region: b.region || null,
      charges: b.charges ?? null,
      direction: b.direction || null,
      destination: b.destination || null,
      disposition: b.disposition || null,
      platform: b.platform || 'web',
      recording_url,
      call_type: b.call_type || 'manual',
      remarks: b.remarks || null,
      prospect_name: b.prospect_name || null,
      prospect_email: b.prospect_email || null,
      prospect_company: b.prospect_company || null,
      job_title: b.job_title || null,
      job_level: b.job_level || null,
      data_source_type: b.data_source_type || null,
      // created_at & updated_at defaults handled by DB
    } as any;

    const saved = await (db as any).calls.create({ data });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

if (env.USE_AUTH_COOKIE) {
  router.post(
    '/calls',
    callsLimiter,
    requireAuth,
    requireRoles(['agent', 'manager', 'superadmin']),
    csrfProtect,
    upload.single('recording'),
    callsHandler
  );
} else {
  router.post(
    '/calls',
    callsLimiter,
    requireAuth,
    requireRoles(['agent', 'manager', 'superadmin']),
    upload.single('recording'),
    callsHandler
  );
}

// Example protected routes (Manager+)
router.get('/campaigns', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res) => {
  res.json({ success: true, items: [] });
});

router.get('/monitoring/live', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res) => {
  res.json({ success: true, calls: [] });
});

export default router;
