import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { db } from '../db/prisma'
import { env } from '../config/env'
import { getIo } from '../utils/ws'
import { requireAuth, requireRoles } from '../middlewares/auth'

const router = Router()

// Base dir to store agentic CSV files
const baseDir = path.isAbsolute(env.RECORDINGS_DIR)
  ? path.resolve(process.cwd(), 'apps/backend/src/agentic-dialing')
  : path.resolve(process.cwd(), 'apps/backend/src/agentic-dialing')

const csvDir = baseDir
if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, csvDir),
  filename: (_req, file, cb) => {
    let safe = file.originalname.replace(/[^A-Za-z0-9._-]/g, '_');
    if (!safe.toLowerCase().endsWith('.csv')) {
      safe += '.csv';
    }
    // Limit filename length and prevent reserved names
    if (safe.length > 255) {
      const ext = '.csv';
      const nameWithoutExt = safe.slice(0, -ext.length);
      safe = nameWithoutExt.slice(0, 255 - ext.length) + ext;
    }
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(safe.toUpperCase().replace('.CSV', ''))) {
      safe = 'file_' + safe;
    }
    cb(null, safe);
  }
});

// File validation middleware
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.originalname.toLowerCase().endsWith('.csv')) {
    return cb(new Error('Only CSV files are allowed'));
  }
  const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only CSV files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1,
    fields: 10,
    fieldNameSize: 100
  }
});
const parseFields = multer()

// Helper to safely convert BigInt fields to numbers
function toSafe(obj: any) {
  if (!obj || typeof obj !== 'object') return obj
  const out: any = Array.isArray(obj) ? [] : {}
  for (const k of Object.keys(obj)) {
    const v: any = (obj as any)[k]
    if (typeof v === 'bigint') out[k] = Number(v)
    else if (v && typeof v === 'object') out[k] = toSafe(v)
    else out[k] = v
  }
  return out
}

// Minimal status endpoint for Agentic manager UI
router.get('/status', async (_req, res) => {
  res.json(state)
})

// In-memory minimal state for Agentic controls (sufficient for UI wiring)
type AgenticState = {
  status: string
  running: boolean
  lead_index: number | null
  campaign: string | null
  campaign_label: string | null
  auto_next: boolean
  lead: any | null
}

const state: AgenticState = {
  status: 'idle',
  running: false,
  lead_index: null,
  campaign: null,
  campaign_label: null,
  auto_next: false,
  lead: null,
}

// Helper: load active CSV file name
async function getActiveCsvName(orgId?: number): Promise<string | null> {
  try {
    const where: any = { active: true }
    if (orgId) where.organization_id = orgId
    const active = await (db as any).agentic_csv_files.findFirst({ where })
    return active?.name || null
  } catch { return null }
}

// Helper: parse CSV to leads
function normalizePhone(raw: string): string {
  const s = String(raw || '').trim()
  // Handle scientific notation like 9.17021E+11
  if (/^\d+\.?\d*e[+\-]?\d+$/i.test(s)) {
    try { return BigInt(Math.round(Number(s))).toString() } catch { }
  }
  const only = s.replace(/[^0-9+]/g, '').replace(/^00/, '+')
  // If no leading +, apply default country code when provided (fallback '+91')
  if (!only.startsWith('+')) {
    const cc = String((env as any).DEFAULT_COUNTRY_CODE || '+91').trim()
    if (cc && cc.startsWith('+')) return cc + only.replace(/^[+]/, '')
  }
  return only
}

// CSV injection protection
function sanitizeCsvCell(value: string): string {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  // Prevent Excel formula injection by prefixing dangerous cells with single quote
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return "'" + trimmed;
  }
  return trimmed;
}

// Validate file path to prevent directory traversal
function validateFilePath(filePath: string, allowedDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);
  return resolvedPath.startsWith(resolvedAllowedDir);
}

