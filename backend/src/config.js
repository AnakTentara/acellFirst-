import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root or backend dir
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '23625', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'Senin23062025',
  webhookSecret: process.env.WEBHOOK_SECRET || 'Senin23062025',

  // Couple Names
  boyName: process.env.BOY_NAME || 'Haikal',
  boyNickname: process.env.BOY_NICKNAME || 'Prince 👑',
  girlName: process.env.GIRL_NAME || 'Acell',
  girlNickname: process.env.GIRL_NICKNAME || 'Princess 👑',
  anniversaryDate: process.env.ANNIVERSARY_DATE || '2025-06-23', // 23 Juni 2025

  // Dynamic Domain System
  activeDomain: process.env.ACTIVE_DOMAIN || 'acellimut.my.id',
  stagingDomain: process.env.STAGING_DOMAIN || 'acellimut.my.id',
  primaryDomain: process.env.PRIMARY_DOMAIN || 'acellimut.my.id',
  
  // Custom Aliases (us, etall, acell, shopping)
  allowedAliases: [
    'us',
    'shopping',
    'etall',
    'acell'
  ],

  // Storage paths
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../data/couple.db'),
  uploadsPath: process.env.UPLOADS_PATH || path.resolve(__dirname, '../data/uploads'),

  // Push Notification / Webhook dispatch
  pushWebhookUrl: process.env.PUSH_WEBHOOK_URL || '',
  oneSignalAppId: process.env.ONESIGNAL_APP_ID || '',
  oneSignalApiKey: process.env.ONESIGNAL_API_KEY || '',

  // Outbound SMTP (Optional for replying/sending external email)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Acel & Haikal Sanctuary'
  }
};
