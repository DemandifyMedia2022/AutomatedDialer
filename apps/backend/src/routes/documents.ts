import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { z } from 'zod'
import { env } from '../config/env'
import { requireAuth, requireRoles } from '../middlewares/auth'
import { csrfProtect } from '../middlewares/csrf'
import { getPool } from '../db/pool'

const router = Router()

// Storage for uploaded documents
const uploadsPath = path.isAbsolute(env.RECORDINGS_DIR)
  ? env.RECORDINGS_DIR // reuse uploads dir configured; change to DOCS_DIR in env if you prefer
  : path.resolve(process.cwd(), env.RECORDINGS_DIR)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsPath),
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const ext = path.extname(file.originalname) || path.extname(file.mimetype) || ''
    cb(null, `doc_${ts}${ext}`)
  },
})
const upload = multer({ storage })

// List documents (agents see org/public; managers see all)
router.get('/', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20))
    const offset = (page - 1) * pageSize
    const q = (req.query.q || '').toString().trim()

    const pool = getPool()
    const whereParts: string[] = []
    const params: any[] = []
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isManager = roles.includes('manager') || roles.includes('superadmin')
    if (!isManager) {
      whereParts.push("visibility IN ('org','public')")
    }
    if (q) {
      whereParts.push('(title LIKE ? OR description LIKE ? OR content_richtext LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
    const [[{ cnt }]]: any = await pool.query(`SELECT COUNT(*) AS cnt FROM documents ${whereSql}`, params)
    params.push(pageSize, offset)
    const [rows]: any = await pool.query(
      `SELECT id, type, title, description, file_url, file_mime, file_size_bytes, content_richtext,
              version, tags_csv, created_by, visibility, created_at, updated_at
       FROM documents ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      params
    )
    res.json({ success: true, page, pageSize, total: Number(cnt || 0), items: rows })
  } catch (e) { next(e) }
})

// Get single document
router.get('/:id', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res: any, next: any) => {
  try {
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid id' })

    const pool = getPool()
    const [rows]: any = await pool.query(
      `SELECT id, type, title, description, file_url, file_mime, file_size_bytes, content_richtext,
              version, tags_csv, created_by, visibility, created_at, updated_at
       FROM documents WHERE id = ?`,
      [id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' })
    res.json(rows[0])
  } catch (e) { next(e) }
})

// Update document
const updateMiddlewares: any[] = [requireAuth, requireRoles(['manager', 'superadmin'])]
if (env.USE_AUTH_COOKIE) updateMiddlewares.push(csrfProtect)

router.put('/:id', ...updateMiddlewares, upload.single('file'), async (req: any, res: any, next: any) => {
  try {
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid id' })

    const parsed = CreateDocSchema.partial().safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const b = parsed.data

    const pool = getPool()
    // Check existence
    const [existing]: any = await pool.query('SELECT id FROM documents WHERE id = ?', [id])
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' })

    const updates: string[] = []
    const params: any[] = []

    if (b.type) { updates.push('type = ?'); params.push(b.type) }
    if (b.title) { updates.push('title = ?'); params.push(b.title) }
    if (b.description !== undefined) { updates.push('description = ?'); params.push(b.description) }
    if (b.visibility) { updates.push('visibility = ?'); params.push(b.visibility) }
    if (b.tags_csv !== undefined) { updates.push('tags_csv = ?'); params.push(b.tags_csv) }
    if (b.content_richtext !== undefined) { updates.push('content_richtext = ?'); params.push(b.content_richtext) }

    const file = req.file
    if (file) {
      const file_url = `${env.PUBLIC_BASE_URL}/uploads/${file.filename}`
      updates.push('file_url = ?', 'file_mime = ?', 'file_size_bytes = ?')
      params.push(file_url, file.mimetype, Number(file.size || 0))
    }

    if (updates.length === 0) return res.json({ success: true, message: 'No changes' })

    updates.push('version = version + 1')

    params.push(id)
    await pool.query(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params)

    const [rows]: any = await pool.query(
      `SELECT id, type, title, description, file_url, file_mime, file_size_bytes, content_richtext,
              version, tags_csv, created_by, visibility, created_at, updated_at
       FROM documents WHERE id = ?`,
      [id]
    )
    res.json(rows[0])
  } catch (e) { next(e) }
})

// Delete document
const deleteMiddlewares: any[] = [requireAuth, requireRoles(['manager', 'superadmin'])]
if (env.USE_AUTH_COOKIE) deleteMiddlewares.push(csrfProtect)

router.delete('/:id', ...deleteMiddlewares, async (req: any, res: any, next: any) => {
  try {
    const id = parseInt(String(req.params.id || ''), 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid id' })

    const pool = getPool()
    const [result]: any = await pool.query('DELETE FROM documents WHERE id = ?', [id])
    const affected = Number(result?.affectedRows || 0)
    if (affected === 0) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, deleted: affected })
  } catch (e) { next(e) }
})

const CreateDocSchema = z.object({
  type: z.enum(['template', 'guide', 'playbook', 'snippet', 'other']).default('guide'),
  title: z.string().min(1),
  description: z.string().default(''),
  visibility: z.enum(['private', 'org', 'public']).default('org'),
  tags_csv: z.string().default(''),
  content_richtext: z.string().optional().nullable(),
})

const createMiddlewares: any[] = [requireAuth, requireRoles(['manager', 'superadmin'])]
if (env.USE_AUTH_COOKIE) createMiddlewares.push(csrfProtect)

// Create document (either file upload or text-only)
router.post('/', ...createMiddlewares, upload.single('file'), async (req: any, res: any, next: any) => {
  try {
    const parsed = CreateDocSchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() })
    const b = parsed.data
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const file = req.file
    const file_url = file ? `${env.PUBLIC_BASE_URL}/uploads/${file.filename}` : null
    const file_mime = file ? file.mimetype : null
    const file_size_bytes = file ? Number(file.size || 0) : null
    const content_richtext = (b.content_richtext ?? '').trim() || null

    if (!file_url && !content_richtext) {
      return res.status(400).json({ success: false, message: 'Provide a file or content_richtext' })
    }

    const pool = getPool()
    const [result]: any = await pool.query(
      `INSERT INTO documents (type, title, description, file_url, file_mime, file_size_bytes, content_richtext, version, tags_csv, created_by, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [b.type, b.title, (b.description || ''), file_url, file_mime, file_size_bytes, content_richtext, (b.tags_csv || ''), userId, b.visibility]
    )
    const insertId = Number(result?.insertId || 0)
    const [rows]: any = await pool.query(
      `SELECT id, type, title, description, file_url, file_mime, file_size_bytes, content_richtext,
              version, tags_csv, created_by, visibility, created_at, updated_at
       FROM documents WHERE id = ?`,
      [insertId]
    )
    res.status(201).json(rows?.[0] || { id: insertId })
  } catch (e) { next(e) }
})

export default router
