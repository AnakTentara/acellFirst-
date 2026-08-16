import express from 'express';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { registerSSEClient, broadcastEvent } from '../services/pushService.js';
import { requireAuth, decodeToken } from '../middleware/auth.js';

export const systemRouter = express.Router();

// 1. Get System & Domain Configuration
systemRouter.get('/config', requireAuth, async (req, res) => {
  try {
    // Check if domain override exists in DB
    const domainSetting = await getOne(`SELECT value FROM system_settings WHERE key = 'active_domain'`);
    const currentActiveDomain = domainSetting?.value || config.activeDomain;

    const emailStats = await getOne(`SELECT COUNT(*) as count FROM emails WHERE is_archived = 0`);
    const shoppingStats = await getOne(`SELECT COUNT(*) as count FROM shopping_items`);
    const letterStats = await getOne(`SELECT COUNT(*) as count FROM love_letters`);
    const wishStats = await getOne(`SELECT COUNT(*) as count FROM wishlist_items`);

    res.json({
      success: true,
      config: {
        activeDomain: currentActiveDomain,
        stagingDomain: config.stagingDomain,
        primaryDomain: config.primaryDomain,
        boyName: config.boyName,
        girlName: config.girlName,
        boyNickname: config.boyNickname,
        girlNickname: config.girlNickname,
        anniversaryDate: config.anniversaryDate,
        allowedAliases: config.allowedAliases,
        webhookUrl: `https://${currentActiveDomain}/api/mail/inbound`,
        // The secret itself is NEVER returned here — it used to be, to any
        // anonymous caller. Use GET /api/system/webhook-secret instead.
        hasWebhookSecret: Boolean(config.webhookSecret),
        hasCourierApiKey: Boolean(config.courier.apiKey),
        hasAiApiKey: Boolean(config.ai.apiKey)
      },
      stats: {
        emails: emailStats?.count || 0,
        shopping: shoppingStats?.count || 0,
        loveLetters: letterStats?.count || 0,
        wishlist: wishStats?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1b. Reveal the webhook secret to a logged-in owner only.
//     Needed when configuring the Cloudflare Email Worker.
systemRouter.get('/webhook-secret', requireAuth, (req, res) => {
  res.json({
    success: true,
    webhookSecret: config.webhookSecret,
    header: 'x-webhook-secret',
    note: 'Tempelkan nilai ini sebagai header x-webhook-secret di Cloudflare Email Worker.'
  });
});

// 2. Switch Active Domain (Instant without code change!)
systemRouter.post('/domain', requireAuth, async (req, res) => {
  try {
    const { newDomain } = req.body;
    if (!newDomain) {
      return res.status(400).json({ error: 'Domain baru tidak boleh kosong' });
    }

    const cleanDomain = newDomain.trim().toLowerCase();

    // Reject anything that isn't a plain hostname — this value gets
    // interpolated into URLs and email addresses.
    if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(cleanDomain)) {
      return res.status(400).json({ error: 'Format domain tidak valid.' });
    }

    await run(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('active_domain', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `, [cleanDomain]);

    config.activeDomain = cleanDomain;

    broadcastEvent('domain_switch', { activeDomain: cleanDomain });

    res.json({
      success: true,
      message: `Domain aktif berhasil diubah menjadi: ${cleanDomain}`,
      activeDomain: cleanDomain,
      newAliases: config.allowedAliases.map(a => `${a}@${cleanDomain}`)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Generate Cloudflare DNS Records Guide
systemRouter.get('/dns-guide', requireAuth, async (req, res) => {
  try {
    const domainSetting = await getOne(`SELECT value FROM system_settings WHERE key = 'active_domain'`);
    const domain = domainSetting?.value || config.activeDomain;

    const dnsRecords = [
      {
        type: 'MX',
        name: '@ (atau root domain)',
        content: 'route1.mx.cloudflare.net',
        priority: 45,
        purpose: 'Cloudflare Email Routing (Wajib)'
      },
      {
        type: 'MX',
        name: '@',
        content: 'route2.mx.cloudflare.net',
        priority: 78,
        purpose: 'Cloudflare Email Routing Backup'
      },
      {
        type: 'MX',
        name: '@',
        content: 'route3.mx.cloudflare.net',
        priority: 99,
        purpose: 'Cloudflare Email Routing Backup'
      },
      {
        type: 'TXT',
        name: '@',
        content: 'v=spf1 include:_spf.mx.cloudflare.net ~all',
        purpose: 'SPF Record Keamanan Email'
      }
    ];

    res.json({
      success: true,
      domain,
      dnsRecords,
      webhookEndpoint: `https://${domain}/api/mail/inbound`,
      sampleAliases: [
        `us@${domain}`,
        `shopping@${domain}`,
        `etall@${domain}`,
        `acell@${domain}`
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Real-time Server-Sent Events (SSE) stream.
//    EventSource cannot set headers, so the token arrives as ?token=...
systemRouter.get('/events', (req, res) => {
  const user = decodeToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Sesi tidak valid untuk stream real-time.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // don't let nginx buffer the stream
  res.flushHeaders();

  // Send initial connection packet
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  // Heartbeat: without this, Cloudflare/nginx silently drop an idle stream
  // after ~60s and "Live" quietly stops being live.
  const heartbeat = setInterval(() => {
    try { res.write(`: keepalive\n\n`); } catch { clearInterval(heartbeat); }
  }, 25_000);

  const stop = () => clearInterval(heartbeat);
  req.on('close', stop);
  req.on('error', stop);

  registerSSEClient(res);
});

// 5. Health Check
systemRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeDomain: config.activeDomain
  });
});
