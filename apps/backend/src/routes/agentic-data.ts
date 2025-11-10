import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { db } from '../db/prisma'
import { env } from '../config/env'

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

// Campaigns
router.get('/campaigns', async (_req, res, next) => {
  try {
    const items = await (db as any).agentic_campaigns.findMany({ orderBy: { id: 'desc' } })
    res.json({ items })
  } catch (e) { next(e) }
})

router.get('/campaigns/:module', async (req, res, next) => {
  try {
    const module = String(req.params.module)
    const item = await (db as any).agentic_campaigns.findUnique({ where: { module } })
    if (!item) return res.status(404).json({ message: 'Not found' })
    res.json(item)
  } catch (e) { next(e) }
})

router.post('/campaigns', async (req, res, next) => {
  try {
    const { name, module, agent_text, session_text } = req.body || {}
    const created = await (db as any).agentic_campaigns.create({ data: { name, module, agent_text, session_text } })
    res.status(201).json(created)
  } catch (e) { next(e) }
})

router.put('/campaigns/:module', async (req, res, next) => {
  try {
    const module = String(req.params.module)
    const { name, agent_text, session_text } = req.body || {}
    const updated = await (db as any).agentic_campaigns.update({ where: { module }, data: { name, agent_text, session_text, updated_at: new Date() } })
    res.json(updated)
  } catch (e) { next(e) }
})

router.delete('/campaigns/:module', async (req, res, next) => {
  try {
    const module = String(req.params.module)
    const deleted = await (db as any).agentic_campaigns.delete({ where: { module } })
    res.json(deleted)
  } catch (e) { next(e) }
})

// CSV metadata and files
router.get('/csv/list', async (_req, res, next) => {
  try {
    const items = await (db as any).agentic_csv_files.findMany({ orderBy: { id: 'desc' } })
    res.json({ files: items })
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
      update: { size: stat.size, mtime: BigInt(stat.mtimeMs), updated_at: new Date() },
      create: { name: f.filename, size: stat.size, mtime: BigInt(stat.mtimeMs) },
    })
    res.status(201).json(upsert)
  } catch (e) { next(e) }
})

router.post('/csv/select', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '')
    await (db as any).$transaction([
      (db as any).agentic_csv_files.updateMany({ data: { active: false } }),
      (db as any).agentic_csv_files.update({ where: { name }, data: { active: true, updated_at: new Date() } }),
    ])
    res.json({ ok: true })
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
    res.json(deleted)
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
