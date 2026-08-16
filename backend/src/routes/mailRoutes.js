import express from 'express';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { processInboundEmail, sendOutboundEmail } from '../services/mailService.js';
import { broadcastEvent } from '../services/pushService.js';

export const mailRouter = express.Router();

// 1. Cloudflare Inbound Webhook
mailRouter.post('/inbound', async (req, res) => {
  try {
    const webhookSecret = req.headers['x-webhook-secret'];
    if (config.webhookSecret && webhookSecret && webhookSecret !== config.webhookSecret) {
      console.warn('⚠️ Webhook secret mismatch from inbound request');
    }

    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Payload email kosong' });
    }

    const result = await processInboundEmail(payload);
    res.json({ success: true, message: 'Email berhasil diproses', ...result });
  } catch (err) {
    console.error('❌ Error in /api/mail/inbound:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Mail List with search & filters
mailRouter.get('/inbox', async (req, res) => {
  try {
    const { category, alias, search, starred, userRole } = req.query;
    let sql = `SELECT * FROM emails WHERE is_archived = 0`;
    const params = [];

    if (category && category !== 'all') {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (alias && alias !== 'all') {
      sql += ` AND alias_name = ?`;
      params.push(alias.toLowerCase());
    }

    if (starred === 'true') {
      sql += ` AND is_starred = 1`;
    }

    if (search) {
      sql += ` AND (subject LIKE ? OR text_body LIKE ? OR from_name LIKE ? OR from_address LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const emails = await query(sql, params);

    // Calculate unread counts
    const unreadShopping = await getOne(`SELECT COUNT(*) as count FROM emails WHERE category = 'shopping' AND (is_read_by_boy = 0 OR is_read_by_girl = 0)`);
    const unreadLove = await getOne(`SELECT COUNT(*) as count FROM emails WHERE category = 'love' AND (is_read_by_boy = 0 OR is_read_by_girl = 0)`);
    const totalCount = await getOne(`SELECT COUNT(*) as count FROM emails WHERE is_archived = 0`);

    res.json({
      success: true,
      emails,
      stats: {
        total: totalCount?.count || 0,
        unreadShopping: unreadShopping?.count || 0,
        unreadLove: unreadLove?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Single Email
mailRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const email = await getOne(`SELECT * FROM emails WHERE id = ?`, [id]);
    if (!email) {
      return res.status(404).json({ error: 'Email tidak ditemukan' });
    }

    // Attach shopping item if available
    const shoppingItem = await getOne(`SELECT * FROM shopping_items WHERE email_id = ?`, [id]);

    res.json({ success: true, email, shoppingItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Mark Read
mailRouter.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'boy' or 'girl'

    if (role === 'boy') {
      await run(`UPDATE emails SET is_read_by_boy = 1 WHERE id = ?`, [id]);
    } else if (role === 'girl') {
      await run(`UPDATE emails SET is_read_by_girl = 1 WHERE id = ?`, [id]);
    } else {
      await run(`UPDATE emails SET is_read_by_boy = 1, is_read_by_girl = 1 WHERE id = ?`, [id]);
    }

    broadcastEvent('mail_read_update', { id, role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Toggle Star
mailRouter.patch('/:id/star', async (req, res) => {
  try {
    const { id } = req.params;
    const email = await getOne(`SELECT is_starred FROM emails WHERE id = ?`, [id]);
    if (!email) return res.status(404).json({ error: 'Email tidak ditemukan' });

    const newStarred = email.is_starred === 1 ? 0 : 1;
    await run(`UPDATE emails SET is_starred = ? WHERE id = ?`, [newStarred, id]);

    res.json({ success: true, isStarred: newStarred === 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete / Archive Email
mailRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`UPDATE emails SET is_archived = 1 WHERE id = ?`, [id]);
    broadcastEvent('mail_deleted', { id });
    res.json({ success: true, message: 'Email dipindahkan ke arsip' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Send Outbound Mail
mailRouter.post('/send', async (req, res) => {
  try {
    const { fromAlias, to, subject, html, text, fromName } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Penerima dan subjek wajib diisi' });
    }

    const result = await sendOutboundEmail({ fromAlias, to, subject, html, text, fromName });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Simulator for Testing (Shopee, Tokped, TikTok, Love Letter)
mailRouter.post('/simulate-test', async (req, res) => {
  try {
    const { type } = req.body; // 'shopee', 'tokopedia', 'tiktok', 'love_letter'
    const domain = config.activeDomain;

    let payload = {};
    if (type === 'shopee') {
      const orderId = `SPX${Math.floor(100000000 + Math.random() * 900000000)}`;
      payload = {
        from: 'order@shopee.co.id',
        fromName: 'Shopee Indonesia',
        to: `shopping@${domain}`,
        subject: `Pesanan #${orderId} Sedang Dikirim! [Cute Pink Aesthetic Desk Mat & Mug]`,
        text: `Pesanan Shopee Anda #${orderId} telah dikirim dengan kurir SPX Express (Nomor Resi: ${orderId}). Total Pembayaran: Rp 185.000. Paket sedang menuju ke alamat Acel & Haikal Sanctuary.`,
        html: `<div style="font-family: sans-serif; padding: 20px; border-left: 4px solid #ee4d2d; background: #fff;">
          <h3 style="color: #ee4d2d;">Pesanan Shopee Anda Sedang Dikirim! 📦</h3>
          <p>Halo Acel & Haikal! Paket belanjaan kesayangan kalian sedang dalam perjalanan.</p>
          <p><b>Nomor Pesanan:</b> #${orderId}<br/><b>Kurir:</b> SPX Express Standard<br/><b>Resi:</b> ${orderId}</p>
          <p><b>Item:</b> Cute Pink Aesthetic Desk Mat + Ceramic Couple Mug</p>
          <p><b>Total Pembayaran:</b> Rp 185.000 (Lunas)</p>
        </div>`
      };
    } else if (type === 'tokopedia') {
      const invNum = `INV/20260816/XXI/${Math.floor(100000 + Math.random() * 900000)}`;
      payload = {
        from: 'no-reply@tokopedia.com',
        fromName: 'Tokopedia Care',
        to: `shopping@${domain}`,
        subject: `Pembayaran Berhasil untuk ${invNum} [Mechanical Keyboard Cute Pastels]`,
        text: `Pembayaran untuk transaksi ${invNum} di Tokopedia berhasil. Kurir: SiCepat (Resi: 004819284192). Total Pembayaran: Rp 550.000.`,
        html: `<div style="font-family: sans-serif; padding: 20px; border-left: 4px solid #03ac0e; background: #fff;">
          <h3 style="color: #03ac0e;">Pembayaran Terverifikasi! 🛍️</h3>
          <p><b>Invoice:</b> ${invNum}</p>
          <p><b>Barang:</b> Mechanical Keyboard Cute Pastels Custom Sound</p>
          <p><b>Kurir:</b> SiCepat Express (004819284192)</p>
          <p><b>Total:</b> Rp 550.000</p>
        </div>`
      };
    } else if (type === 'tiktok') {
      payload = {
        from: 'order-update@tiktokshop.com',
        fromName: 'TikTok Shop ID',
        to: `shopping@${domain}`,
        subject: `Paket TikTok Shop Kamu Sedang Dikirim! [Matcha Latte Premium Powder & Snack]`,
        text: `Pesanan TikTok Shop Anda telah diserahkan ke kurir J&T Express (Resi: JX9827361928). Total Belanja: Rp 120.000.`,
        html: `<div style="font-family: sans-serif; padding: 20px; border-left: 4px solid #fe2c55; background: #fff;">
          <h3 style="color: #fe2c55;">TikTok Shop - Paket Dikirim 🎶</h3>
          <p>Pesanan matcha dan snack kesukaan kalian sedang menuju alamatmu!</p>
          <p><b>Resi:</b> JX9827361928 (J&T Express)</p>
          <p><b>Total:</b> Rp 120.000</p>
        </div>`
      };
    } else {
      payload = {
        from: `haikal@${domain}`,
        fromName: 'Haikal (My Boy 💙)',
        to: `love@${domain}`,
        subject: 'Cuma mau bilang, I love you so much today! 🌸💖',
        text: 'Jangan lupa senyum dan makan yang teratur ya sayang! Nanti malem kita telfonan yaa 🥰',
        html: `<div style="font-family: sans-serif; padding: 24px; background: #fff0f5; border-radius: 16px; color: #444;">
          <h3 style="color: #d63384;">Cuma mau bilang... 💖</h3>
          <p>Hai Acel cantik! Makasih udah selalu jadi orang yang paling bikin aku semangat setiap hari.</p>
          <p>Semoga harimu menyenangkan dan jangan lupa istirahat ya! Love you always! ✨</p>
        </div>`
      };
    }

    const result = await processInboundEmail(payload);
    res.json({ success: true, message: `Berhasil simulasi email ${type}`, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
