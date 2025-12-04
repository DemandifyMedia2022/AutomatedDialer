import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { db } from '../db/prisma'
import { env } from '../config/env'
import { getIo } from '../utils/ws'

const router = Router()

// Base dir to store agentic CSV files
const baseDir = path.isAbsolute(env.RECORDINGS_DIR)
  ? path.resolve(process.cwd(), 'apps/backend/src/agentic-dialing')
  : path.resolve(process.cwd(), 'apps/backend/src/agentic-dialing')

const csvDir = baseDir
if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, csvDir),
  filename: (_req, file, cb) => cb(null, file.originalname.replace(/[^A-Za-z0-9._-]/g, '_')),
})
const upload = multer({ storage })
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
async function getActiveCsvName(): Promise<string | null> {
  try {
    const active = await (db as any).agentic_csv_files.findFirst({ where: { active: true } })
    return active?.name || null
  } catch { return null }
}

// Helper: parse CSV to leads
function normalizePhone(raw: string): string {
  const s = String(raw || '').trim()
  // Handle scientific notation like 9.17021E+11
  if (/^\d+\.?\d*e[+\-]?\d+$/i.test(s)) {
    try { return BigInt(Math.round(Number(s))).toString() } catch {}
  }
  const only = s.replace(/[^0-9+]/g, '').replace(/^00/, '+')
  // If no leading +, apply default country code when provided (fallback '+91')
  if (!only.startsWith('+')) {
    const cc = String((env as any).DEFAULT_COUNTRY_CODE || '+91').trim()
    if (cc && cc.startsWith('+')) return cc + only.replace(/^[+]/, '')
  }
  return only
}

function parseCsvToLeads(fp: string, limit?: number) {
  const text = fs.readFileSync(fp, 'utf-8')
  const lines = text.split(/\r?\n/).filter(l => l.trim().length)
  if (!lines.length) return [] as any[]
  const headers = (lines.shift() || '').split(',').map(h => h.trim().toLowerCase())
  const idx = {
    name: headers.findIndex(h => /(name|prospect)/.test(h)),
    company: headers.findIndex(h => /(company|organisation|organization|org)/.test(h)),
    title: headers.findIndex(h => /(title|designation|role|position)/.test(h)),
    phone: headers.findIndex(h => /(phone|mobile|contact|number|msisdn|cell)/.test(h)),
  }
  const out: any[] = []
  for (const line of lines) {
    const cols = line.split(',')
    const phone = idx.phone >= 0 ? normalizePhone(String(cols[idx.phone] || '')) : ''
    if (!phone) continue
    out.push({
      prospect_name: idx.name >= 0 ? String(cols[idx.name] || '').trim() : '',
      company_name: idx.company >= 0 ? String(cols[idx.company] || '').trim() : '',
      job_title: idx.title >= 0 ? String(cols[idx.title] || '').trim() : '',
      phone,
    })
    if (limit && out.length >= limit) break
  }
  return out
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
router.get('/leads', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = 50
    const name = await getActiveCsvName()
    if (!name) return res.json({ leads: [], page, total_pages: 1, start_index: 0, total_leads: 0 })
    const fp = path.join(csvDir, name)
    if (!fs.existsSync(fp)) return res.json({ leads: [], page, total_pages: 1, start_index: 0, total_leads: 0 })
    const all = parseCsvToLeads(fp)
    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const startIdx = (page - 1) * pageSize
    const leads = all.slice(startIdx, startIdx + pageSize)
    res.json({ leads, page, total_pages: totalPages, start_index: startIdx, total_leads: total })
  } catch (e) { next(e) }
})

