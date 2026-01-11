import { Router } from 'express';
import { health } from '../controllers/healthController';
import auth from './auth';
import users from './users';
import extensions from './extensions';
import agents from './agents';
import staff from './staff';
import campaigns from './campaigns';
import agenticData from './agentic-data';
import notes from './notes';
import documents from './documents';
import dialerSheets from './dialerSheets';
import presence from './presence';
import profile from './profile';
import extensionDids from './extensionsDids';
import transcription from './transcription';
import qa from './qa';
import dmForm from './dmForm';
import superadmin from './superadmin';
import calls from './calls';
import dialerRoutes from './gsm/dialer';
import organizationDataRoutes from './organizationDataRoutes';
import { getLiveCalls, updateLiveCallPhase, startLiveCallsSweeper } from './livecalls';
import manager from './manager';

import { env } from '../config/env';
import multer from 'multer';
import path from 'path';
import { db } from '../db/prisma';
import { getPool } from '../db/pool';
import { requireAuth, requireRoles } from '../middlewares/auth';
import { csrfProtect } from '../middlewares/csrf';
import { z } from 'zod';
import { transcribeCallRecordingForCall } from '../services/transcriptionService';

const router = Router();

// Start background sweepers (idempotent)
try { startLiveCallsSweeper() } catch { }

router.get('/health', health);
router.use('/auth', auth);
router.use('/users', users);
router.use('/extensions', extensions);
router.use('/agents', agents);
router.use('/staff', staff);
router.use('/campaigns', campaigns);
router.use('/agentic', agenticData);
router.use('/notes', notes);
router.use('/documents', documents);
router.use('/dialer-sheets', dialerSheets);
router.use('/presence', presence);
router.use('/profile', profile);
router.use('/extension-dids', extensionDids);
router.use('/transcription', transcription);
router.use('/qa', qa);
router.use('/dm-form', dmForm);
router.use('/superadmin', superadmin);
router.use('/calls', calls);
router.use('/dialer', dialerRoutes); // Mount GSM dialer routes
router.use('/data', organizationDataRoutes); // Mount organization-aware data routes
router.use('/manager', manager); // Mount manager routes

router.get('/sip/config', (_req, res) => {
  res.json({
    wssUrl: env.SIP_WSS_URL,
    domain: env.SIP_DOMAIN,
    stunServer: env.STUN_SERVER,
  });
});

// Telxio account endpoint - returns available extensions from fallback or database
router.post('/telxio/account', requireAuth, requireRoles(['superadmin']), async (_req, res) => {
  try {
    // Get extensions from environment variable fallback
    const extensionsFallback = env.TELXIO_EXTENSIONS_FALLBACK?.split(',').map(e => e.trim()).filter(Boolean) || []
    const numbersFallback = env.TELXIO_NUMBERS_FALLBACK?.split(',').map(n => n.trim()).filter(Boolean) || []
    const planKey = env.TELXIO_PLAN_FALLBACK || '10332'
    
    // Also try to get extensions from database
    const pool = getPool()
    const [dbExtensions]: any = await pool.query('SELECT extension_id FROM extensions ORDER BY extension_id')
    const dbExtensionIds = dbExtensions?.map((row: any) => String(row.extension_id)) || []
    
    // Merge and deduplicate extensions (prefer database, fallback to env)
    const allExtensions = [...new Set([...dbExtensionIds, ...extensionsFallback])].sort()
    
    // Return data in format expected by frontend
    const response = {
      data: {
        plan: {
          [planKey]: {
            extensions: allExtensions,
            numbers: numbersFallback,
          }
        }
      }
    }
    
    res.json(response)
  } catch (error: any) {
    console.error('[Telxio Account] Error:', error)
    res.status(500).json({ 
      success: false, 
      message: error?.message || 'Failed to fetch Telxio account data' 
    })
  }
});

