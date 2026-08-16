import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { broadcastEvent } from '../services/pushService.js';

export const authRouter = express.Router();

// Get list of profiles (Haikal & Acel)
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

// Login with PIN
authRouter.post('/login', async (req, res) => {
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

// Update mood, battery or nickname
authRouter.patch('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { mood, batteryLevel, nickname, avatar, pin } = req.body;

    const user = await getOne(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    let pinHash = user.pin_hash;
    if (pin && pin.length >= 4) {
      pinHash = await bcrypt.hash(pin, 10);
    }

    await run(`
      UPDATE users SET 
        mood = COALESCE(?, mood),
        battery_level = COALESCE(?, battery_level),
        nickname = COALESCE(?, nickname),
        avatar = COALESCE(?, avatar),
        pin_hash = ?,
        last_active = datetime('now')
      WHERE id = ?
    `, [
      mood !== undefined ? mood : null,
      batteryLevel !== undefined ? batteryLevel : null,
      nickname !== undefined ? nickname : null,
      avatar !== undefined ? avatar : null,
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
