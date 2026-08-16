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

/**
 * Add a column only if it is genuinely missing.
 *
 * The old code wrapped every ALTER in `try {} catch (e) {}`, which silently
 * swallowed real migration failures (disk full, locked db, bad SQL) exactly
 * the same way it swallowed the expected "duplicate column" error.
 */
async function addColumn(table, column, definition) {
  const existing = await query(`PRAGMA table_info(${table})`);
  if (existing.some((c) => c.name === column)) return false;

  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`🔧 Migrasi: kolom ${table}.${column} ditambahkan.`);
    return true;
  } catch (err) {
    console.error(`❌ Migrasi GAGAL untuk ${table}.${column}: ${err.message}`);
    throw err;
  }
}

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
      is_trash INTEGER DEFAULT 0,
      is_spam INTEGER DEFAULT 0,
      ai_tags_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrations for existing DB files
  await addColumn('emails', 'is_outbound', 'INTEGER DEFAULT 0');
  await addColumn('emails', 'is_draft', 'INTEGER DEFAULT 0');
  await addColumn('emails', 'ai_summary', 'TEXT');
  await addColumn('emails', 'ai_sentiment', 'TEXT');
  await addColumn('emails', 'is_trash', 'INTEGER DEFAULT 0');
  await addColumn('emails', 'is_spam', 'INTEGER DEFAULT 0');
  await addColumn('emails', 'ai_tags_json', `TEXT DEFAULT '[]'`);

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

  await addColumn('shopping_items', 'origin_city', `TEXT`);
  await addColumn('shopping_items', 'destination_city', `TEXT`);
  await addColumn('shopping_items', 'timeline_json', `TEXT DEFAULT '[]'`);
  await addColumn('shopping_items', 'coordinates_json', `TEXT DEFAULT '{}'`);
  await addColumn('shopping_items', 'ai_summary', `TEXT`);
  await addColumn('shopping_items', 'tracking_url', `TEXT`);
  // Honesty flags: is this real courier data, or an admitted estimate?
  await addColumn('shopping_items', 'is_estimate', `INTEGER DEFAULT 1`);
  await addColumn('shopping_items', 'tracking_source', `TEXT DEFAULT 'local'`);
  await addColumn('shopping_items', 'last_synced_at', `TEXT`);
  await addColumn('shopping_items', 'address_id', `TEXT`);

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

  // 7. Couple Addresses Table
  await run(`
    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      label TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      phone_number TEXT,
      full_address TEXT NOT NULL,
      city TEXT NOT NULL,
      latitude REAL DEFAULT -6.9175,
      longitude REAL DEFAULT 107.6191,
      is_primary INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes. The schema previously had ZERO — every folder switch, stat
  // count, and resi lookup was a full table scan.
  const indexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id) WHERE message_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_emails_created ON emails(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(is_trash, is_spam, is_archived, is_outbound)`,
    `CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category)`,
    `CREATE INDEX IF NOT EXISTS idx_emails_alias ON emails(alias_name)`,
    `CREATE INDEX IF NOT EXISTS idx_shopping_tracking ON shopping_items(tracking_number)`,
    `CREATE INDEX IF NOT EXISTS idx_shopping_status ON shopping_items(status)`,
    `CREATE INDEX IF NOT EXISTS idx_shopping_email ON shopping_items(email_id)`,
    `CREATE INDEX IF NOT EXISTS idx_letters_recipient ON love_letters(recipient_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_wishlist_bought ON wishlist_items(is_bought)`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_primary ON addresses(is_primary)`
  ];

  for (const sql of indexes) {
    try {
      await run(sql);
    } catch (err) {
      // A pre-existing duplicate message_id would block the UNIQUE index.
      // Report it rather than hiding it — but don't block startup.
      console.warn(`⚠️ Index dilewati: ${err.message}`);
    }
  }

  // Seed 2 default couple addresses if empty
  const addressCount = await getOne(`SELECT COUNT(*) as count FROM addresses`);
  if (addressCount && addressCount.count === 0) {
    await run(`
      INSERT INTO addresses (id, label, recipient_name, phone_number, full_address, city, latitude, longitude, is_primary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'addr_bandung',
      'Sanctuary Utama Bandung 🏠',
      'Princess Acell & Prince Haikal',
      '0812-2306-2025',
      'Jl. Ir. H. Juanda (Dago) No. 23, Coblong, Kota Bandung, Jawa Barat 40135',
      'Bandung',
      -6.9175,
      107.6191,
      1,
      'Alamat Utama Pengiriman Sanctuary Acell & Haikal'
    ]);

    await run(`
      INSERT INTO addresses (id, label, recipient_name, phone_number, full_address, city, latitude, longitude, is_primary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'addr_jakarta',
      'Sanctuary Kedua Jakarta 🏢',
      'Prince Haikal & Princess Acell',
      '0812-2306-2025',
      'Jl. Jend. Sudirman Kav. 52-53, Senayan, Kebayoran Baru, Jakarta Selatan 12190',
      'Jakarta Selatan',
      -6.2088,
      106.8456,
      0,
      'Alamat Alternatif Rumah Prince Haikal'
    ]);
  }

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

  // Seed the couple's real in-flight package (J&T, resi JY1457499661).
  //
  // Runs in the background: a slow or unreachable courier API must never
  // delay server startup, which is what the old blocking `await` here did.
  const realPackage = await getOne(
    `SELECT id FROM shopping_items WHERE tracking_number = 'JY1457499661'`
  );
  if (!realPackage) {
    seedRealPackage('JY1457499661').catch((err) =>
      console.warn('⚠️ Seed paket JY1457499661 dilewati:', err.message)
    );
  }

  console.log('✅ Database initialized and synced with acellimut.my.id!');
};

async function seedRealPackage(resi) {
  const { scanTrackingNumberWithAI } = await import('./services/aiService.js');
  const data = await scanTrackingNumberWithAI(resi);

  await run(`
    INSERT INTO shopping_items (
      id, platform, order_id, tracking_number, courier, item_title,
      item_image, total_price, currency, status, estimated_delivery,
      origin_city, destination_city, timeline_json, coordinates_json,
      ai_summary, tracking_url, notes, buyer_name, address_id,
      is_estimate, tracking_source, last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    'shop_real_jy1457499661',
    data.platform,
    `#ORD-${resi}`,
    resi,
    data.courier,
    data.item_title,
    null,
    data.total_price,
    data.status || 'shipping',
    data.estimated_delivery,
    data.origin_city,
    data.destination_city,
    JSON.stringify(data.timeline || []),
    JSON.stringify(data.coordinates || {}),
    data.isEstimate
      ? `Paket asli Haikal & Acell. ${data.estimateNote}`
      : `Paket asli Haikal & Acell — tersinkron dari ${data.courier} (${data.checkpointCount} checkpoint).`,
    data.tracking_url,
    'Paket real Haikal & Acell',
    'Haikal & Acell',
    data.addressId,
    data.isEstimate ? 1 : 0,
    data.trackingSource,
    data.lastSyncedAt
  ]);

  console.log(
    data.isEstimate
      ? `📦 Paket ${resi} ditambahkan (mode estimasi — API kurir belum aktif).`
      : `📦 Paket ${resi} ditambahkan dengan ${data.checkpointCount} checkpoint asli.`
  );
}