// Update live call phase (agents/managers) -> updates shared liveCalls state
router.post('/calls/phase', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const phase = String(req.body?.phase || '');
    const callIdRaw = req.body?.callId;
    const callId = typeof callIdRaw === 'number' ? callIdRaw : parseInt(String(callIdRaw || ''), 10);
    if (!phase || !callId || Number.isNaN(callId)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    await updateLiveCallPhase(req, phase as any, callId);
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Live calls snapshot for manager dashboard
router.get('/live-calls', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res) => {
  try {
    const items = getLiveCalls();
    res.json({ success: true, items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load live calls' });
  }
});

// Storage for recordings
const recordingsPath = path.isAbsolute(env.RECORDINGS_DIR)
  ? env.RECORDINGS_DIR
  : path.resolve(process.cwd(), env.RECORDINGS_DIR);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsPath),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    // Security: allow-list extensions
    const allowed = ['.webm', '.wav', '.mp3', '.m4a', '.ogg'];
    let ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) ext = '.webm'; // Fallback safe extension
    cb(null, `rec_${ts}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    // Security: Validate mime types
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'video/webm']; // webm can be video
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Save call detail and recording (Authenticated: agent/manager/superadmin). CSRF required when using cookie auth.
// Lightweight in-memory rate limiter for this route
function makeLimiter({ windowMs, limit }: { windowMs: number; limit: number }) {
  const buckets = new Map<string, { c: number; t: number }>();
  // ... rest of the code remains the same ...
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
  country: z.string().optional().nullable(),
  charges: z.coerce.number().optional().nullable(),
  direction: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  disposition: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  recording_url: z.string().url().optional().nullable(),
  remote_recording_url: z.string().url().optional().nullable(),
  call_type: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  prospect_name: z.string().optional().nullable(),
  prospect_email: z.string().email().optional().nullable(),
  prospect_company: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  job_level: z.string().optional().nullable(),
  data_source_type: z.string().optional().nullable(),
  // optional signaling details to infer disposition
  hangup_cause: z.string().optional().nullable(),
  sip_status: z.coerce.number().int().optional().nullable(),
  sip_reason: z.string().optional().nullable(),
});

const callsHandler = async (req: any, res: any, next: any) => {
  try {
    const parsed = CallsSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() });
    }
    const b = parsed.data as any;
    const files = (req as any).files as any;
    const file: Express.Multer.File | undefined = Array.isArray((files?.recording as any)) ? (files.recording as Express.Multer.File[])[0] : (req as any).file;
    const remoteFile: Express.Multer.File | undefined = Array.isArray((files?.remote_recording as any)) ? (files.remote_recording as Express.Multer.File[])[0] : undefined;

    const recording_url = file
      ? `${env.PUBLIC_BASE_URL}/uploads/${file.filename}`
      : b.recording_url || null;
    const remote_recording_url = remoteFile
      ? `${env.PUBLIC_BASE_URL}/uploads/${remoteFile.filename}`
      : null;

    try { console.log('[calls] incoming body', b); } catch { }
    try { console.log('[calls] file', !!file, 'recording_url', recording_url); } catch { }

    // Validate/Fetch User Context
    let usernameVal = b.username || null;
    let extensionVal = b.extension || null;

    if (req.user?.userId) {
      try {
        const u = await db.users.findUnique({ where: { id: req.user.userId }, select: { username: true, extension: true, role: true } });

        // Security: Agents cannot spoof extension or username
        if (req.user.role === 'agent' || u?.role === 'agent') {
          usernameVal = u?.username || null;
          extensionVal = u?.extension || null;

          // Verify extension matches if provided (or just overwrite as above)
          if (b.extension && b.extension !== extensionVal) {
            console.warn('[calls] agent attempted to spoof extension', { agent: usernameVal, attempted: b.extension });
          }
        } else {
          // Fallback for non-agents
          if (!usernameVal) usernameVal = u?.username || null;
          if (!extensionVal) extensionVal = u?.extension || null;
        }
      } catch { }
    }

    // Security: Validate campaign name to prevent injection
    if (b.campaign_name) {
      const safeCampaign = b.campaign_name.replace(/[^a-zA-Z0-9\s-]/g, '');
      if (safeCampaign !== b.campaign_name) {
        // Reject or sanitize. Let's sanitize.
        b.campaign_name = safeCampaign;
      }
    }

    // Normalize and compute times/duration
    const startRaw: Date = b.start_time || new Date()
    const endRaw: Date = b.end_time || new Date()
    let startNorm = startRaw
    let endNorm = endRaw
    if (endNorm < startNorm) {
      // swap if client provided inverted values
      const t = startNorm; startNorm = endNorm; endNorm = t
    }

    // Security: Reject future dates (allow 5 min clock skew)
    if (startNorm.getTime() > Date.now() + 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Call time cannot be in the future' });
    }

    // Ensure answer_time: prefer provided, else derive from end - call_duration
    const computedAnswer: Date | null = (b.answer_time
      ? b.answer_time
      : ((b.call_duration ?? null) !== null)
        ? new Date(endNorm.getTime() - (Number(b.call_duration) || 0) * 1000)
        : null)

    // Ensure call_duration: prefer provided, else compute from answer/end; fallback to start/end
    let computedDuration: number | null = (b.call_duration ?? null) !== null
      ? Number(b.call_duration)
      : (computedAnswer ? Math.max(0, Math.floor((endNorm.getTime() - computedAnswer.getTime()) / 1000)) : null)
    if (computedDuration === null) {
      computedDuration = Math.max(0, Math.floor((endNorm.getTime() - startNorm.getTime()) / 1000))
    }

    // Infer/normalize disposition from signals and optionally override bad client values
    const inferDisposition = (): string => {
      const status = Number(b.sip_status ?? 0);
      const cause = String(b.hangup_cause ?? '').toLowerCase();
      const reason = String(b.sip_reason ?? '').toLowerCase();
      const answered = !!computedAnswer && (computedDuration ?? 0) > 0;
      // Busy / Rejected signals: 486 Busy Here, 603 Decline, explicit busy/decline/reject labels
      if (
        status === 486 || status === 603 ||
        cause.includes('busy') || reason.includes('busy') ||
        cause.includes('decline') || reason.includes('decline') ||
        cause.includes('reject') || reason.includes('reject')
      ) return 'BUSY';
      // No-Answer signals: not answered; also 408 Request Timeout, 480 Temporarily Unavailable, 487 Request Terminated
      if (!answered || status === 408 || status === 480 || status === 487) return 'NO ANSWER';
      return 'ANSWERED';
    };

    const normalizeDisposition = (): string => {
      const raw = String(b.disposition ?? '').trim().toUpperCase();
      // If client sent a trustworthy final state, keep it; otherwise infer
      if (raw === 'BUSY' || raw === 'NO ANSWER' || raw === 'ANSWERED' || raw === 'VOICEMAIL') return raw;
      // Convert CALL FAILED to NO ANSWER for prospects not picking up
      if (raw === 'CALL FAILED' || raw === 'CALL_FAILED') return 'NO ANSWER';
      // Treat FAILED/FAIL/ERROR/REJECTED/DECLINED as hints -> infer from signals
      if (raw === 'FAILED' || raw === 'FAIL' || raw === 'ERROR' || raw === 'REJECTED' || raw === 'DECLINED') return inferDisposition();
      // Unknown/empty -> infer
      if (!raw) return inferDisposition();
      // Default: keep raw
      return raw;
    };

    const dispositionFinal = normalizeDisposition();

    const data = {
      campaign_name: b.campaign_name || null,
      useremail: b.useremail || null,
      username: usernameVal,
      unique_id: b.unique_id || null,
      start_time: startNorm,
      answer_time: computedAnswer,
      end_time: endNorm,
      call_duration: computedDuration,
      billed_duration: b.billed_duration ?? null,
      source: b.source || null,
      extension: extensionVal,
      region: b.region || null,
      country: b.country || null,
      charges: b.charges ?? null,
      direction: b.direction || null,
      destination: b.destination || null,
      disposition: dispositionFinal || null,
      platform: b.platform || 'web',
      recording_url,
      remote_recording_url,
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

    try { console.log('[calls] saved id', saved?.id); } catch { }
    try {
      if ((file || remoteFile) && saved?.id != null) {
        void transcribeCallRecordingForCall(saved.id);
      }
    } catch { }

    const safeSaved = {
      ...saved,
      id: typeof saved.id === 'bigint' ? Number(saved.id) : saved.id,
    };
    res.status(201).json(safeSaved);
  } catch (err) {
    try { console.error('[calls] error', err); } catch { }
    next(err);
  }
};

const uploadCalls = upload.fields([
  { name: 'recording', maxCount: 1 },
  { name: 'remote_recording', maxCount: 1 },
]);

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
  router.post(
    '/calls',
    callsLimiter,
    requireAuth,
    requireRoles(['agent', 'manager', 'superadmin']),
    uploadCalls,
    callsHandler
  );
}

router.get('/monitoring/live', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res) => {
  res.json({ success: true, calls: [] });
});

router.get('/analytics/agent/dispositions', requireAuth, requireRoles(['agent']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || null
    const usermail = me?.usermail || null
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()

    const whereAnd: any[] = []
    if (from) whereAnd.push({ start_time: { gte: from } })
    if (to) whereAnd.push({ start_time: { lte: to } })

    const whereOr: any[] = []
    if (username) whereOr.push({ username })
    if (usermail) whereOr.push({ useremail: usermail })
    if (whereOr.length === 0) return res.json({}) // No valid user identifier

    const groupByResult = await db.calls.groupBy({
      by: ['disposition'],
      _count: { _all: true },
      where: {
        AND: whereAnd,
        OR: whereOr
      }
    })

    const items = groupByResult.map(r => ({
      name: (r.disposition || '').toUpperCase() || 'UNKNOWN',
      count: r._count._all
    }))
    return res.json({ items })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/agent/dispositions/stream', requireAuth, requireRoles(['agent']), async (req: any, res: any, next: any) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const userId = req.user?.userId
    if (!userId) return res.status(401).end()
    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || null
    const usermail = me?.usermail || null
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()

    const build = () => {
      const whereAnd: any[] = []
      if (from) whereAnd.push({ start_time: { gte: from } })
      if (to) whereAnd.push({ start_time: { lte: to } })

      const whereOr: any[] = []
      if (username) whereOr.push({ username })
      if (usermail) whereOr.push({ useremail: usermail })

      return { whereAnd, whereOr }
    }

    let last = ''
    const tick = async () => {
      try {
        const b = build()
        if (b.whereOr.length === 0) { res.write(`data: {"items":[]}\n\n`); return }

        const groupByResult = await db.calls.groupBy({
          by: ['disposition'],
          _count: { _all: true },
          where: {
            AND: b.whereAnd,
            OR: b.whereOr
          }
        })
        const items = groupByResult.map(r => ({ name: (r.disposition || '').toUpperCase() || 'UNKNOWN', count: r._count._all }))
        const payload = JSON.stringify({ items })
        if (payload !== last) { last = payload; res.write(`data: ${payload}\n\n`) }
      } catch { }
    }

    await tick()
    const timer = setInterval(tick, 3000)
    req.on('close', () => { try { clearInterval(timer) } catch { } })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/agent', requireAuth, requireRoles(['agent']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })
    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || null
    const usermail = me?.usermail || null
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()
    const idParts: string[] = []
    const params: any[] = []
    if (username) { idParts.push('username = ?'); params.push(username) }
    if (usermail) { idParts.push('useremail = ?'); params.push(usermail) }
    if (idParts.length === 0) return res.json({ callsDialed: 0, answered: 0, voicemail: 0, unanswered: 0, conversations: 0, connectRate: 0, conversationRate: 0 })
    const timeParts: string[] = []
    if (from) { timeParts.push('start_time >= ?'); params.push(from) }
    if (to) { timeParts.push('start_time <= ?'); params.push(to) }
    const where = ['(', idParts.join(' OR '), ')', timeParts.length ? 'AND ' + timeParts.join(' AND ') : ''].join(' ').trim()
    const sqlTotal = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where}`
    const sqlAnswered = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where} AND UPPER(COALESCE(disposition,'')) = 'ANSWERED'`
    const sqlVoicemail = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where} AND UPPER(COALESCE(disposition,'')) = 'VOICEMAIL'`
    const [[t]]: any = await pool.query(sqlTotal, params)
    const [[a]]: any = await pool.query(sqlAnswered, params)
    const [[v]]: any = await pool.query(sqlVoicemail, params)
    const callsDialed = Number(t?.cnt || 0)
    const answered = Number(a?.cnt || 0)
    const voicemail = Number(v?.cnt || 0)
    const unanswered = Math.max(0, callsDialed - answered - voicemail)
    const conversations = answered
    const connectRate = callsDialed ? Math.round((answered / callsDialed) * 100) : 0
    const conversationRate = callsDialed ? Math.round((conversations / callsDialed) * 100) : 0
    res.json({ callsDialed, answered, voicemail, unanswered, conversations, connectRate, conversationRate })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/agent/stream', requireAuth, requireRoles(['agent']), async (req: any, res: any, next: any) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const userId = req.user?.userId
    if (!userId) return res.status(401).end()
    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || null
    const usermail = me?.usermail || null
    const extension = me?.extension || null
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()

    const build = () => {
      const idParts: string[] = []
      const params: any[] = []
      if (username) { idParts.push('username = ?'); params.push(username) }
      if (usermail) { idParts.push('useremail = ?'); params.push(usermail) }
      if (idParts.length === 0) return { sqls: null as any, params }
      const timeParts: string[] = []
      if (from) { timeParts.push('start_time >= ?'); params.push(from) }
      if (to) { timeParts.push('start_time <= ?'); params.push(to) }
      const where = ['(', idParts.join(' OR '), ')', timeParts.length ? 'AND ' + timeParts.join(' AND ') : ''].join(' ').trim()
      const sqlTotal = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where}`
      const sqlAnswered = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where} AND UPPER(COALESCE(disposition,'')) = 'ANSWERED'`
      const sqlVoicemail = `SELECT COUNT(*) AS cnt FROM calls WHERE ${where} AND UPPER(COALESCE(disposition,'')) = 'VOICEMAIL'`
      return { sqls: { sqlTotal, sqlAnswered, sqlVoicemail }, params }
    }

    let last = ''
    const tick = async () => {
      try {
        const b = build()
        if (!b.sqls) { res.write(`data: {"callsDialed":0,"answered":0,"voicemail":0,"unanswered":0,"conversations":0,"connectRate":0,"conversationRate":0}\n\n`); return }
        const [[t]]: any = await pool.query(b.sqls.sqlTotal, b.params)
        const [[a]]: any = await pool.query(b.sqls.sqlAnswered, b.params)
        const [[v]]: any = await pool.query(b.sqls.sqlVoicemail, b.params)
        const callsDialed = Number(t?.cnt || 0)
        const answered = Number(a?.cnt || 0)
        const voicemail = Number(v?.cnt || 0)
        const unanswered = Math.max(0, callsDialed - answered - voicemail)
        const conversations = answered
        const connectRate = callsDialed ? Math.round((answered / callsDialed) * 100) : 0
        const conversationRate = callsDialed ? Math.round((conversations / callsDialed) * 100) : 0
        const payload = JSON.stringify({ callsDialed, answered, voicemail, unanswered, conversations, connectRate, conversationRate })
        if (payload !== last) { last = payload; res.write(`data: ${payload}\n\n`) }
      } catch { }
    }

    await tick()
    const timer = setInterval(tick, 3000)
    req.on('close', () => { try { clearInterval(timer) } catch { } })
  } catch (e) {
    next(e)
  }
})

