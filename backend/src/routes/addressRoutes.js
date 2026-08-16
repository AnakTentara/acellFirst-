import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, run } from '../db.js';
import { broadcastEvent } from '../services/pushService.js';
import { getCityCoordinatesOrDefault } from '../services/geoService.js';

export const addressRouter = express.Router();

// 1. Get all addresses
addressRouter.get('/', async (req, res) => {
  try {
    const addresses = await query(`SELECT * FROM addresses ORDER BY is_primary DESC, created_at ASC`);
    res.json({ success: true, addresses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add new address
addressRouter.post('/', async (req, res) => {
  try {
    const { label, recipient_name, phone_number, full_address, city, notes, is_primary } = req.body;

    if (!label || !recipient_name || !full_address || !city) {
      return res.status(400).json({ error: 'Label, Nama Penerima, Alamat Lengkap, dan Kota wajib diisi' });
    }

    // Auto-compute coordinates from city. Unknown cities fall back to the
    // Bandung sanctuary rather than throwing — getCityCoordinates() now
    // returns null instead of silently pretending every city is Bandung.
    const geo = getCityCoordinatesOrDefault(city);
    const id = `addr_${Date.now()}_${uuidv4().slice(0, 5)}`;

    if (is_primary) {
      await run(`UPDATE addresses SET is_primary = 0`);
    }

    await run(`
      INSERT INTO addresses (id, label, recipient_name, phone_number, full_address, city, latitude, longitude, is_primary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      label,
      recipient_name,
      phone_number || '0812-2306-2025',
      full_address,
      city,
      geo.lat,
      geo.lng,
      is_primary ? 1 : 0,
      notes || ''
    ]);

    const created = await getOne(`SELECT * FROM addresses WHERE id = ?`, [id]);
    broadcastEvent('address_updated', { address: created });
    res.json({ success: true, address: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Set Primary Address
addressRouter.patch('/:id/primary', async (req, res) => {
  try {
    const { id } = req.params;
    await run(`UPDATE addresses SET is_primary = 0`);
    await run(`UPDATE addresses SET is_primary = 1 WHERE id = ?`, [id]);

    const primary = await getOne(`SELECT * FROM addresses WHERE id = ?`, [id]);
    broadcastEvent('address_primary_changed', { address: primary });
    res.json({ success: true, address: primary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Address
addressRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const count = await getOne(`SELECT COUNT(*) as count FROM addresses`);
    if (count && count.count <= 1) {
      return res.status(400).json({ error: 'Minimal harus ada 1 alamat pengiriman tersisa.' });
    }

    await run(`DELETE FROM addresses WHERE id = ?`, [id]);
    
    // If deleted address was primary, set another one as primary
    const hasPrimary = await getOne(`SELECT id FROM addresses WHERE is_primary = 1`);
    if (!hasPrimary) {
      const first = await getOne(`SELECT id FROM addresses ORDER BY created_at ASC LIMIT 1`);
      if (first) {
        await run(`UPDATE addresses SET is_primary = 1 WHERE id = ?`, [first.id]);
      }
    }

    broadcastEvent('address_deleted', { id });
    res.json({ success: true, message: 'Alamat berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
