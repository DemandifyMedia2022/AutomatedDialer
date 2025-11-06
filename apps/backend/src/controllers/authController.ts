import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/prisma';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { signJwt } from '../utils/jwt';
import { LoginSchema } from '../validators/authSchemas';

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

    // Generate unique_user_id as DM-<INITIALS>-#### using last serial per initials
    const initFromName = (name: string) => name.split(/\s+/).filter(Boolean).map(w => w[0] || '').join('')
    const rawInitials = (initFromName(username || '') || (usermail.split('@')[0] || ''))
    const lettersOnly = rawInitials.replace(/[^A-Za-z]/g, '')
    const initials = (lettersOnly || 'XX').slice(0, 2).toUpperCase()
    const prefix = `DM-${initials}-`
    const last = await db.users.findFirst({
      where: { unique_user_id: { startsWith: prefix } },
      select: { unique_user_id: true },
      orderBy: { unique_user_id: 'desc' },
    })
    const lastNum = last?.unique_user_id?.match(/^(?:DM-[A-Z]{1,2}-)(\d{4})$/)?.[1]
    const next = (lastNum ? parseInt(lastNum, 10) + 1 : 1)
    const uniqueId = `${prefix}${String(next).padStart(4, '0')}`

    const user = await db.users.create({
      data: {
        role: 'superadmin',
        unique_user_id: uniqueId,
        username,
        usermail,
        password: hash,
        status: 'active',
      },
      select: { id: true, role: true, username: true, usermail: true, created_at: true, unique_user_id: true },
    });

    return res.status(201).json({ success: true, user });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Setup failed' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = LoginSchema.safeParse({
      email: req.body?.email ?? req.body?.usermail,
      password: req.body?.password,
    });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', issues: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    // Allow login via email OR unique_user_id
    const user = await db.users.findFirst({ where: { OR: [ { usermail: email }, { unique_user_id: email } ] } });
    if (!user || !user.password) {
      console.warn('[auth] failed login (no user)', { email });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.warn('[auth] failed login (bad password)', { email });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signJwt({ userId: user.id, role: (user.role || '').toLowerCase(), email: user.usermail || email });

    if (env.USE_AUTH_COOKIE) {
      // Set HttpOnly JWT cookie and CSRF token cookie (double-submit pattern)
      res.cookie(env.AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 30, // 30 minutes
        path: '/',
      });
      const csrfToken = randomUUID();
      res.cookie('csrf_token', csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 30,
        path: '/',
      });
      return res.json({
        success: true,
        user: { id: user.id, role: user.role, username: user.username, email: user.usermail },
        csrfToken,
      });
    }

    return res.json({ success: true, token, user: { id: user.id, role: user.role, username: user.username, email: user.usermail } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Login failed' });
  }
}

export async function me(req: Request, res: Response) {
  const u = req.user;
  if (!u) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const user = await db.users.findUnique({ where: { id: u.userId }, select: { username: true, usermail: true, role: true, id: true } });
    return res.json({ success: true, user: { id: user?.id || u.userId, role: user?.role || u.role, username: user?.username || null, email: user?.usermail || u.email } });
  } catch {
    return res.json({ success: true, user: { id: u.userId, role: u.role, username: null, email: u.email } });
  }
}

export async function logout(_req: Request, res: Response) {
  if (env.USE_AUTH_COOKIE) {
    res.clearCookie(env.AUTH_COOKIE_NAME, { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
  }
  return res.json({ success: true });
}
