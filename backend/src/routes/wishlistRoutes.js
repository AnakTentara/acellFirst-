import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, run } from '../db.js';
import { broadcastEvent, sendPushNotification } from '../services/pushService.js';

export const wishlistRouter = express.Router();

// 1. Get all wishlist items
wishlistRouter.get('/', async (req, res) => {
  try {
    const items = await query(`
      SELECT 
        w.*,
        u_add.display_name as added_by_name,
        u_buy.display_name as bought_by_name
      FROM wishlist_items w
      LEFT JOIN users u_add ON w.added_by = u_add.id
      LEFT JOIN users u_buy ON w.bought_by = u_buy.id
      ORDER BY w.is_bought ASC, 
        CASE w.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END ASC, w.created_at DESC
    `);

    const stats = await getOne(`
      SELECT 
        COUNT(*) as totalItems,
        SUM(CASE WHEN is_bought = 1 THEN 1 ELSE 0 END) as boughtItems,
        SUM(CASE WHEN is_bought = 0 THEN price ELSE 0 END) as pendingBudget,
        SUM(CASE WHEN is_bought = 1 THEN price ELSE 0 END) as fulfilledBudget
      FROM wishlist_items
    `);

    res.json({ success: true, items, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add new item
wishlistRouter.post('/', async (req, res) => {
  try {
    const { title, price, url, imageUrl, category, priority, addedBy, notes } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Nama barang impian wajib diisi' });
    }

    const id = `wish_${Date.now()}_${uuidv4().slice(0, 6)}`;
    await run(`
      INSERT INTO wishlist_items (
        id, title, price, url, image_url, category, priority, added_by, is_bought, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))
    `, [
      id,
      title,
      price ? parseFloat(price) : 0,
      url || '',
      imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80',
      category || 'general',
      priority || 'medium',
      addedBy || 'user_acel',
      notes || ''
    ]);

    const created = await getOne(`SELECT * FROM wishlist_items WHERE id = ?`, [id]);
    broadcastEvent('wishlist_update', created);

    await sendPushNotification({
      title: '✨ Wishlist Baru Ditambahkan!',
      body: `"${title}" masuk ke daftar impian kita berdua! 🎁`,
      data: { type: 'wishlist', id }
    });

    res.json({ success: true, item: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Mark Bought / Toggle Bought
wishlistRouter.patch('/:id/toggle-bought', async (req, res) => {
  try {
    const { id } = req.params;
    const { boughtBy } = req.body;

    const item = await getOne(`SELECT * FROM wishlist_items WHERE id = ?`, [id]);
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' });

    const newBought = item.is_bought === 1 ? 0 : 1;
    const buyer = newBought === 1 ? (boughtBy || 'user_haikal') : null;

    await run(`
      UPDATE wishlist_items SET 
        is_bought = ?,
        bought_by = ?
      WHERE id = ?
    `, [newBought, buyer, id]);

    const updated = await getOne(`SELECT * FROM wishlist_items WHERE id = ?`, [id]);
    broadcastEvent('wishlist_update', updated);

    if (newBought === 1) {
      await sendPushNotification({
        title: '🎉 Wishlist Terwujud!',
        body: `"${item.title}" sudah dibeli! Yaaay! 🥰💖`,
        data: { type: 'wishlist', id }
      });
    }

    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete item
wishlistRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM wishlist_items WHERE id = ?`, [id]);
    broadcastEvent('wishlist_deleted', { id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