// Daily call disposition analytics for agents
router.get('/analytics/agent/dispositions/daily', requireAuth, requireRoles(['agent']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || null
    const usermail = me?.usermail || null
    const pool = getPool()

    // Get today's date range (start of day to end of day)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const idParts: string[] = []
    const params: any[] = []
    if (username) { idParts.push('username = ?'); params.push(username) }
    if (usermail) { idParts.push('useremail = ?'); params.push(usermail) }
    if (idParts.length === 0) return res.json({ daily: [] })

    params.push(startOfDay, endOfDay)
    const where = ['(', idParts.join(' OR '), ')', 'AND start_time >= ? AND start_time < ?'].join(' ').trim()
    // Daily trend: Group by hour
    const sql = `
      SELECT 
        DATE_FORMAT(start_time, '%H') as hour_key,
        SUM(CASE WHEN UPPER(COALESCE(disposition,'')) = 'ANSWERED' THEN 1 ELSE 0 END) as answered,
        SUM(CASE WHEN UPPER(COALESCE(disposition,'')) != 'ANSWERED' THEN 1 ELSE 0 END) as failed
      FROM calls 
      WHERE ${where}
      GROUP BY hour_key
      ORDER BY hour_key ASC
    `
    const [rows]: any = await pool.query(sql, params)

    // Fill 24h buckets
    const items = []
    const map = new Map<string, any>()
    if (rows) rows.forEach((r: any) => map.set(r.hour_key, r))

    for (let i = 0; i < 24; i += 2) {
      const h = i.toString().padStart(2, '0')
      // Check i and i+1
      const r1 = map.get(h)
      const r2 = map.get((i + 1).toString().padStart(2, '0'))

      const val = {
        name: i === 0 ? '12am' : i === 12 ? '12pm' : i > 12 ? `${i - 12}pm` : `${i}am`,
        answered: Number(r1?.answered || 0) + Number(r2?.answered || 0),
        failed: Number(r1?.failed || 0) + Number(r2?.failed || 0)
      }
      items.push(val)
    }

    return res.json({ daily: items })
  } catch (e) {
    next(e)
  }
})

