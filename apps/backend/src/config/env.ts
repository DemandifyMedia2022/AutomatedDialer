import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/automated_dialer',
  SIP_WSS_URL: process.env.SIP_WSS_URL || 'wss://pbx2.telxio.com.sg:8089/ws',
  SIP_DOMAIN: process.env.SIP_DOMAIN || 'pbx2.telxio.com.sg',
  STUN_SERVER: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:4000',
  RECORDINGS_DIR: process.env.RECORDINGS_DIR || 'uploads/recordings'
};
