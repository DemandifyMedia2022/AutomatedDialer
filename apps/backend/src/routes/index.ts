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
import { getLiveCalls, updateLiveCallPhase } from './livecalls';

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

router.get('/sip/config', (_req, res) => {
  res.json({
    wssUrl: env.SIP_WSS_URL,
    domain: env.SIP_DOMAIN,
    stunServer: env.STUN_SERVER,
  });
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
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `rec_${ts}${ext}`);
  },
});
const upload = multer({ storage });

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

    // Fallback: if username not provided, use authenticated user's name
    let usernameVal = b.username || null;
    if (!usernameVal && req.user?.userId) {
      try {
        const u = await db.users.findUnique({ where: { id: req.user.userId }, select: { username: true } });
        usernameVal = u?.username || null;
      } catch { }
    }

    // Fallback: if extension not provided, use authenticated user's assigned extension
    let extensionVal = b.extension || null;
    if (!extensionVal && req.user?.userId) {
      try {
        const u = await db.users.findUnique({ where: { id: req.user.userId }, select: { extension: true } });
        extensionVal = u?.extension || null;
      } catch { }
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

    const idParts: string[] = []
    const params: any[] = []
    if (username) { idParts.push('username = ?'); params.push(username) }
    if (usermail) { idParts.push('useremail = ?'); params.push(usermail) }
    if (idParts.length === 0) return res.json({})
    const timeParts: string[] = []
    if (from) { timeParts.push('start_time >= ?'); params.push(from) }
    if (to) { timeParts.push('start_time <= ?'); params.push(to) }
    const where = ['(', idParts.join(' OR '), ')', timeParts.length ? 'AND ' + timeParts.join(' AND ') : ''].join(' ').trim()
    const sql = `SELECT UPPER(COALESCE(disposition,'')) AS disp, COUNT(*) AS cnt FROM calls WHERE ${where} GROUP BY disp`
    const [rows]: any = await pool.query(sql, params)
    const items = (rows || []).map((r: any) => ({
      name: String(r.disp || '') || 'UNKNOWN',
      count: Number(r.cnt || 0),
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
      const idParts: string[] = []
      const params: any[] = []
      if (username) { idParts.push('username = ?'); params.push(username) }
      if (usermail) { idParts.push('useremail = ?'); params.push(usermail) }
      if (idParts.length === 0) return { sql: null as any, params }
      const timeParts: string[] = []
      if (from) { timeParts.push('start_time >= ?'); params.push(from) }
      if (to) { timeParts.push('start_time <= ?'); params.push(to) }
      const where = ['(', idParts.join(' OR '), ')', timeParts.length ? 'AND ' + timeParts.join(' AND ') : ''].join(' ').trim()
      const sql = `SELECT UPPER(COALESCE(disposition,'')) AS disp, COUNT(*) AS cnt FROM calls WHERE ${where} GROUP BY disp`
      return { sql, params }
    }

    let last = ''
    const tick = async () => {
      try {
        const b = build()
        if (!b.sql) { res.write(`data: {"items":[]}\n\n`); return }
        const [rows]: any = await pool.query(b.sql, b.params)
        const items = (rows || []).map((r: any) => ({ name: String(r.disp || '') || 'UNKNOWN', count: Number(r.cnt || 0) }))
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

router.get('/analytics/leaderboard', requireAuth, requireRoles(['agent', 'manager', 'qa', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const pool = getPool()
    const params: any[] = []
    const timeParts: string[] = []
    if (from) { timeParts.push('start_time >= ?'); params.push(from) }
    if (to) { timeParts.push('start_time <= ?'); params.push(to) }
    const where = timeParts.length ? `WHERE ${timeParts.join(' AND ')}` : ''
    const sql = `SELECT COALESCE(username, useremail, extension, 'UNKNOWN') AS name, COUNT(*) AS cnt
                 FROM calls ${where}
                 GROUP BY COALESCE(username, useremail, extension, 'UNKNOWN')
                 ORDER BY cnt DESC
                 LIMIT 10`
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
      const where = timeParts.length ? `WHERE ${timeParts.join(' AND ')}` : ''
      const sql = `SELECT COALESCE(username, useremail, extension, 'UNKNOWN') AS name, COUNT(*) AS cnt
                   FROM calls ${where}
                   GROUP BY COALESCE(username, useremail, extension, 'UNKNOWN')
                   ORDER BY cnt DESC
                   LIMIT 10`
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

    const me = await db.users.findUnique({ where: { id: userId }, select: { username: true, usermail: true, extension: true } })
    const username = me?.username || undefined
    const usermail = me?.usermail || undefined
    const extension = me?.extension || undefined

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