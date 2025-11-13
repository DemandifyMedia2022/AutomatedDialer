import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env'
import { getPool } from '../db/pool'
import { db } from '../db/prisma'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'

const router = Router()

// Storage dir for dialer sheets (separate from agentic)
const baseDir = path.isAbsolute(env.RECORDINGS_DIR)
  ? path.resolve(process.cwd(), 'uploads/sheets')
  : path.resolve(process.cwd(), 'uploads/sheets')
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, baseDir),
  filename: (_req, file, cb) => cb(null, file.originalname.replace(/[^A-Za-z0-9._-]/g, '_')),
})
const upload = multer({ storage })

async function ensureTable() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dialer_sheets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      size BIGINT NULL,
      mtime BIGINT NULL,
      path VARCHAR(512) NOT NULL,
      active TINYINT(1) DEFAULT 0,
      assigned_user_ids TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

router.get('/', requireAuth, requireRoles(['manager','superadmin']), async (_req: any, res: any, next: any) => {
  try {
    await ensureTable()
    let items: any[] = []
    try {
      const rows = await (db as any).dialer_sheets.findMany({ orderBy: { updated_at: 'desc' } })
        items = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        size: Number(r.size || 0),
        mtime: Number(r.mtime || 0),
        active: !!r.active,
        assignedUserIds: String(r.assigned_user_ids || '').split(',').filter(Boolean).map((s: string) => Number(s)).filter((n: number) => Number.isFinite(n)),
        created_at: r.created_at,
        updated_at: r.updated_at,
      }))
    } catch (e) {
      try { console.warn('[dialer-sheets] Prisma list failed, falling back to SQL', (e as any)?.message) } catch {}
      const pool = getPool()
      const [rows]: any = await pool.query('SELECT id, name, size, mtime, active, assigned_user_ids, created_at, updated_at FROM dialer_sheets ORDER BY updated_at DESC')
      items = (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        size: Number(r.size || 0),
        mtime: Number(r.mtime || 0),
        active: !!r.active,
        assignedUserIds: String(r.assigned_user_ids || '').split(',').filter(Boolean).map((s: string) => Number(s)).filter((n: number) => Number.isFinite(n)),
        created_at: r.created_at,
        updated_at: r.updated_at,
      }))
    }
    res.json({ items })
  } catch (e) { next(e) }
})

router.get('/my', requireAuth, async (req: any, res: any, next: any) => {
  try {
    await ensureTable()
    const userId = Number(req.user?.userId)
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' })
    const pool = getPool()
    const [rows]: any = await pool.query('SELECT id, name, size, mtime, active, assigned_user_ids FROM dialer_sheets ORDER BY updated_at DESC')
    const items = rows
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        size: Number(r.size || 0),
        mtime: Number(r.mtime || 0),
        active: !!r.active,
        assignedUserIds: String(r.assigned_user_ids || '').split(',').filter(Boolean).map((s: string) => Number(s)).filter((n: number) => Number.isFinite(n)),
      }))
      .filter((r: any) => r.assignedUserIds.includes(userId))
    res.json({ items })
  } catch (e) { next(e) }
})

const writeMiddlewares: any[] = [requireAuth, requireRoles(['manager','superadmin'])]
if (env.USE_AUTH_COOKIE) writeMiddlewares.push(csrfProtect)

router.post('/upload', ...writeMiddlewares, upload.single('file'), async (req: any, res: any, next: any) => {
  try {
    await ensureTable()
    const f = req.file
    if (!f) return res.status(400).json({ message: 'file is required' })
    const stat = fs.statSync(f.path)
    try {
      const upserted = await (db as any).dialer_sheets.upsert({
        where: { name: f.filename },
        update: { size: BigInt(stat.size), mtime: BigInt(stat.mtimeMs), path: f.path, updated_at: new Date() },
        create: { name: f.filename, size: BigInt(stat.size), mtime: BigInt(stat.mtimeMs), path: f.path, active: false },
      })
      res.status(200).json(upserted)
    } catch (e) {
      try { console.warn('[dialer-sheets] Prisma upsert failed, falling back to SQL', (e as any)?.message) } catch {}
      const pool = getPool()
      const [existing]: any = await pool.query('SELECT id FROM dialer_sheets WHERE name = ?', [f.filename])
      if (existing?.length) {
        await pool.query('UPDATE dialer_sheets SET size=?, mtime=?, path=?, updated_at=NOW() WHERE id=?', [stat.size, stat.mtimeMs, f.path, existing[0].id])
        const [row]: any = await pool.query('SELECT * FROM dialer_sheets WHERE id=?', [existing[0].id])
        res.status(200).json(row[0])
      } else {
        const [result]: any = await pool.query('INSERT INTO dialer_sheets (name, size, mtime, path, active) VALUES (?,?,?,?,0)', [f.filename, stat.size, stat.mtimeMs, f.path])
        const id = Number(result.insertId)
        const [row]: any = await pool.query('SELECT * FROM dialer_sheets WHERE id=?', [id])
        res.status(201).json(row[0])
      }
    }
  } catch (e) { next(e) }
})

router.post('/:id/assign', ...writeMiddlewares, async (req: any, res: any, next: any) => {
  try {
    await ensureTable()
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' })
    let agentIds: number[] = Array.isArray(req.body?.agentIds) ? req.body.agentIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : []
    if ((!agentIds || agentIds.length === 0) && Array.isArray(req.body?.usernames)) {
      const usernames = req.body.usernames.map((s: any) => String(s || '').trim()).filter(Boolean)
      if (usernames.length) {
        const users = await db.users.findMany({ where: { username: { in: usernames } }, select: { id: true } })
        agentIds = users.map(u => Number(u.id)).filter(n => Number.isFinite(n))
      }
    }
    const csv = (agentIds || []).join(',')
    await (db as any).dialer_sheets.update({ where: { id }, data: { assigned_user_ids: csv, updated_at: new Date() } })
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.post('/:id/activate', ...writeMiddlewares, async (req: any, res: any, next: any) => {
  try {
    await ensureTable()
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' })
    await (db as any).dialer_sheets.updateMany({ data: { active: false } })
    await (db as any).dialer_sheets.update({ where: { id }, data: { active: true, updated_at: new Date() } })
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.delete('/:id', ...writeMiddlewares, async (req: any, res: any, next: any) => {
  try {
    await ensureTable()
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' })
    const item = await (db as any).dialer_sheets.findUnique({ where: { id } })
    if (!item) return res.status(404).json({ message: 'Not found' })
    if (item.active) return res.status(400).json({ message: 'Cannot delete active sheet' })
    try { if (item.path && fs.existsSync(item.path)) fs.unlinkSync(item.path) } catch {}
    await (db as any).dialer_sheets.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) { next(e) }
})

// Download a sheet file
router.get('/download/:id', requireAuth, async (req: any, res: any, next: any) => {
  try {
    await ensureTable()
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' })
    const item = await (db as any).dialer_sheets.findUnique({ where: { id } })
    if (!item) return res.status(404).json({ message: 'Not found' })
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isManager = roles.includes('manager') || roles.includes('superadmin')
    if (!isManager) {
      const uid = Number(req.user?.userId)
      const assigned = String(item.assigned_user_ids || '')
        .split(',')
        .map(s => Number(s))
        .filter(n => Number.isFinite(n))
      if (!assigned.includes(uid)) {
        return res.status(403).json({ message: 'Forbidden' })
      }
    }
    const fp = String(item.path || '')
    if (!fp || !fs.existsSync(fp)) return res.status(404).json({ message: 'File missing' })
    res.download(fp, item.name)
  } catch (e) { next(e) }
})

export default router