function parseCsvToLeads(fp: string, limit?: number) {
  try {
    // Validate file path
    if (!validateFilePath(fp, csvDir)) {
      console.error('Invalid file path:', fp);
      return [];
    }

    if (!fs.existsSync(fp)) {
      console.error('File not found:', fp);
      return [];
    }

    const content = fs.readFileSync(fp, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
      skip_records_with_empty_values: true
    });

    const out: any[] = [];
    for (const record of records) {
      // Sanitize all cells to prevent CSV injection
      const sanitized: any = {};
      for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
        sanitized[key] = sanitizeCsvCell(String(value));
      }

      const phone = normalizePhone(String(sanitized.phone || sanitized.Phone || sanitized.mobile || sanitized.Mobile || sanitized.contact || sanitized.Contact || ''));
      if (!phone) continue;

      out.push({
        prospect_name: String(sanitized.name || sanitized.Name || sanitized.prospect_name || sanitized.Prospect_Name || '').trim(),
        company_name: String(sanitized.company || sanitized.Company || sanitized.company_name || sanitized.Company_Name || '').trim(),
        job_title: String(sanitized.title || sanitized.Title || sanitized.job_title || sanitized.Job_Title || '').trim(),
        phone,
      });

      if (limit && out.length >= limit) break;
    }
    return out;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

// Select campaign
router.post('/select_campaign', parseFields.none(), async (req, res, next) => {
  try {
    const campaign = (req.body?.campaign ?? null) ? String(req.body.campaign) : null
    state.campaign = campaign
    state.campaign_label = campaign
    res.json({ ok: true, campaign })
  } catch (e) { next(e) }
})

// Leads listing (paged)
router.get('/leads', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = 50
    const name = await getActiveCsvName(orgId)
    if (!name) return res.json({ leads: [], page, total_pages: 1, start_index: 0, total_leads: 0 })
    const fp = path.join(csvDir, name)
    if (!fs.existsSync(fp)) return res.json({ leads: [], page, total_pages: 1, start_index: 0, total_leads: 0 })
    const all = parseCsvToLeads(fp)
    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const startIdx = (page - 1) * pageSize
    const leads = all.slice(startIdx, startIdx + pageSize)
    console.log(`[CSV] Leads accessed by user ${(req as any).user?.userId}: page ${page}, ${total} total leads`);
    res.json({ leads, page, total_pages: totalPages, start_index: startIdx, total_leads: total })
  } catch (e) { next(e) }
})

// Start call (mock: just update state)
router.post('/start_call', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), parseFields.none(), async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    const idx = parseInt(String(req.body?.lead_global_index || '0'), 10) || 0
    state.running = true
    state.status = 'dialing'
    state.lead_index = idx
    // Load lead details from active CSV
    const name = await getActiveCsvName(orgId)
    if (name) {
      const fp = path.join(csvDir, name)
      if (fs.existsSync(fp)) {
        const all = parseCsvToLeads(fp)
        const lead = all[idx] || null
        state.lead = lead ? { index: idx, ...lead } : { index: idx }
        // Emit socket event so an agent client can actually dial
        try { getIo()?.emit('agentic:start_call', { lead: state.lead, campaign: state.campaign, index: idx }) } catch { }
      } else {
        state.lead = { index: idx }
      }
    } else {
      state.lead = { index: idx }
    }
    console.log(`[Agentic] Call started by user ${(req as any).user?.userId}: lead index ${idx}`);
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// GET alias for manual testing from browser: /api/agentic/start_call?lead_global_index=0
router.get('/start_call', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    const idx = parseInt(String((req.query as any)?.lead_global_index || '0'), 10) || 0
    state.running = true
    state.status = 'dialing'
    state.lead_index = idx
    const name = await getActiveCsvName(orgId)
    if (name) {
      const fp = path.join(csvDir, name)
      if (fs.existsSync(fp)) {
        const all = parseCsvToLeads(fp)
        const lead = all[idx] || null
        state.lead = lead ? { index: idx, ...lead } : { index: idx }
        try { getIo()?.emit('agentic:start_call', { lead: state.lead, campaign: state.campaign, index: idx }) } catch { }
      } else {
        state.lead = { index: idx }
      }
    } else {
      state.lead = { index: idx }
    }
    console.log(`[Agentic] Call started by user ${(req as any).user?.userId}: lead index ${idx}`);
    res.json({ ok: true })
  } catch (e) { next(e) }
})

