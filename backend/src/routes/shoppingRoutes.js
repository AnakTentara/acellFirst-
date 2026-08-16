import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, run } from '../db.js';
import { broadcastEvent } from '../services/pushService.js';

export const shoppingRouter = express.Router();

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

    const rawItems = await query(sql, params);
    const items = rawItems.map(item => {
      let timeline = [];
      let coordinates = {};
      try { timeline = JSON.parse(item.timeline_json || '[]'); } catch(e) {}
      try { coordinates = JSON.parse(item.coordinates_json || '{}'); } catch(e) {}
      return {
        ...item,
        timeline,
        coordinates
      };
    });

    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add manual shopping item
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
