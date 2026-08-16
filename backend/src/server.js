import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDatabase, getOne } from './db.js';
import { authRouter } from './routes/authRoutes.js';
import { mailRouter } from './routes/mailRoutes.js';
import { shoppingRouter } from './routes/shoppingRoutes.js';
import { loveRouter } from './routes/loveRoutes.js';
import { wishlistRouter } from './routes/wishlistRoutes.js';
import { systemRouter } from './routes/systemRoutes.js';
import { addressRouter } from './routes/addressRoutes.js';
import { requireAuth, rateLimit } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1); // behind Cloudflare / Pterodactyl proxy

// CORS: the SPA is served by this same server, so same-origin is the default.
// Extra origins (e.g. the Flutter app in dev) come from CORS_ORIGINS.
app.use(cors({
  origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
  credentials: true
}));

// Keep the raw body so the webhook can verify an HMAC signature.
app.use(express.json({
  limit: '25mb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Global throttle — generous for a 2-person app, but stops flooding.
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

// Uploaded avatars. nosniff + a restrictive CSP so a file that somehow slips
// through validation still cannot execute as a page.
app.use('/uploads', express.static(config.uploadsPath, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");
    res.setHeader('Content-Disposition', 'inline');
  }
}));

// API Routes.
// authRouter and mailRouter guard themselves per-endpoint because a few of
// their routes are intentionally public (login, profile list, CF webhook).
app.use('/api/auth', authRouter);
app.use('/api/mail', mailRouter);
app.use('/api/system', systemRouter);

// Everything below holds private couple data — locked wholesale.
app.use('/api/shopping', requireAuth, shoppingRouter);
app.use('/api/love', requireAuth, loveRouter);
app.use('/api/wishlist', requireAuth, wishlistRouter);
app.use('/api/addresses', requireAuth, addressRouter);

// Serve Frontend SPA if built
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Acel & Haikal Sanctuary API',
      status: 'online',
      activeDomain: config.activeDomain,
      version: '1.0.0',
      description: 'Private couple email, shopping tracker, and ecosystem backend.'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();

    // Check if domain is stored in DB
    const domainSetting = await getOne(`SELECT value FROM system_settings WHERE key = 'active_domain'`);
    if (domainSetting && domainSetting.value) {
      config.activeDomain = domainSetting.value;
    }

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`
  ✨ ======================================================== ✨
     💑 ACEL & HAIKAL SANCTUARY - COUPLE ECOSYSTEM SERVER
  ✨ ======================================================== ✨
     🚀 Server running on    : http://0.0.0.0:${config.port}
     🌐 Active Domain        : ${config.activeDomain}
     💌 Mail Webhook         : http://0.0.0.0:${config.port}/api/mail/inbound
     🛍️ Shopping Tracker     : Active (Shopee, Tokped, TikTok, etc.)
     🔒 Storage Database     : SQLite (${config.dbPath})
  ✨ ======================================================== ✨
      `);
    });

    return server;
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