router.post('/end_call', parseFields.none(), async (_req, res, next) => {
  try {
    state.running = false
    state.status = 'idle'
    state.lead = null
    res.json({ ok: true })
  } catch (e) { next(e) }
})

router.post('/auto_next', parseFields.none(), async (req, res, next) => {
  try {
    state.auto_next = String(req.body?.enabled || 'false') === 'true'
    res.json({ ok: true, auto_next: state.auto_next })
  } catch (e) { next(e) }
})

router.post('/stop_all', parseFields.none(), async (_req, res, next) => {
  try {
    state.running = false
    state.status = 'idle'
    state.lead = null
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// Campaigns
router.get('/campaigns', requireAuth, async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = {}
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const items = await (db as any).agentic_campaigns.findMany({ where, orderBy: { id: 'desc' } })
    res.json({ items: items.map(toSafe) })
  } catch (e) { next(e) }
})

router.get('/campaigns/:module', requireAuth, async (req: any, res, next) => {
  try {
    const module = String(req.params.module)
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const item = await (db as any).agentic_campaigns.findUnique({ where: { module } })
    if (!item) return res.status(404).json({ message: 'Not found' })
    if (!isSuper && item.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    res.json(toSafe(item))
  } catch (e) { next(e) }
})

router.post('/campaigns', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    if (!orgId) return res.status(400).json({ message: 'Manager must belong to an organization' })

    const { name, module, agent_text, session_text } = req.body || {}
    const created = await (db as any).agentic_campaigns.create({ data: { name, module, agent_text, session_text, organization_id: orgId } })
    res.status(201).json(toSafe(created))
  } catch (e) { next(e) }
})

router.put('/campaigns/:module', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const module = String(req.params.module)
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const existing = await (db as any).agentic_campaigns.findUnique({ where: { module } })
    if (!existing) return res.status(404).json({ message: 'Not found' })
    if (!isSuper && existing.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    const { name, agent_text, session_text } = req.body || {}
    const updated = await (db as any).agentic_campaigns.update({ where: { module }, data: { name, agent_text, session_text, updated_at: new Date() } })
    res.json(toSafe(updated))
  } catch (e) { next(e) }
})

router.delete('/campaigns/:module', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const module = String(req.params.module)
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const existing = await (db as any).agentic_campaigns.findUnique({ where: { module } })
    if (!existing) return res.status(404).json({ message: 'Not found' })
    if (!isSuper && existing.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    const deleted = await (db as any).agentic_campaigns.delete({ where: { module } })
    res.json(toSafe(deleted))
  } catch (e) { next(e) }
})

// CSV metadata and files
router.get('/csv/list', requireAuth, async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = {}
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const items = await (db as any).agentic_csv_files.findMany({ where, orderBy: { id: 'desc' } })
    res.json({ files: items.map(toSafe) })
  } catch (e) { next(e) }
})

router.get('/csv/preview', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req, res, next) => {
  try {
    const name = String(req.query.name || '')
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '10'), 10) || 10))
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '_')
    const fp = path.join(csvDir, safe)

    // Validate file path
    if (!validateFilePath(fp, csvDir)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const meta = await (db as any).agentic_csv_files.findUnique({ where: { name: safe } })
    if (!meta) return res.status(404).json({ message: 'Not found' })
    if (!isSuper && meta.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    if (!fs.existsSync(fp)) return res.status(404).json({ message: 'File missing on disk' })

    const leads = parseCsvToLeads(fp, limit)
    const headers = leads.length > 0 ? Object.keys(leads[0]) : []
    console.log(`[CSV] Preview requested by user ${(req as any).user?.userId} for: ${name} (${leads.length} rows)`);
    res.json({ headers, rows: leads, total: leads.length })
  } catch (e) { next(e) }
})

