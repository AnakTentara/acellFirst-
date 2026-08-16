import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { resolveSecrets } from './secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root or backend dir
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.resolve(__dirname, '../data');

// Never fall back to a secret that exists in source control — see secrets.js
const { jwtSecret, webhookSecret } = resolveSecrets(dataDir);

export const config = {
  port: parseInt(process.env.PORT || '23625', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret,
  webhookSecret,

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
    fromName: process.env.SMTP_FROM_NAME || 'Acell & Haikal Sanctuary'
  },

  // AI Email & Receipt Intelligence (OhhMyAgent / OpenAI / GPT-5.6)
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://ohhmyagent.com/v1',
    model: process.env.AI_MODEL || 'ohh/gpt-5.6',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '20000', 10)
  },

  // Real courier tracking aggregator (BinderByte / KiriminAja).
  // Without an API key the app falls back to an HONEST estimate that is
  // clearly labelled as such — it never fabricates checkpoints.
  courier: {
    provider: process.env.COURIER_PROVIDER || 'binderbyte',
    apiKey: process.env.COURIER_API_KEY || '',
    baseUrl: process.env.COURIER_BASE_URL || 'https://api.binderbyte.com/v1',
    timeoutMs: parseInt(process.env.COURIER_TIMEOUT_MS || '15000', 10)
  },

  // Comma-separated list of origins allowed to call the API.
  // Empty => same-origin only (the SPA is served by this very server).
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
};
