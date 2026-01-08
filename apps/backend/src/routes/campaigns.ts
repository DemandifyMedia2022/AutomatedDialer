import { Router } from 'express';
import { db } from '../db/prisma';
import { requireAuth, requireRoles } from '../middlewares/auth';

const router = Router();

// Helper to expire old campaigns
const cleanupExpiredCampaigns = async () => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // If a campaign is 'active' but its end_date is strictly before today (meaning it ended yesterday or earlier),
    // mark it inactive.
    // Assumes end_date is stored as YYYY-MM-DDT00:00:00.
    await (db as any).campaigns.updateMany({
      where: {
        status: 'active',
        end_date: { lt: startOfToday }
      },
      data: { status: 'inactive' }
    });
  } catch (e) {
    console.error("Failed to cleanup expired campaigns", e);
  }
};

// List campaigns (Manager+, QA)
router.get('/', requireAuth, requireRoles(['qa', 'manager', 'superadmin']), async (req: any, res, next) => {
  try {
    await cleanupExpiredCampaigns();
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = {}
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const items = await (db as any).campaigns.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// List only active campaigns (Agent+)
router.get('/active', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res, next) => {
  try {
    await cleanupExpiredCampaigns();
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = { status: 'active' }
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const items = await (db as any).campaigns.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// List only inactive campaigns (Agent+)
router.get('/inactive', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), async (req: any, res, next) => {
  try {
    await cleanupExpiredCampaigns();
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const where: any = { status: 'inactive' }
    if (!isSuper && orgId) {
      where.organization_id = orgId
    }

    const items = await (db as any).campaigns.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

// Create a new campaign (Manager+)
router.post('/', requireAuth, requireRoles(['manager', 'superadmin']), async (req: any, res, next) => {
  try {
    const orgId = req.user?.organizationId
    if (!orgId) return res.status(400).json({ success: false, message: 'Manager must belong to an organization' })

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
      organization_id: orgId,
      created_at: new Date(),
      updated_at: new Date(),
    } as any;

    const created = await (db as any).campaigns.create({ data });
    res.status(201).json({ success: true, item: created });
  } catch (err) {
    next(err);
  }
});

// Update a campaign by id (Manager+)
router.put('/:id', requireAuth, requireRoles(['manager', 'superadmin']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const campaign = await (db as any).campaigns.findUnique({ where: { id }, select: { organization_id: true } });
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });
    if (!isSuper && campaign.organization_id !== orgId) return res.status(403).json({ success: false, message: 'Access denied' });

    const b = req.body || {};
    const data: any = { updated_at: new Date() };

    if (b.campaign_id !== undefined) data.campaign_id = b.campaign_id != null ? Number(b.campaign_id) : null;
    if (b.campaign_name !== undefined) data.campaign_name = b.campaign_name;
    if (b.start_date !== undefined) data.start_date = b.start_date ? new Date(b.start_date) : null;
    if (b.end_date !== undefined) data.end_date = b.end_date ? new Date(b.end_date) : null;
    if (b.allocations !== undefined) data.allocations = b.allocations;
    if (b.assigned_to !== undefined) data.assigned_to = b.assigned_to;
    if (b.status !== undefined) data.status = b.status;
    if (b.method !== undefined) data.method = b.method;

    const updated = await (db as any).campaigns.update({ where: { id }, data });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
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
    const orgId = req.user?.organizationId
    const isSuper = req.user?.role === 'superadmin'

    const campaign = await (db as any).campaigns.findUnique({ where: { id }, select: { organization_id: true } });
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });
    if (!isSuper && campaign.organization_id !== orgId) return res.status(403).json({ success: false, message: 'Access denied' });

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