router.post('/csv/upload', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), upload.single('file'), async (req, res, next) => {
  try {
    const f = (req as any).file
    if (!f) return res.status(400).json({ message: 'file is required' })

    // Validate uploaded file
    if (!validateFilePath(f.path, csvDir)) {
      fs.unlinkSync(f.path);
      return res.status(400).json({ message: 'Invalid file path' });
    }

    // Additional file validation
    const stats = fs.statSync(f.path);
    if (stats.size === 0) {
      fs.unlinkSync(f.path);
      return res.status(400).json({ message: 'Empty file not allowed' });
    }

    // Validate CSV content
    try {
      const content = fs.readFileSync(f.path, 'utf-8');
      parse(content, { columns: false, skip_empty_lines: true });
    } catch (parseError) {
      fs.unlinkSync(f.path);
      return res.status(400).json({ message: 'Invalid CSV format' });
    }

    const orgId = req.user?.organizationId
    if (!orgId) {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path)
      return res.status(400).json({ message: 'User must belong to an organization' })
    }

    const upsert = await (db as any).agentic_csv_files.upsert({
      where: { name: f.filename },
      update: { size: stats.size, mtime: BigInt(Math.round(stats.mtimeMs)), organization_id: orgId, updated_at: new Date() },
      create: { name: f.filename, size: stats.size, mtime: BigInt(Math.round(stats.mtimeMs)), organization_id: orgId },
    })
    console.log(`[CSV] File uploaded by user ${(req as any).user?.userId}: ${f.filename}`);
    res.status(201).json(toSafe(upsert))
  } catch (e) {
    next(e)
  }
})

router.post('/csv/select', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), parseFields.none(), async (req, res, next) => {
  try {
    const input = String(req.body?.name || '')
    const safe = input.replace(/[^A-Za-z0-9._-]/g, '_')
    const target = await (db as any).agentic_csv_files.findFirst({ where: { OR: [{ name: input }, { name: safe }] } })
    if (!target) return res.status(404).json({ message: 'CSV not found' })

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    // Validate file path
    const filePath = path.join(csvDir, target.name);
    if (!validateFilePath(filePath, csvDir) || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'CSV file not found' });
    }

    if (!isSuper && target.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    await (db as any).$transaction([
      (db as any).agentic_csv_files.updateMany({
        where: !isSuper && orgId ? { organization_id: orgId } : {},
        data: { active: false }
      }),
      (db as any).agentic_csv_files.update({ where: { name: target.name }, data: { active: true, updated_at: new Date() } }),
    ])
    const active = await (db as any).agentic_csv_files.findUnique({ where: { name: target.name } })
    console.log(`[CSV] File selected by user ${(req as any).user?.userId}: ${target.name}`);
    res.json({ ok: true, active: toSafe(active) })
  } catch (e) { next(e) }
})

router.delete('/csv/:name', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req, res, next) => {
  try {
    const name = String(req.params.name || '')
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '_')
    const fp = path.join(csvDir, safe)

    // Validate file path
    if (!validateFilePath(fp, csvDir)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    const meta = await (db as any).agentic_csv_files.findUnique({ where: { name: safe } })
    if (!meta) return res.status(404).json({ message: 'Not found' })

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'
    if (!isSuper && meta.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    if (meta.active) return res.status(400).json({ message: 'Cannot delete active CSV' })
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    const deleted = await (db as any).agentic_csv_files.delete({ where: { name: safe } })
    console.log(`[CSV] File deleted by user ${(req as any).user?.userId}: ${name}`);
    res.json(toSafe(deleted))
  } catch (e) { next(e) }
})

router.get('/csv/download/:name', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req, res, next) => {
  try {
    const name = String(req.params.name || '')
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '_')
    const fp = path.join(csvDir, safe)

    // Validate file path
    if (!validateFilePath(fp, csvDir)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    if (!fs.existsSync(fp)) return res.status(404).end()

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'
    const meta = await (db as any).agentic_csv_files.findUnique({ where: { name: safe } })
    if (!meta) return res.status(404).json({ message: 'Not found' })
    if (!isSuper && meta.organization_id !== orgId) return res.status(403).json({ message: 'Access denied' })

    console.log(`[CSV] Download requested by user ${(req as any).user?.userId} for: ${name}`);
    res.download(fp, safe)
  } catch (e) { next(e) }
})

export default router
