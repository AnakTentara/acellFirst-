import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, run } from '../db.js';
import { config } from '../config.js';
import { broadcastEvent } from '../services/pushService.js';

export const shoppingRouter = express.Router();

/**
 * Parse the JSON columns and surface the honesty flags so the UI can tell a
 * real courier checkpoint apart from "we don't know yet".
 */
function hydrateItem(item) {
  if (!item) return item;
  let timeline = [];
  let coordinates = {};
  try { timeline = JSON.parse(item.timeline_json || '[]'); } catch { /* corrupt row */ }
  try { coordinates = JSON.parse(item.coordinates_json || '{}'); } catch { /* corrupt row */ }

  const isEstimate = item.is_estimate === 1;

  return {
    ...item,
    timeline,
    coordinates,
    isEstimate,
    checkpointCount: timeline.length,
    trackingSource: item.tracking_source || 'local',
    lastSyncedAt: item.last_synced_at || null,
    // There is no estimate_note column — the reason lives in ai_summary,
    // which is what /scan-resi wrote there. Surface it under the name the
    // UI reads so the radar modal shows the real reason, not a generic one.
    estimateNote: isEstimate ? (item.ai_summary || null) : null
  };
}

// 1. List all shopping items
shoppingRouter.get('/items', async (req, res) => {
  try {
    const { status, platform } = req.query;
    let sql = `SELECT * FROM shopping_items WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (platform && platform !== 'all') {
      sql += ` AND platform = ?`;
      params.push(platform);
    }

    // Order: shipping first, then processing, then delivered, by latest update
    sql += ` ORDER BY 
      CASE status
        WHEN 'shipping' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'delivered' THEN 3
        ELSE 4
      END ASC, updated_at DESC`;

    const items = (await query(sql, params)).map(hydrateItem);

    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Scan & auto-create package by tracking number alone
shoppingRouter.post('/scan-resi', async (req, res) => {
  try {
    const { trackingNumber, notes } = req.body;
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Nomor resi wajib diisi' });
    }

    const { scanTrackingNumberWithAI } = await import('../services/aiService.js');
    const orderData = await scanTrackingNumberWithAI(trackingNumber);

    // Don't create a duplicate row for a resi that's already being tracked.
    const existing = await getOne(
      `SELECT * FROM shopping_items WHERE tracking_number = ?`,
      [orderData.tracking_number]
    );
    if (existing) {
      return res.json({
        success: true,
        item: hydrateItem(existing),
        alreadyExists: true,
        message: 'Resi ini sudah ada di daftar paket.'
      });
    }

    const id = `shop_scan_${Date.now()}_${uuidv4().slice(0, 6)}`;
    await run(`
      INSERT INTO shopping_items (
        id, platform, order_id, tracking_number, courier, item_title,
        item_image, total_price, currency, status, estimated_delivery,
        origin_city, destination_city, timeline_json, coordinates_json,
        ai_summary, tracking_url, notes, buyer_name, address_id,
        is_estimate, tracking_source, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      id,
      orderData.platform,
      `#SCAN-${Date.now().toString().slice(-5)}`,
      orderData.tracking_number,
      orderData.courier,
      orderData.item_title,
      null, // no stock photo standing in for a product we've never seen
      orderData.total_price,
      orderData.status || 'shipping',
      // null, not a made-up "1-3 Hari Kerja"
      orderData.estimated_delivery,
      orderData.origin_city,
      orderData.destination_city,
      JSON.stringify(orderData.timeline || []),
      JSON.stringify(orderData.coordinates || {}),
      orderData.isEstimate
        ? `Resi ${orderData.tracking_number} — ${orderData.estimateNote}`
        : `Resi ${orderData.tracking_number} tersinkron dari ${orderData.courier} (${orderData.checkpointCount} checkpoint).`,
      orderData.tracking_url,
      notes || 'Ditambahkan via Scan Resi',
      'Acell & Haikal',
      orderData.addressId,
      orderData.isEstimate ? 1 : 0,
      orderData.trackingSource,
      orderData.lastSyncedAt
    ]);

    const created = hydrateItem(await getOne(`SELECT * FROM shopping_items WHERE id = ?`, [id]));

    broadcastEvent('shopping_update', created);
    res.json({
      success: true,
      item: created,
      isEstimate: orderData.isEstimate,
      estimateNote: orderData.estimateNote || null,
      courierDetected: orderData.courierDetected !== false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Re-sync one package against the courier API.
//     This is what makes tracking live rather than a one-shot snapshot.
shoppingRouter.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getOne(`SELECT * FROM shopping_items WHERE id = ?`, [id]);
    if (!item) return res.status(404).json({ error: 'Paket tidak ditemukan' });
    if (!item.tracking_number || item.tracking_number === 'Tidak ada resi') {
      return res.status(400).json({ error: 'Paket ini tidak punya nomor resi.' });
    }

    const { fetchRealTracking } = await import('../services/courierService.js');
    const { getPrimaryDestination, getCourierTrackingUrl } = await import('../services/aiService.js');

    const real = await fetchRealTracking(item.tracking_number, item.courier);

    if (!real) {
      await run(
        `UPDATE shopping_items SET last_synced_at = ?, updated_at = datetime('now') WHERE id = ?`,
        [new Date().toISOString(), id]
      );
      return res.json({
        success: true,
        updated: false,
        item: hydrateItem(await getOne(`SELECT * FROM shopping_items WHERE id = ?`, [id])),
        message: config.courier.apiKey
          ? 'Resi belum terdaftar di sistem kurir. Coba lagi nanti.'
          : 'Tracking real-time belum aktif — tambahkan API key kurir di Pengaturan.'
      });
    }

    const destination = await getPrimaryDestination();
    const coordinates = real.coordinates || {
      origin: null,
      destination: { ...destination.coords },
      current: null,
      currentIsReal: false
    };
    if (!coordinates.destination) coordinates.destination = { ...destination.coords };

    await run(`
      UPDATE shopping_items SET
        status = ?,
        courier = COALESCE(?, courier),
        item_title = COALESCE(?, item_title),
        origin_city = COALESCE(?, origin_city),
        destination_city = COALESCE(?, destination_city),
        estimated_delivery = COALESCE(?, estimated_delivery),
        timeline_json = ?,
        coordinates_json = ?,
        tracking_url = COALESCE(?, tracking_url),
        ai_summary = ?,
        is_estimate = 0,
        tracking_source = ?,
        last_synced_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      real.status,
      real.courier,
      real.item_title,
      real.origin_city,
      real.destination_city || destination.city,
      real.estimated_delivery,
      JSON.stringify(real.timeline),
      JSON.stringify(coordinates),
      getCourierTrackingUrl(real.courier || item.courier, item.tracking_number),
      `Tersinkron dari ${real.courier}: ${real.status_text || real.status} (${real.checkpointCount} checkpoint).`,
      real.source,
      real.fetchedAt,
      id
    ]);

    const updated = hydrateItem(await getOne(`SELECT * FROM shopping_items WHERE id = ?`, [id]));
    broadcastEvent('shopping_update', updated);

    res.json({
      success: true,
      updated: true,
      item: updated,
      checkpointCount: real.checkpointCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2c. Look up a resi WITHOUT saving it — pure read, for the scan preview.
shoppingRouter.post('/lookup', async (req, res) => {
  try {
    const { trackingNumber } = req.body;
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Nomor resi wajib diisi' });
    }

    const { scanTrackingNumberWithAI } = await import('../services/aiService.js');
    const data = await scanTrackingNumberWithAI(trackingNumber);
    const existing = await getOne(
      `SELECT id FROM shopping_items WHERE tracking_number = ?`,
      [data.tracking_number]
    );

    res.json({ success: true, result: data, alreadyTracked: Boolean(existing) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Add manual shopping item
shoppingRouter.post('/manual', async (req, res) => {
  try {
    const { platform, orderId, trackingNumber, courier, itemTitle, itemImage, totalPrice, status, estimated_delivery, notes, buyer_name } = req.body;

    if (!itemTitle) {
      return res.status(400).json({ error: 'Nama barang wajib diisi' });
    }

    const id = `shop_manual_${Date.now()}_${uuidv4().slice(0, 6)}`;
    await run(`
      INSERT INTO shopping_items (
        id, platform, order_id, tracking_number, courier, item_title,
        item_image, total_price, currency, status, estimated_delivery, notes, buyer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?, ?)
    `, [
      id,
      platform || 'Manual Order',
      orderId || `#ORD-${Date.now().toString().slice(-5)}`,
      trackingNumber || 'Tidak ada resi',
      courier || 'Kurir Pribadi / Jastip',
      itemTitle,
      itemImage || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
      totalPrice ? parseFloat(totalPrice) : 0,
      status || 'processing',
      estimated_delivery || '1-3 Hari',
      notes || 'Ditambahkan manual',
      buyer_name || 'Acel & Haikal'
    ]);

    const created = await getOne(`SELECT * FROM shopping_items WHERE id = ?`, [id]);
    broadcastEvent('shopping_update', created);
    res.json({ success: true, item: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update status
shoppingRouter.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, trackingNumber } = req.body;

    await run(`
      UPDATE shopping_items SET 
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        tracking_number = COALESCE(?, tracking_number),
        updated_at = datetime('now')
      WHERE id = ?
    `, [status, notes, trackingNumber, id]);

    const updated = await getOne(`SELECT * FROM shopping_items WHERE id = ?`, [id]);
    broadcastEvent('shopping_update', updated);
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete item
shoppingRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM shopping_items WHERE id = ?`, [id]);
    broadcastEvent('shopping_deleted', { id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Shopping Stats
shoppingRouter.get('/stats', async (req, res) => {
  try {
    const totalSpent = await getOne(`SELECT SUM(total_price) as total FROM shopping_items WHERE status != 'cancelled'`);
    const activePackages = await getOne(`SELECT COUNT(*) as count FROM shopping_items WHERE status IN ('shipping', 'processing')`);
    const deliveredCount = await getOne(`SELECT COUNT(*) as count FROM shopping_items WHERE status = 'delivered'`);
    const platformStats = await query(`
      SELECT platform, COUNT(*) as count, SUM(total_price) as total 
      FROM shopping_items GROUP BY platform
    `);

    res.json({
      success: true,
      stats: {
        totalSpent: totalSpent?.total || 0,
        activePackages: activePackages?.count || 0,
        deliveredCount: deliveredCount?.count || 0,
        byPlatform: platformStats
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