// Start call (mock: just update state)
router.post('/start_call', parseFields.none(), async (req, res, next) => {
  try {
    const idx = parseInt(String(req.body?.lead_global_index || '0'), 10) || 0
    state.running = true
    state.status = 'dialing'
    state.lead_index = idx
    // Load lead details from active CSV
    const name = await getActiveCsvName()
    if (name) {
      const fp = path.join(csvDir, name)
      if (fs.existsSync(fp)) {
        const all = parseCsvToLeads(fp)
        const lead = all[idx] || null
        state.lead = lead ? { index: idx, ...lead } : { index: idx }
        // Emit socket event so an agent client can actually dial
        try { getIo()?.emit('agentic:start_call', { lead: state.lead, campaign: state.campaign, index: idx }) } catch {}
      } else {
        state.lead = { index: idx }
      }
    } else {
      state.lead = { index: idx }
    }
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// GET alias for manual testing from browser: /api/agentic/start_call?lead_global_index=0
router.get('/start_call', async (req, res, next) => {
  try {
    const idx = parseInt(String((req.query as any)?.lead_global_index || '0'), 10) || 0
    state.running = true
    state.status = 'dialing'
    state.lead_index = idx
    const name = await getActiveCsvName()
    if (name) {
      const fp = path.join(csvDir, name)
      if (fs.existsSync(fp)) {
        const all = parseCsvToLeads(fp)
        const lead = all[idx] || null
        state.lead = lead ? { index: idx, ...lead } : { index: idx }
        try { getIo()?.emit('agentic:start_call', { lead: state.lead, campaign: state.campaign, index: idx }) } catch {}
      } else {
        state.lead = { index: idx }
      }
    } else {
      state.lead = { index: idx }
    }
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
router.get('/campaigns', async (_req, res, next) => {
  try {
    const items = await (db as any).agentic_campaigns.findMany({ orderBy: { id: 'desc' } })
    res.json({ items: items.map(toSafe) })
  } catch (e) { next(e) }
})

router.get('/campaigns/:module', async (req, res, next) => {
  try {
    const module = String(req.params.module)
    const item = await (db as any).agentic_campaigns.findUnique({ where: { module } })
    if (!item) return res.status(404).json({ message: 'Not found' })
    res.json(toSafe(item))
  } catch (e) { next(e) }
})

router.post('/campaigns', async (req, res, next) => {
  try {
    const { name, module, agent_text, session_text } = req.body || {}
    const created = await (db as any).agentic_campaigns.create({ data: { name, module, agent_text, session_text } })
    res.status(201).json(toSafe(created))
  } catch (e) { next(e) }
})

router.put('/campaigns/:module', async (req, res, next) => {
  try {
    const module = String(req.params.module)
    const { name, agent_text, session_text } = req.body || {}
    const updated = await (db as any).agentic_campaigns.update({ where: { module }, data: { name, agent_text, session_text, updated_at: new Date() } })
    res.json(toSafe(updated))
  } catch (e) { next(e) }
})

router.delete('/campaigns/:module', async (req, res, next) => {
  try {
    const module = String(req.params.module)
    const deleted = await (db as any).agentic_campaigns.delete({ where: { module } })
    res.json(toSafe(deleted))
  } catch (e) { next(e) }
})

// CSV metadata and files
router.get('/csv/list', async (_req, res, next) => {
  try {
    const items = await (db as any).agentic_csv_files.findMany({ orderBy: { id: 'desc' } })
    res.json({ files: items.map(toSafe) })
  } catch (e) { next(e) }
})

router.get('/csv/preview', async (req, res, next) => {
  try {
    const name = String(req.query.name || '')
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '10'), 10) || 10))
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '_')
    const fp = path.join(csvDir, safe)
    if (!fs.existsSync(fp)) return res.status(404).json({ message: 'Not found' })
    const content = fs.readFileSync(fp, 'utf-8')
    const lines = content.split(/\r?\n/).filter(Boolean)
    const headers = (lines.shift() || '').split(',')
    const rows = lines.slice(0, limit).map(line => {
      const vals = line.split(',')
      const r: any = {}
      headers.forEach((h, i) => r[h] = vals[i] || '')
      return r
    })
    res.json({ headers, rows, total: lines.length + 1 })
  } catch (e) { next(e) }
})

router.post('/csv/upload', upload.single('file'), async (req, res, next) => {
  try {
    const f = (req as any).file
    if (!f) return res.status(400).json({ message: 'file is required' })
    const stat = fs.statSync(f.path)
    const upsert = await (db as any).agentic_csv_files.upsert({
      where: { name: f.filename },
      update: { size: stat.size, mtime: BigInt(Math.round(stat.mtimeMs)), updated_at: new Date() },
      create: { name: f.filename, size: stat.size, mtime: BigInt(Math.round(stat.mtimeMs)) },
    })
    res.status(201).json(toSafe(upsert))
  } catch (e) { next(e) }
})

router.post('/csv/select', parseFields.none(), async (req, res, next) => {
  try {
    const input = String(req.body?.name || '')
    const safe = input.replace(/[^A-Za-z0-9._-]/g, '_')
    const target = await (db as any).agentic_csv_files.findFirst({ where: { OR: [{ name: input }, { name: safe }] } })
    if (!target) return res.status(404).json({ message: 'CSV not found' })
    await (db as any).$transaction([
      (db as any).agentic_csv_files.updateMany({ data: { active: false } }),
      (db as any).agentic_csv_files.update({ where: { name: target.name }, data: { active: true, updated_at: new Date() } }),
    ])
    const active = await (db as any).agentic_csv_files.findUnique({ where: { name: target.name } })
    res.json({ ok: true, active: toSafe(active) })
  } catch (e) { next(e) }
})

router.delete('/csv/:name', async (req, res, next) => {
  try {
    const name = String(req.params.name || '')
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '_')
    const fp = path.join(csvDir, safe)
    const meta = await (db as any).agentic_csv_files.findUnique({ where: { name: safe } })
    if (meta?.active) return res.status(400).json({ message: 'Cannot delete active CSV' })
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    const deleted = await (db as any).agentic_csv_files.delete({ where: { name: safe } })
    res.json(toSafe(deleted))
  } catch (e) { next(e) }
})

router.get('/csv/download/:name', async (req, res, next) => {
  try {
    const name = String(req.params.name || '')
    const safe = name.replace(/[^A-Za-z0-9._-]/g, '_')
    const fp = path.join(csvDir, safe)
    if (!fs.existsSync(fp)) return res.status(404).end()
    res.download(fp, safe)
  } catch (e) { next(e) }
})

export default router
