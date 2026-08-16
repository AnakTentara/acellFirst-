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

// 1. Initialize SQLite Database (Prioritizes built-in node:sqlite for 100% ARM64/Linux/Windows compatibility without C++ bindings)
async function getDbConnection() {
  if (db) return db;

  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(config.dbPath);
    isNodeSqlite = true;
    console.log('✅ Using Node.js native built-in SQLite (Zero C++ binding dependencies, ARM64 & Linux ready)');
    return db;
  } catch (err) {
    console.log('ℹ️ Falling back to sqlite3 npm package...');
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

  // Execute table creations
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
      attachments_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      notes TEXT,
      buyer_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS love_letters (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      music_url TEXT,
      theme_color TEXT DEFAULT '#ff6b9d',
      is_locked INTEGER DEFAULT 0,
      unlock_date DATETIME,
      is_opened INTEGER DEFAULT 0,
      opened_at DATETIME,
      reaction TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  await run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      config.boyNickname || 'My Boy 💙',
      'boy',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      pinHashHaikal,
      '💖 Lagi kangen kamu'
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
      config.girlNickname || 'My Girl 💖',
      'girl',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      pinHashAcell,
      '✨ Semangat hari ini!'
    ]);
  } else {
    // Ensure display_name is updated to Acell
    await run(`UPDATE users SET display_name = 'Acell', username = 'acell' WHERE role = 'girl'`);
  }

  // Seed sample initial emails & receipts if database is fresh
  const emailCount = await getOne(`SELECT COUNT(*) as count FROM emails`);
  if (emailCount && emailCount.count === 0) {
    const welcomeMailId = 'mail_welcome_001';
    await run(`
      INSERT INTO emails (id, message_id, from_address, from_name, to_address, alias_name, subject, text_body, html_body, category, is_read_by_boy, is_read_by_girl, is_starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
    `, [
      welcomeMailId,
      'welcome_msg_001',
      'system@sanctuary.acell',
      'Acell & Haikal Sanctuary',
      `love@${config.activeDomain}`,
      'love',
      'Selamat Datang di Rumah Digital Kita Berdua! 💖✨',
      'Halo Acell & Haikal! Ini adalah email pertama di ekosistem privat kita. Semua email belanja, surat rahasia, dan momen indah kita tersimpan aman di sini.',
      `<div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">
        <h2 style="color: #ff5c8a;">Selamat Datang di Rumah Digital Kita Berdua! 💖</h2>
        <p>Hai <b>Acell</b> & <b>Haikal</b>,</p>
        <p>Sekarang kita sudah punya email privat sendiri untuk belanja bareng di Shopee, Tokopedia, TikTok Shop, dan kirim surat cinta tanpa gangguan siapa pun!</p>
        <div style="background: #fff0f5; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #ffd1dc;">
          <p style="margin: 0; color: #d63384; font-weight: bold;">✨ Alamat Email Kita yang Bisa Dipakai:</p>
          <ul style="margin-top: 8px; margin-bottom: 0;">
            <li><code>shopping@${config.activeDomain}</code> (Khusus Belanja & Resi Paket)</li>
            <li><code>love@${config.activeDomain}</code> (Surat Cinta & Kejutan)</li>
            <li><code>acell@${config.activeDomain}</code> (Khusus Acell Cantik)</li>
            <li><code>haikal@${config.activeDomain}</code> (Khusus Haikal)</li>
          </ul>
        </div>
        <p>I love you to the moon and back! 🌙✨</p>
      </div>`,
      'love'
    ]);

    // Sample Shopee Receipt
    const shopeeMailId = 'mail_shopee_002';
    await run(`
      INSERT INTO emails (id, message_id, from_address, from_name, to_address, alias_name, subject, text_body, html_body, category, is_read_by_boy, is_read_by_girl, is_starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1)
    `, [
      shopeeMailId,
      'shopee_order_9981',
      'order@shopee.co.id',
      'Shopee Indonesia',
      `shopping@${config.activeDomain}`,
      'shopping',
      'Pesanan #260816SHP Telah Dikirim! [Skincare & Cute Tumbler]',
      'Pesanan Shopee Anda #260816SHP dengan kurir SPX Express (SPXID048192841) sedang dalam perjalanan menuju alamat tujuan.',
      `<div style="font-family: sans-serif; padding: 20px; background: #fff;">
        <h3 style="color: #ee4d2d;">Pesanan Shopee Anda Sedang Dikirim! 🚚</h3>
        <p>Halo Acell! Paket belanjaanmu sedang dalam perjalanan.</p>
        <p><b>Nomor Pesanan:</b> #260816SHP<br/><b>Kurir:</b> SPX Express Standard<br/><b>Nomor Resi:</b> SPXID048192841</p>
        <p><b>Produk:</b> Korean Aesthetic Thermal Tumbler (Pink Pastel) + Skincare Glow Set</p>
        <p><b>Total Pembayaran:</b> Rp 245.000 (Lunas)</p>
      </div>`,
      'shopping'
    ]);

    // Insert shopping item record
    await run(`
      INSERT INTO shopping_items (id, email_id, platform, order_id, tracking_number, courier, item_title, item_image, total_price, currency, status, estimated_delivery, notes, buyer_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'shop_item_001',
      shopeeMailId,
      'Shopee',
      '#260816SHP',
      'SPXID048192841',
      'SPX Express',
      'Korean Aesthetic Thermal Tumbler (Pink Pastel) + Skincare Set',
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
      245000,
      'IDR',
      'shipping',
      'Besok Sore (Estimasi 17 Ags)',
      'Kado lucu buat Acell biar rajin minum air ✨',
      'Acell & Haikal'
    ]);

    // Sample Love Letter
    await run(`
      INSERT INTO love_letters (id, author_id, recipient_id, title, content, music_url, theme_color, is_locked, unlock_date, is_opened)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'letter_001',
      'user_haikal',
      'user_acell',
      'Untuk Pacar Cantikku, Acell 🌸',
      'Hai sayang! Makasih ya udah selalu ada dan bikin hari-hariku jauh lebih cerah dan bahagia. Web & ekosistem ini kubuat khusus buat kita berdua biar kita punya tempat privat yang aesthetic. Semoga kamu suka ya! Love you so much 💖',
      'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      '#ff6b9d',
      0,
      null,
      0
    ]);

    // Sample Wishlist
    await run(`
      INSERT INTO wishlist_items (id, title, price, url, image_url, category, priority, added_by, is_bought, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'wish_001',
      'Instax Mini LiPlay Hybrid Camera (Blush Pink)',
      2199000,
      'https://shopee.co.id',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80',
      'Gadget & Hobi',
      'high',
      'user_acell',
      0,
      'Biar bisa cetak foto-foto date kita langsung! 📸'
    ]);
  }

  console.log('✅ Database tables and seed data initialized successfully!');
};
