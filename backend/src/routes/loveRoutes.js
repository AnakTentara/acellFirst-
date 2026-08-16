import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { broadcastEvent, sendPushNotification } from '../services/pushService.js';

export const loveRouter = express.Router();

// 1. Get Love Letters
loveRouter.get('/letters', async (req, res) => {
  try {
    const letters = await query(`
      SELECT 
        l.id, l.author_id, l.recipient_id, l.title, l.music_url, l.theme_color,
        l.is_locked, l.unlock_date, l.is_opened, l.opened_at, l.reaction, l.created_at,
        u_author.display_name as author_name, u_author.avatar as author_avatar,
        u_rec.display_name as recipient_name,
        CASE 
          WHEN l.is_locked = 1 AND datetime(l.unlock_date) > datetime('now') THEN '[Surat Terkunci di Kapsul Waktu ⏳]'
          ELSE l.content
        END as content,
        CASE
          WHEN l.is_locked = 1 AND datetime(l.unlock_date) > datetime('now') THEN 1
          ELSE 0
        END as is_currently_locked
      FROM love_letters l
      JOIN users u_author ON l.author_id = u_author.id
      JOIN users u_rec ON l.recipient_id = u_rec.id
      ORDER BY l.created_at DESC
    `);

    res.json({ success: true, letters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Send / Create Love Letter or Time Capsule
loveRouter.post('/letters', async (req, res) => {
  try {
    const { authorId, recipientId, title, content, musicUrl, themeColor, isLocked, unlockDate } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi surat wajib diisi' });
    }

    const id = `letter_${Date.now()}_${uuidv4().slice(0, 6)}`;
    const lockVal = isLocked ? 1 : 0;

    await run(`
      INSERT INTO love_letters (
        id, author_id, recipient_id, title, content, music_url,
        theme_color, is_locked, unlock_date, is_opened, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `, [
      id,
      authorId || 'user_haikal',
      recipientId || 'user_acel',
      title,
      content,
      musicUrl || null,
      themeColor || '#ff6b9d',
      lockVal,
      isLocked && unlockDate ? unlockDate : null
    ]);

    const author = await getOne(`SELECT display_name FROM users WHERE id = ?`, [authorId || 'user_haikal']);

    // Send push notification
    if (lockVal === 1) {
      await sendPushNotification({
        title: `⏳ Kapsul Waktu Baru Disimpan!`,
        body: `${author?.display_name || 'Pasanganmu'} mengunci surat baru yang akan terbuka nanti 🎁`,
        data: { type: 'time_capsule', id }
      });
    } else {
      await sendPushNotification({
        title: `💌 Surat Cinta Baru dari ${author?.display_name || 'Pasanganmu'}!`,
        body: `"${title}" 💖 Buka sekarang yuk!`,
        data: { type: 'love_letter', id }
      });
    }

    const created = await getOne(`SELECT * FROM love_letters WHERE id = ?`, [id]);
    broadcastEvent('new_love_letter', created);

    res.json({ success: true, letter: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Open Letter & Add Reaction
loveRouter.post('/letters/:id/open', async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;

    const letter = await getOne(`SELECT * FROM love_letters WHERE id = ?`, [id]);
    if (!letter) {
      return res.status(404).json({ error: 'Surat tidak ditemukan' });
    }

    // Check if still locked
    if (letter.is_locked === 1 && letter.unlock_date && new Date(letter.unlock_date) > new Date()) {
      return res.status(403).json({ error: 'Surat ini masih terkunci di dalam kapsul waktu ⏳' });
    }

    await run(`
      UPDATE love_letters SET 
        is_opened = 1,
        opened_at = COALESCE(opened_at, datetime('now')),
        reaction = COALESCE(?, reaction)
      WHERE id = ?
    `, [reaction || '💖', id]);

    const updated = await getOne(`SELECT * FROM love_letters WHERE id = ?`, [id]);
    broadcastEvent('letter_opened', updated);

    res.json({ success: true, letter: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Anniversary & Couple Counter
loveRouter.get('/counter', async (req, res) => {
  try {
    const annivStr = config.anniversaryDate; // e.g. '2023-10-14'
    const start = new Date(annivStr);
    const now = new Date();

    const diffTime = Math.abs(now.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalHours = Math.floor(diffTime / (1000 * 60 * 60));
    const totalMinutes = Math.floor(diffTime / (1000 * 60));

    res.json({
      success: true,
      anniversaryDate: annivStr,
      totalDays,
      totalHours,
      totalMinutes,
      togetherString: `${totalDays} Hari Bersama 💕`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
