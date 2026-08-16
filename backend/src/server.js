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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads folder
app.use('/uploads', express.static(config.uploadsPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/mail', mailRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api/love', loveRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/system', systemRouter);
app.use('/api/addresses', addressRouter);

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
