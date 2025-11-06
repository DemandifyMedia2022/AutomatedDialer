import { Router } from 'express';
import { db } from '../db/prisma';
import { requireAuth, requireRoles } from '../middlewares/auth';
 
const router = Router();
 
// List campaigns (Manager+)
router.get('/', requireAuth, requireRoles(['manager', 'superadmin']), async (_req, res, next) => {
  try {
    const items = await (db as any).campaigns.findMany({
      orderBy: { id: 'desc' },
    });
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});
 
// Create a new campaign (Manager+)
router.post('/', requireAuth, requireRoles(['manager', 'superadmin']), async (req, res, next) => {
  try {
    const b = req.body || {};
 
    // Coerce date strings if provided
    const start_date = b.start_date ? new Date(b.start_date) : null;
    const end_date = b.end_date ? new Date(b.end_date) : null;
 
    const data = {
      campaign_id: b.campaign_id != null ? Number(b.campaign_id) : null,
      campaign_name: b.campaign_name ?? null,
      start_date,
      end_date,
      allocations: b.allocations ?? null,
      assigned_to: b.assigned_to ?? null,
      status: b.status ?? null,
      method: b.method ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    } as any;
 
    const created = await (db as any).campaigns.create({ data });
    res.status(201).json({ success: true, item: created });
  } catch (err) {
    next(err);
  }
});
 
// Delete a campaign by id (Manager+)
router.delete('/:id', requireAuth, requireRoles(['manager', 'superadmin']), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' })
    }
    const deleted = await (db as any).campaigns.delete({ where: { id } })
    res.json({ success: true, item: deleted })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Not found' })
    }
    next(err)
  }
});
 
export default router;