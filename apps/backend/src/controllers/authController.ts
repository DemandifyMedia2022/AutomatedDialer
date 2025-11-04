import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/prisma';
import { randomUUID } from 'crypto';

const setupSchema = z.object({
  username: z.string().min(1),
  usermail: z.string().email(),
  password: z.string().min(6),
});

export async function setupSuperadmin(req: Request, res: Response) {
  try {
    const parsed = setupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() });
    }

    const totalUsers = await db.users.count();
    if (totalUsers > 0) {
      return res.status(403).json({ success: false, message: 'Already initialized' });
    }

    const { username, usermail, password } = parsed.data;

    const existing = await db.users.findFirst({ where: { usermail } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await db.users.create({
      data: {
        role: 'superadmin',
        unique_user_id: randomUUID(),
        username,
        usermail,
        password: hash,
        status: 'active',
      },
      select: { id: true, role: true, username: true, usermail: true, created_at: true },
    });

    return res.status(201).json({ success: true, user });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Setup failed' });
  }
}

const loginSchema = z.object({
  usermail: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() });
    }

    const { usermail, password } = parsed.data;

    const user = await db.users.findFirst({ where: { usermail } });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({ success: true, user: { id: user.id, role: user.role, username: user.username, usermail: user.usermail } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Login failed' });
  }
}