// Monthly call disposition analytics for agents
router.get('/analytics/agent/dispositions/monthly', requireAuth, requireRoles(['agent']), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || null
    const usermail = me?.usermail || null
    const pool = getPool()

    // Get current month's date range (start of month to end of month)
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    const idParts: string[] = []
    const params: any[] = []
    if (username) { idParts.push('username = ?'); params.push(username) }
    if (usermail) { idParts.push('useremail = ?'); params.push(usermail) }
    if (idParts.length === 0) return res.json({ monthly: [] })

    params.push(startOfMonth, endOfMonth)
    const where = ['(', idParts.join(' OR '), ')', 'AND start_time >= ? AND start_time < ?'].join(' ').trim()
    // Monthly trend: Group by day
    const sql = `
      SELECT 
        DATE_FORMAT(start_time, '%d') as day_key,
        SUM(CASE WHEN UPPER(COALESCE(disposition,'')) = 'ANSWERED' THEN 1 ELSE 0 END) as answered,
        SUM(CASE WHEN UPPER(COALESCE(disposition,'')) != 'ANSWERED' THEN 1 ELSE 0 END) as failed
      FROM calls 
      WHERE ${where}
      GROUP BY day_key
      ORDER BY day_key ASC
    `
    const [rows]: any = await pool.query(sql, params)

    // Fill days of month
    const items = []
    const map = new Map<string, any>()
    if (rows) rows.forEach((r: any) => map.set(r.day_key, r))

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    // Aggregate roughly every 2 days if month is long, or just query daily. 
    // Chart looks better with ~15 points. Let's do daily but client can smooth it if needed.
    // The previous code had ~15 points. returns day number.
    for (let i = 1; i <= daysInMonth; i++) {
      const d = i.toString().padStart(2, '0')
      const r = map.get(d)
      items.push({
        name: String(i),
        answered: Number(r?.answered || 0),
        failed: Number(r?.failed || 0)
      })
    }

    return res.json({ monthly: items })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/leaderboard/daily', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const pool = getPool()
    const params: any[] = []

    // Get today's date range (start of day to end of day)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    params.push(startOfDay, endOfDay)

    let sql = `SELECT COALESCE(username, useremail, extension, 'UNKNOWN') AS name, COUNT(*) AS cnt
                 FROM calls 
                 WHERE LOWER(remarks) = 'lead' AND start_time >= ? AND start_time < ?`

    // Add organization filtering for non-superadmin users
    if (req.user?.role !== 'superadmin' && req.user?.organizationId) {
      sql += ' AND organization_id = ?';
      params.push(req.user.organizationId);
    }

    sql += ` GROUP BY COALESCE(username, useremail, extension, 'UNKNOWN')
             ORDER BY cnt DESC
             LIMIT 10`;

    const [rows]: any = await pool.query(sql, params)
    const daily = (rows || []).map((r: any) => ({ name: String(r.name || 'UNKNOWN'), count: Number(r.cnt || 0) }))
    return res.json({ daily })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/leaderboard/monthly', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const pool = getPool()
    const params: any[] = []

    // Get current month's date range (start of month to end of month)
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    params.push(startOfMonth, endOfMonth)

    let sql = `SELECT COALESCE(username, useremail, extension, 'UNKNOWN') AS name, COUNT(*) AS cnt
                 FROM calls 
                 WHERE LOWER(remarks) = 'lead' AND start_time >= ? AND start_time < ?`

    // Add organization filtering for non-superadmin users
    if (req.user?.role !== 'superadmin' && req.user?.organizationId) {
      sql += ' AND organization_id = ?';
      params.push(req.user.organizationId);
    }

    sql += ` GROUP BY COALESCE(username, useremail, extension, 'UNKNOWN')
             ORDER BY cnt DESC
             LIMIT 10`;

    const [rows]: any = await pool.query(sql, params)
    const monthly = (rows || []).map((r: any) => ({ name: String(r.name || 'UNKNOWN'), count: Number(r.cnt || 0) }))
    return res.json({ monthly })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/leaderboard', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()
    const params: any[] = []
    const timeParts: string[] = []
    if (from) { timeParts.push('start_time >= ?'); params.push(from) }
    if (to) { timeParts.push('start_time <= ?'); params.push(to) }
    const timeWhere = timeParts.length ? `AND ${timeParts.join(' AND ')}` : ''

    let sql = `SELECT COALESCE(username, useremail, extension, 'UNKNOWN') AS name, COUNT(*) AS cnt
                 FROM calls 
                 WHERE LOWER(remarks) = 'lead' ${timeWhere}`

    // Add organization filtering for non-superadmin users
    if (req.user?.role !== 'superadmin' && req.user?.organizationId) {
      sql += ' AND organization_id = ?';
      params.push(req.user.organizationId);
    }

    sql += ` GROUP BY COALESCE(username, useremail, extension, 'UNKNOWN')
             ORDER BY cnt DESC
             LIMIT 10`;

    const [rows]: any = await pool.query(sql, params)
    const items = (rows || []).map((r: any) => ({ name: String(r.name || 'UNKNOWN'), count: Number(r.cnt || 0) }))
    return res.json({ items })
  } catch (e) {
    next(e)
  }
})

