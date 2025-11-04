import { Request, Response } from 'express';
import { db } from '../db/prisma';

export async function health(req: Request, res: Response) {
  try {
    const rows = await db.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    res.json({ success: true, db: rows[0]?.ok === 1, status: 'ok' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'DB error' });
  }
}
