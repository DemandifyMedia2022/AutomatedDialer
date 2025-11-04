import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL ,
  SIP_WSS_URL: process.env.SIP_WSS_URL ,
  SIP_DOMAIN: process.env.SIP_DOMAIN ,
  STUN_SERVER: process.env.STUN_SERVER ,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ,
  RECORDINGS_DIR: process.env.RECORDINGS_DIR || 'uploads/recordings'
};