router.get('/analytics/leaderboard/stream', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()

    const build = () => {
      const params: any[] = []
      const timeParts: string[] = []
      if (from) { timeParts.push('start_time >= ?'); params.push(from) }
      if (to) { timeParts.push('start_time <= ?'); params.push(to) }
      const timeWhere = timeParts.length ? `AND ${timeParts.join(' AND ')}` : ''

      let sql = `SELECT COALESCE(username, useremail, extension, 'UNKNOWN') AS name, COUNT(*) AS cnt
                   FROM calls 
                   WHERE LOWER(remarks) = 'lead' ${timeWhere}`

      // Add organization filtering for non-superadmin users
      if (req.user?.role !== 'superadmin' && req.user?.organizationId) {
        sql += ' AND organization_id = ?';
        params.push(req.user.organizationId);
      }

      sql += ` GROUP BY COALESCE(username, useremail, extension, 'UNKNOWN')
               ORDER BY cnt DESC
               LIMIT 10`;

      return { sql, params }
    }

    let last = ''
    const tick = async () => {
      try {
        const b = build()
        const [rows]: any = await pool.query(b.sql, b.params)
        const items = (rows || []).map((r: any) => ({ name: String(r.name || 'UNKNOWN'), count: Number(r.cnt || 0) }))
        const payload = JSON.stringify({ items })
        if (payload !== last) { last = payload; res.write(`data: ${payload}\n\n`) }
      } catch { }
    }

    await tick()
    const timer = setInterval(tick, 3000)
    req.on('close', () => { try { clearInterval(timer) } catch { } })
  } catch (e) {
    next(e)
  }
})

