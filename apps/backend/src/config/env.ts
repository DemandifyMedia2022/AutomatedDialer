import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || '';

// Enforce strong JWT_SECRET in production
// Enforce strong JWT_SECRET in production
if (NODE_ENV === 'production') {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production environment.');
  }
  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production.');
  }
}

export const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  SIP_WSS_URL: process.env.SIP_WSS_URL,
  SIP_DOMAIN: process.env.SIP_DOMAIN,
  STUN_SERVER: process.env.STUN_SERVER,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  RECORDINGS_DIR: process.env.RECORDINGS_DIR || 'uploads/recordings',
  JWT_SECRET,
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '20m') as SignOptions['expiresIn'],
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || 'ad_auth',
  USE_AUTH_COOKIE: (process.env.USE_AUTH_COOKIE || 'true').toLowerCase() === 'true',
  ALLOW_SETUP: (process.env.ALLOW_SETUP || 'false').toLowerCase() === 'true',
  SETUP_TOKEN: process.env.SETUP_TOKEN || '',
  IDLE_THRESHOLD_SECONDS: parseInt(process.env.IDLE_THRESHOLD_SECONDS || '120', 10),
  SESSION_TIMEOUT_SECONDS: parseInt(process.env.SESSION_TIMEOUT_SECONDS || '900', 10),
  MAIL_MAILER: process.env.MAIL_MAILER || 'smtp',
  MAIL_HOST: process.env.MAIL_HOST || '',
  MAIL_PORT: parseInt(process.env.MAIL_PORT || '0', 10),
  MAIL_USERNAME: process.env.MAIL_USERNAME || '',
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
  MAIL_ENCRYPTION: (process.env.MAIL_ENCRYPTION || 'ssl').toLowerCase(),
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS || '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'App',
  API_CALL_DEBUG: (process.env.API_CALL_DEBUG || 'false').toLowerCase() === 'true',
  API_CALL_DEBUG_SCOPE: (process.env.API_CALL_DEBUG_SCOPE || 'calls').toLowerCase(),
  TELXIO_EXTENSIONS_FALLBACK: process.env.TELXIO_EXTENSIONS_FALLBACK || '1033201,1033202,1033203,1033204,1033205,1033206,1033207,1033208,1033209,1033210,1033211',
  TELXIO_NUMBERS_FALLBACK: process.env.TELXIO_NUMBERS_FALLBACK || '13236595567,13236931150,16822431118,442046000568,442080683948',
  TELXIO_PLAN_FALLBACK: process.env.TELXIO_PLAN_FALLBACK || '10332',
};
