
import { Router } from 'express';
import { db } from '../../db/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();

// Schema for creating an organization
const createOrgSchema = z.object({
    name: z.string().min(1),
    contact_email: z.string().email().optional(),
    is_demo: z.boolean().default(false),
    valid_until: z.string().optional(), // ISO Date string
    max_users: z.number().int().min(1).default(10),
    billing_info: z.any().optional(),
    // Provisioning details
    provision_agents: z.number().int().min(0).default(0),
    provision_managers: z.number().int().min(0).default(0),
    provision_qas: z.number().int().min(0).default(0),
});

// GET /api/superadmin/organizations - List organizations
router.get('/', async (req, res, next) => {
    try {
        const orgs = await db.organizations.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(orgs);
    } catch (error) {
        next(error);
    }
});

// GET /api/superadmin/organizations/:id - Get details
router.get('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const org = await db.organizations.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, username: true, usermail: true, role: true, status: true }
                }
            }
        });
        if (!org) return res.status(404).json({ message: 'Organization not found' });
        res.json(org);
    } catch (error) {
        next(error);
    }
});

// POST /api/superadmin/organizations - Create Organization & Provision Users
router.post('/', async (req, res, next) => {
    try {
        const body = createOrgSchema.parse(req.body);

        // Check name uniqueness
        const existing = await db.organizations.findUnique({
            where: { name: body.name }
        });
        if (existing) {
            return res.status(400).json({ message: 'Organization name already exists' });
        }

        // Transaction to create org and users
        const newOrg = await db.$transaction(async (tx) => {
            // 1. Create Org
            const org = await tx.organizations.create({
                data: {
                    name: body.name,
                    contact_email: body.contact_email,
                    is_demo: body.is_demo,
                    valid_until: body.valid_until ? new Date(body.valid_until) : null,
                    max_users: body.max_users,
                    billing_info: body.billing_info ? JSON.stringify(body.billing_info) : null,
                    status: 'active'
                }
            });

            // 2. Provision Users
            const usersToCreate = [];
            const passwordHash = await bcrypt.hash('password123', 10); // Default password
            // Common user props
            const commonUser = {
                organization_id: org.id,
                password: passwordHash,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
                is_demo_user: body.is_demo // Propagate demo flag to user level for backward compatibility
            };

            // Helper to generate unique username/email
            const prefix = body.name.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Admin (Auto-created as organization owner/superadmin equivalent for that org? 
            // Or just a manager? Let's assume Manager for now, or Superadmin if we want org-level admins.
            // The requirement says "add required number of role accounts".
            // Let's stick to the requested counts.

            // Create Agents
            for (let i = 1; i <= body.provision_agents; i++) {
                const num = i.toString().padStart(3, '0');
                usersToCreate.push({
                    ...commonUser,
                    username: `${prefix}_agent${num}`,
                    usermail: `${prefix}_agent${num}@example.com`,
                    role: 'agent',
                    extension: `${1000 + i}`, // Simple extension logic
                    unique_user_id: `${prefix}_agent${num}`,
                });
            }

            // Create Managers
            for (let i = 1; i <= body.provision_managers; i++) {
                const num = i.toString().padStart(2, '0');
                usersToCreate.push({
                    ...commonUser,
                    username: `${prefix}_manager${num}`,
                    usermail: `${prefix}_manager${num}@example.com`,
                    role: 'manager',
                    unique_user_id: `${prefix}_manager${num}`,
                });
            }

            // Create QAs
            for (let i = 1; i <= body.provision_qas; i++) {
                const num = i.toString().padStart(2, '0');
                usersToCreate.push({
                    ...commonUser,
                    username: `${prefix}_qa${num}`,
                    usermail: `${prefix}_qa${num}@example.com`,
                    role: 'qa',
                    unique_user_id: `${prefix}_qa${num}`,
                });
            }

            if (usersToCreate.length > 0) {
                // Prisma createMany (users usually has unique constraints, so unique_user_id/email must be unique)
                // We hope they occupy unique namespace.
                await tx.users.createMany({
                    data: usersToCreate as any // Typing workaround if needed
                });
            }

            return org;
        });

        res.status(201).json(newOrg);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', issues: error.errors });
        }
        next(error);
    }
});

// PUT /api/superadmin/organizations/:id - Update Organization
router.put('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { name, is_demo, valid_until, max_users, status } = req.body;

        const org = await db.organizations.update({
            where: { id },
            data: {
                name,
                is_demo,
                valid_until: valid_until ? new Date(valid_until) : undefined,
                max_users,
                status
            }
        });

        // If demo status changed, update all users in org?
        if (is_demo !== undefined) {
            await db.users.updateMany({
                where: { organization_id: id },
                data: { is_demo_user: is_demo }
            });
        }

        res.json(org);
    } catch (error) {
        next(error);
    }
});


// DELETE /api/superadmin/organizations/:id - Delete Organization (Hard or Soft?)
// Let's do soft delete by setting status to suspended or deleting if confirmed.
// Requirement: "manage permissions, billing", implies long lifecycle.
router.delete('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        // Cascading delete is set in DB fk `ON DELETE SET NULL` usually, but schema has... 
        // Wait, schema was: FOREIGN KEY ... ON DELETE SET NULL.
        // Actually for organization removal we might want to cascade delete users or suspend them.
        // Let's delete the org.

        await db.organizations.delete({ where: { id } });
        res.json({ message: 'Organization deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
