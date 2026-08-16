import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

// Ensure data and uploads folder exist
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(config.uploadsPath)) {
  fs.mkdirSync(config.uploadsPath, { recursive: true });
}

let db = null;
let isNodeSqlite = false;

// 1. Initialize SQLite Database (Node 22 native built-in node:sqlite)
async function getDbConnection() {
  if (db) return db;

  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(config.dbPath);
    isNodeSqlite = true;
    return db;
  } catch (err) {
    try {
      const sqlite3Pkg = await import('sqlite3');
      const sqlite3 = sqlite3Pkg.default || sqlite3Pkg;
      db = new sqlite3.Database(config.dbPath);
      isNodeSqlite = false;
      return db;
    } catch (err2) {
      console.error('❌ Could not load SQLite driver:', err2.message);
      throw err2;
    }
  }
}

export const query = async (sql, params = []) => {
  const connection = await getDbConnection();
  if (isNodeSqlite) {
    const stmt = connection.prepare(sql);
    return stmt.all(...params);
  } else {
    return new Promise((resolve, reject) => {
      connection.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
};

export const getOne = async (sql, params = []) => {
  const connection = await getDbConnection();
  if (isNodeSqlite) {
    const stmt = connection.prepare(sql);
    return stmt.get(...params);
  } else {
    return new Promise((resolve, reject) => {
      connection.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
};

export const run = async (sql, params = []) => {
  const connection = await getDbConnection();
  if (isNodeSqlite) {
    const stmt = connection.prepare(sql);
    const result = stmt.run(...params);
    return { lastID: result.lastInsertRowid, changes: result.changes };
  } else {
    return new Promise((resolve, reject) => {
      connection.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

export const initDatabase = async () => {
  await getDbConnection();

  // 1. Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT,
      pin_hash TEXT NOT NULL,
      mood TEXT DEFAULT '🥰 Bahagia',
      battery_level INTEGER DEFAULT 100,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Emails Table
  await run(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      from_address TEXT NOT NULL,
      from_name TEXT,
      to_address TEXT NOT NULL,
      alias_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      text_body TEXT,
      html_body TEXT,
      category TEXT DEFAULT 'general',
      is_read_by_boy INTEGER DEFAULT 0,
      is_read_by_girl INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      is_outbound INTEGER DEFAULT 0,
      is_draft INTEGER DEFAULT 0,
      attachments_json TEXT DEFAULT '[]',
      ai_summary TEXT,
      ai_sentiment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrations for existing DB files
  try { await run(`ALTER TABLE emails ADD COLUMN is_outbound INTEGER DEFAULT 0`); } catch (e) {}
  try { await run(`ALTER TABLE emails ADD COLUMN is_draft INTEGER DEFAULT 0`); } catch (e) {}
  try { await run(`ALTER TABLE emails ADD COLUMN ai_summary TEXT`); } catch (e) {}
  try { await run(`ALTER TABLE emails ADD COLUMN ai_sentiment TEXT`); } catch (e) {}

  // 3. Shopping Items Table
  await run(`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      email_id TEXT,
      platform TEXT NOT NULL,
      order_id TEXT,
      tracking_number TEXT,
      courier TEXT,
      item_title TEXT NOT NULL,
      item_image TEXT,
      total_price REAL DEFAULT 0,
      currency TEXT DEFAULT 'IDR',
      status TEXT DEFAULT 'processing',
      estimated_delivery TEXT,
      origin_city TEXT,
      destination_city TEXT,
      timeline_json TEXT DEFAULT '[]',
      coordinates_json TEXT DEFAULT '{}',
      ai_summary TEXT,
      tracking_url TEXT,
      notes TEXT,
      buyer_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { await run(`ALTER TABLE shopping_items ADD COLUMN origin_city TEXT`); } catch (e) {}
  try { await run(`ALTER TABLE shopping_items ADD COLUMN destination_city TEXT`); } catch (e) {}
  try { await run(`ALTER TABLE shopping_items ADD COLUMN timeline_json TEXT DEFAULT '[]'`); } catch (e) {}
  try { await run(`ALTER TABLE shopping_items ADD COLUMN coordinates_json TEXT DEFAULT '{}'`); } catch (e) {}
  try { await run(`ALTER TABLE shopping_items ADD COLUMN ai_summary TEXT`); } catch (e) {}
  try { await run(`ALTER TABLE shopping_items ADD COLUMN tracking_url TEXT`); } catch (e) {}

  // 4. Love Letters Table
  await run(`
    CREATE TABLE IF NOT EXISTS love_letters (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      music_url TEXT,
      theme_color TEXT DEFAULT '#2563eb',
      is_locked INTEGER DEFAULT 0,
      unlock_date DATETIME,
      is_opened INTEGER DEFAULT 0,
      opened_at DATETIME,
      reaction TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Wishlist Items Table
  await run(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price REAL DEFAULT 0,
      url TEXT,
      image_url TEXT,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'medium',
      added_by TEXT NOT NULL,
      is_bought INTEGER DEFAULT 0,
      bought_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. System Settings Table
  await run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Automatic Migration: Scrub old domains, update nicknames to Prince & Princess, and ensure active_domain = acellimut.my.id
  await run(`UPDATE system_settings SET value = 'acellimut.my.id' WHERE key = 'active_domain'`);
  await run(`UPDATE users SET display_name = 'Acell', username = 'acell', nickname = 'Princess 👑' WHERE role = 'girl'`);
  await run(`UPDATE users SET display_name = 'Haikal', username = 'haikal', nickname = 'Prince 👑' WHERE role = 'boy'`);

  // Seed default users if not exists
  const boyUser = await getOne(`SELECT * FROM users WHERE username = ?`, ['haikal']);
  if (!boyUser) {
    const pinHashHaikal = await bcrypt.hash('123456', 10);
    await run(`
      INSERT INTO users (id, username, display_name, nickname, role, avatar, pin_hash, mood)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'user_haikal',
      'haikal',
      config.boyName || 'Haikal',
      config.boyNickname || 'Prince 👑',
      'boy',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      pinHashHaikal,
      '💙 Lagi kangen kamu'
    ]);
  }

  const girlUser = await getOne(`SELECT * FROM users WHERE username = ? OR username = ?`, ['acell', 'acel']);
  if (!girlUser) {
    const pinHashAcell = await bcrypt.hash('123456', 10);
    await run(`
      INSERT INTO users (id, username, display_name, nickname, role, avatar, pin_hash, mood)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'user_acell',
      'acell',
      config.girlName || 'Acell',
      config.girlNickname || 'Princess 👑',
      'girl',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      pinHashAcell,
      '🌌 Semangat hari ini!'
    ]);
  }

  // Clean obsolete dummy records from earlier iterations
  await run(`DELETE FROM emails WHERE to_address LIKE '%haikaldev.my.id%' OR to_address LIKE '%acellimut.net%'`);
  await run(`DELETE FROM shopping_items WHERE tracking_number = 'SPXID048192841' OR item_title LIKE '%Korean Aesthetic Thermal Tumbler%'`);

  // Seed clean initial welcome mail if no emails exist
  const emailCount = await getOne(`SELECT COUNT(*) as count FROM emails`);
  if (emailCount && emailCount.count === 0) {
    const welcomeMailId = 'mail_welcome_001';
    await run(`
      INSERT INTO emails (id, message_id, from_address, from_name, to_address, alias_name, subject, text_body, html_body, category, is_read_by_boy, is_read_by_girl, is_starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
    `, [
      welcomeMailId,
      'welcome_msg_001',
      'system@acellimut.my.id',
      'Acell & Haikal Sanctuary',
      `us@acellimut.my.id`,
      'us',
      'Selamat Datang di Rumah Digital Acell & Haikal 🌌💙',
      'Halo Acell & Haikal! Selamat datang di ekosistem privat kita. Semua email belanja (Shopee, Tokopedia, TikTok Shop), surat rahasia, dan momen indah kita tersimpan aman di sini.',
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; background: #ffffff; color: #0f172a; line-height: 1.6; border-radius: 16px; border: 1px solid #dbeafe;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%); padding: 20px; border-radius: 12px; color: #fff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">🌌 Acell & Haikal Sanctuary</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">acellimut.my.id • Private Couple Ecosystem</p>
        </div>
        <p>Hai <b>Princess Acell</b> & <b>Prince Haikal</b>,</p>
        <p>Sekarang kita sudah punya email privat resmi dengan domain <b>acellimut.my.id</b> untuk belanja bersama dan berbagi momen romantis!</p>
        <div style="background: #eff6ff; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #bfdbfe;">
          <p style="margin: 0; color: #1e40af; font-weight: 700; font-size: 14px;">📬 4 Alamat Email Resmi Kita:</p>
          <ul style="margin-top: 8px; margin-bottom: 0; padding-left: 20px; font-size: 13px; color: #1e293b;">
            <li><code>us@acellimut.my.id</code> — Email bersama & Couple Inbox</li>
            <li><code>shopping@acellimut.my.id</code> — Khusus belanja (Shopee, Tokped, TikTok Shop)</li>
            <li><code>etall@acellimut.my.id</code> — Layanan & Tagihan bersama</li>
            <li><code>acell@acellimut.my.id</code> — Email pribadi Princess Acell</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #475569;">I love you to the stars and back! 🌌✨</p>
      </div>`,
      'love'
    ]);

    // Initial Love Letter
    await run(`
      INSERT INTO love_letters (id, author_id, recipient_id, title, content, music_url, theme_color, is_locked, unlock_date, is_opened)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'letter_001',
      'user_haikal',
      'user_acell',
      'Untuk Pacar Cantikku, Acell 🌌💙',
      'Hai sayang! Makasih ya udah selalu ada dan bikin hari-hariku jauh lebih cerah dan bahagia. Web & ekosistem ini kubuat khusus buat kita berdua biar kita punya tempat privat yang aesthetic. Semoga kamu suka ya! Love you so much 💙',
      'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      '#2563eb',
      0,
      null,
      0
    ]);
  }

  console.log('✅ Database initialized and synced with acellimut.my.id!');
};