router.get('/calls', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20))
    const skip = (page - 1) * pageSize

    const where: any = { AND: [] as any[] }

    // Organization filtering - non-superadmin users can only see calls from their organization
    if (req.user?.role !== 'superadmin' && req.user?.organizationId) {
      where.AND.push({ organization_id: req.user.organizationId });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    if (from || to) where.AND.push({ start_time: { gte: from || undefined, lte: to || undefined } })
    const qDest = (req.query.destination || req.query.phone || '').toString().trim()
    if (qDest) where.AND.push({ destination: { contains: qDest } })
    const qUser = (req.query.username || '').toString().trim()
    if (qUser) where.AND.push({ username: qUser })
    const qUsermail = (req.query.useremail || req.query.usermail || '').toString().trim()
    if (qUsermail) where.AND.push({ useremail: qUsermail })
    const qExt = (req.query.extension || '').toString().trim()
    if (qExt) where.AND.push({ extension: qExt })
    const qRemarks = (req.query.remarks || '').toString().trim()
    if (qRemarks) where.AND.push({ remarks: qRemarks })
    const qStatus = (req.query.status || '').toString().trim()
    if (qStatus) where.AND.push({ disposition: { equals: qStatus } })
    const qDir = (req.query.direction || '').toString().trim()
    if (qDir) where.AND.push({ direction: qDir })

    // Enforce data access control for agents
    if (req.user?.role === 'agent') {
      const me = await db.users.findUnique({ where: { id: req.user.userId }, select: { username: true, usermail: true, extension: true } })
      const myUsermail = me?.usermail || undefined
      const myExt = me?.extension || undefined
      const agentFilter: any = { OR: [] }
      if (me?.username) agentFilter.OR.push({ username: me.username })
      if (myUsermail) agentFilter.OR.push({ useremail: myUsermail })
      if (myExt) agentFilter.OR.push({ AND: [{ extension: myExt }, { username: null }, { useremail: null }] })

      if (agentFilter.OR.length === 0) {
        agentFilter.OR.push({ id: -1 }) // No access
      }
      where.AND.push(agentFilter)
    }

    const [total, items] = await Promise.all([
      (db as any).calls.count({ where }),
      (db as any).calls.findMany({ where, orderBy: { start_time: 'desc' }, skip, take: pageSize }),
    ])

    const safeItems = items.map((r: any) => ({
      ...r,
      id: typeof r.id === 'bigint' ? Number(r.id) : r.id,
    }))
    res.json({ success: true, page, pageSize, total: Number(total), items: safeItems })
  } catch (e) {
    next(e)
  }
})

