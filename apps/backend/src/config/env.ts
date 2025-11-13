import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL ,
  SIP_WSS_URL: process.env.SIP_WSS_URL ,
  SIP_DOMAIN: process.env.SIP_DOMAIN ,
  STUN_SERVER: process.env.STUN_SERVER ,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ,
  RECORDINGS_DIR: process.env.RECORDINGS_DIR || 'uploads/recordings',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '20m') as SignOptions['expiresIn'],
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || 'ad_auth',
  USE_AUTH_COOKIE: (process.env.USE_AUTH_COOKIE || 'true').toLowerCase() === 'true',
  ALLOW_SETUP: (process.env.ALLOW_SETUP || 'false').toLowerCase() === 'true',
  SETUP_TOKEN: process.env.SETUP_TOKEN || '',
  IDLE_THRESHOLD_SECONDS: parseInt(process.env.IDLE_THRESHOLD_SECONDS || '120', 10),
  SESSION_TIMEOUT_SECONDS: parseInt(process.env.SESSION_TIMEOUT_SECONDS || '900', 10),
};
