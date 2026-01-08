import express from 'express';
import { db } from '../../db/prisma';
import { z } from 'zod';

const router = express.Router();

// Schema for updating restrictions
const updateRestrictionSchema = z.object({
    role: z.enum(['agent', 'manager', 'qa']),
    feature_key: z.string(),
    label: z.string(),
    is_locked: z.boolean(),
});

// GET /api/superadmin/demo-restrictions
// Fetch all demo restrictions
router.get('/', async (req, res) => {
    try {
        const restrictions = await db.demo_feature_restrictions.findMany({
            orderBy: [
                { role: 'asc' },
                { label: 'asc' }
            ]
        });
        res.json(restrictions);
    } catch (error) {
        console.error('Error fetching demo restrictions:', error);
        res.status(500).json({ error: 'Failed to fetch restrictions' });
    }
});

// POST /api/superadmin/demo-restrictions
// Upsert a restriction
router.post('/', async (req, res) => {
    try {
        const { role, feature_key, label, is_locked } = updateRestrictionSchema.parse(req.body);

        const restriction = await db.demo_feature_restrictions.upsert({
            where: {
                role_feature_key: {
                    role,
                    feature_key,
                },
            },
            update: {
                is_locked,
                label, // Update label just in case
            },
            create: {
                role,
                feature_key,
                label,
                is_locked,
            },
        });

        res.json(restriction);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors });
        } else {
            console.error('Error updating demo restriction:', error);
            res.status(500).json({ error: 'Failed to update restriction' });
        }
    }
});

export default router;
