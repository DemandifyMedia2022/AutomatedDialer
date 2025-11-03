import mysql from 'mysql2/promise';
import { env } from '../config/env';

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      uri: env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}