// Return calls that belong to the logged-in user (by username, useremail, or extension)
router.get('/calls/mine', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const me = await db.users.findUnique({
      where: { id: userId },
      select: {
        username: true,
        usermail: true,
        extension: true,
        organization_id: true
      }
    })
    const username = me?.username || undefined
    const usermail = me?.usermail || undefined
    const extension = me?.extension || undefined
    const organizationId = me?.organization_id || undefined

    // Build base where
    const where: any = { OR: [] as any[], AND: [] as any[] }
    if (username) where.OR.push({ username })
    if (usermail) where.OR.push({ useremail: usermail })
    // Match by extension only for unattributed rows (username/usermail are null)
    if (extension) where.OR.push({ AND: [{ extension }, { username: null }, { useremail: null }] })
    if (where.OR.length === 0) {
      // No identifiers -> no results (enforce privacy)
      where.OR.push({ id: -1 })
    }

    // Add organization filtering
    if (organizationId) {
      where.AND.push({ organization_id: organizationId });
    }

    // Optional filters
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20))
    const skip = (page - 1) * pageSize

    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    if (from || to) where.AND.push({ start_time: { gte: from || undefined, lte: to || undefined } })
    const qDest = (req.query.destination || req.query.phone || '').toString().trim()
    if (qDest) where.AND.push({ destination: { contains: qDest } })
    const qExt = (req.query.extension || '').toString().trim()
    if (qExt) where.AND.push({ extension: qExt })
    const qStatus = (req.query.status || '').toString().trim()
    if (qStatus) where.AND.push({ disposition: { equals: qStatus } })
    const qDir = (req.query.direction || '').toString().trim()
    if (qDir) where.AND.push({ direction: qDir })

    const [total, items] = await Promise.all([
      (db as any).calls.count({ where }),
      (db as any).calls.findMany({ where, orderBy: { start_time: 'desc' }, skip, take: pageSize }),
    ])

    const safeItems = items.map((r: any) => ({
      ...r,
      id: typeof r.id === 'bigint' ? Number(r.id) : r.id,
    }))
    res.json({ success: true, page, pageSize, total: Number(total), items: safeItems })
  } catch (e) {
    next(e)
  }
})

export default router;