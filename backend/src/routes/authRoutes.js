import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { broadcastEvent } from '../services/pushService.js';
import { requireAuth, requireSelf, rateLimit } from '../middleware/auth.js';

export const authRouter = express.Router();

// Only real raster images. The extension is derived from THIS map, never from
// user input — the old code took it straight from the data: URI, so
// `data:image/html;base64,...` was written as an executable .html file.
const ALLOWED_IMAGE_TYPES = {
  png: 'png',
  jpeg: 'jpg',
  jpg: 'jpg',
  webp: 'webp',
  gif: 'gif'
};
const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

// Magic-byte check so the declared MIME type cannot lie about the contents.
function sniffImage(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// 1. Get list of profiles (Haikal & Acell)
authRouter.get('/profiles', async (req, res) => {
  try {
    const users = await query(`
      SELECT id, username, display_name, nickname, role, avatar, mood, battery_level, last_active
      FROM users
    `);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Login with PIN — throttled to stop brute-forcing a 6-digit PIN
authRouter.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: 'Username dan PIN wajib diisi' });
    }

    const user = await getOne(`SELECT * FROM users WHERE username = ?`, [username.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ error: 'Profil tidak ditemukan' });
    }

    const isMatch = await bcrypt.compare(pin, user.pin_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'PIN salah' });
    }

    // Update last_active
    await run(`UPDATE users SET last_active = datetime('now') WHERE id = ?`, [user.id]);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        nickname: user.nickname,
        role: user.role,
        avatar: user.avatar,
        mood: user.mood,
        batteryLevel: user.battery_level
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update profile (Avatar upload, mood, battery, display name, nickname, PIN)
//    Locked to the authenticated owner — previously anyone could rewrite either
//    profile and reset the PIN without knowing the old one (account takeover).
authRouter.patch('/profile/:id', requireAuth, requireSelf('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { mood, batteryLevel, nickname, displayName, avatar, pin, currentPin } = req.body;

    const user = await getOne(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    let finalAvatar = user.avatar;
    if (avatar) {
      if (avatar.startsWith('data:image/')) {
        const matches = avatar.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: 'Format gambar tidak dikenali.' });
        }

        const declared = matches[1].toLowerCase();
        if (!ALLOWED_IMAGE_TYPES[declared]) {
          return res.status(400).json({
            error: 'Format avatar harus PNG, JPG, WEBP, atau GIF.'
          });
        }

        let buffer;
        try {
          buffer = Buffer.from(matches[2], 'base64');
        } catch {
          return res.status(400).json({ error: 'Data gambar rusak.' });
        }

        if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) {
          return res.status(413).json({ error: 'Ukuran avatar maksimal 3 MB.' });
        }

        // The bytes must actually BE the image they claim to be.
        const sniffed = sniffImage(buffer);
        if (!sniffed || sniffed !== ALLOWED_IMAGE_TYPES[declared]) {
          return res.status(400).json({
            error: 'Isi berkas tidak cocok dengan tipe gambar yang dinyatakan.'
          });
        }

        try {
          // Extension comes from our whitelist, and the basename is random —
          // no attacker-controlled path segment reaches the filesystem.
          const filename = `avatar_${crypto.randomUUID()}.${sniffed}`;
          const filepath = path.join(config.uploadsPath, filename);
          fs.writeFileSync(filepath, buffer);
          finalAvatar = `/uploads/${filename}`;

          // Remove the previous locally-stored avatar so uploads don't pile up.
          if (user.avatar && user.avatar.startsWith('/uploads/')) {
            const old = path.join(config.uploadsPath, path.basename(user.avatar));
            fs.promises.unlink(old).catch(() => {});
          }
        } catch (fileErr) {
          console.warn('⚠️ Error saving avatar:', fileErr.message);
          return res.status(500).json({ error: 'Gagal menyimpan avatar.' });
        }
      } else if (/^https?:\/\//i.test(avatar)) {
        finalAvatar = avatar;
      } else {
        return res.status(400).json({ error: 'URL avatar harus http(s) atau data:image.' });
      }
    }

    let pinHash = user.pin_hash;
    if (pin !== undefined && pin !== null && pin !== '') {
      if (!/^\d{6}$/.test(String(pin))) {
        return res.status(400).json({ error: 'PIN harus 6 digit angka.' });
      }
      // Changing a PIN now requires proving you know the current one.
      if (!currentPin || !(await bcrypt.compare(String(currentPin), user.pin_hash))) {
        return res.status(403).json({ error: 'PIN lama salah.' });
      }
      pinHash = await bcrypt.hash(String(pin), 10);
    }

    await run(`
      UPDATE users SET 
        mood = COALESCE(?, mood),
        battery_level = COALESCE(?, battery_level),
        display_name = COALESCE(?, display_name),
        nickname = COALESCE(?, nickname),
        avatar = ?,
        pin_hash = ?,
        last_active = datetime('now')
      WHERE id = ?
    `, [
      mood !== undefined ? mood : null,
      batteryLevel !== undefined ? batteryLevel : null,
      displayName !== undefined ? displayName : null,
      nickname !== undefined ? nickname : null,
      finalAvatar,
      pinHash,
      id
    ]);

    const updated = await getOne(`
      SELECT id, username, display_name, nickname, role, avatar, mood, battery_level, last_active
      FROM users WHERE id = ?
    `, [id]);

    broadcastEvent('profile_update', updated);

    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Validate the stored token on app boot, so a 30-day session can resume
//    without re-entering the PIN — but an expired/forged token is rejected.
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getOne(`
      SELECT id, username, display_name, nickname, role, avatar, mood, battery_level, last_active
      FROM users WHERE id = ?
    `, [req.user.userId]);

    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    await run(`UPDATE users SET last_active = datetime('now') WHERE id = ?`, [user.id]);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
