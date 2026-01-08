import nodemailer from 'nodemailer'
import { env } from '../config/env'

const transport = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT || 465,
  secure: (env.MAIL_ENCRYPTION || 'ssl') === 'ssl',
  auth: {
    user: env.MAIL_USERNAME,
    pass: env.MAIL_PASSWORD,
  },
})

export async function sendMail(opts: { 
  to: string; 
  subject: string; 
  text?: string; 
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}) {
  const fromName = env.MAIL_FROM_NAME || 'App'
  const fromAddr = env.MAIL_FROM_ADDRESS || env.MAIL_USERNAME
  await transport.sendMail({
    from: `${fromName} <${fromAddr}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  })
}
