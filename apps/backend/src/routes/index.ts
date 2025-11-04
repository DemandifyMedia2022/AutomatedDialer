import { Router } from 'express';
import { health } from '../controllers/healthController';
import auth from './auth';
import { env } from '../config/env';
import multer from 'multer';
import path from 'path';
import { db } from '../db/prisma';

const router = Router();

router.get('/health', health);
router.use('/auth', auth);

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

// Save call detail and recording
router.post('/calls', upload.single('recording'), async (req, res, next) => {
  try {
    const b = req.body as any;
    const file = req.file;

    const recording_url = file
      ? `${env.PUBLIC_BASE_URL}/uploads/${file.filename}`
      : b.recording_url || null;

    const parseDate = (v: any) => (v ? new Date(v) : null);
    const toInt = (v: any) => (v === undefined || v === null || v === '' ? null : parseInt(String(v), 10));
    const toDecimal = (v: any) => (v === undefined || v === null || v === '' ? null : Number(v));

    const data = {
      campaign_name: b.campaign_name || null,
      useremail: b.useremail || null,
      username: b.username || null,
      unique_id: b.unique_id || null,
      start_time: parseDate(b.start_time) || new Date(),
      answer_time: parseDate(b.answer_time),
      end_time: parseDate(b.end_time),
      call_duration: toInt(b.call_duration),
      billed_duration: toInt(b.billed_duration),
      source: b.source || null,
      extension: b.extension || null,
      region: b.region || null,
      charges: toDecimal(b.charges),
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
});

export default router;
