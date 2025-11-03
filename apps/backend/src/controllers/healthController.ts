import { Request, Response } from 'express';
import { getPool } from '../db/pool';

export async function health(req: Request, res: Response) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ success: true, db: (rows as any)[0]?.ok === 1, status: 'ok' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'DB error' });
  }
}
