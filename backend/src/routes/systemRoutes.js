import express from 'express';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { registerSSEClient, broadcastEvent } from '../services/pushService.js';

export const systemRouter = express.Router();

// 1. Get System & Domain Configuration
systemRouter.get('/config', async (req, res) => {
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
        webhookSecret: config.webhookSecret
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

// 2. Switch Active Domain (Instant without code change!)
systemRouter.post('/domain', async (req, res) => {
  try {
    const { newDomain } = req.body;
    if (!newDomain) {
      return res.status(400).json({ error: 'Domain baru tidak boleh kosong' });
    }

    const cleanDomain = newDomain.trim().toLowerCase();

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
systemRouter.get('/dns-guide', async (req, res) => {
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

// 4. Real-time Server-Sent Events (SSE) stream
systemRouter.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connection packet
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

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
