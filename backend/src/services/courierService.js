import { config } from '../config.js';
import { CITY_COORDINATES, getCityCoordinates } from './geoService.js';

/**
 * Real courier tracking.
 *
 * The previous implementation never contacted a courier at all: it invented a
 * five-step timeline, hardcoded `time: 'Hari ini'`, and placed the courier on
 * the map by linearly interpolating 60% of the way between two hardcoded
 * cities. Every package looked identical and none of it was true.
 *
 * This module talks to a real aggregator (BinderByte by default). When no API
 * key is configured it returns an ESTIMATE that is explicitly labelled as such
 * — `isEstimate: true` — so the UI can say "we don't actually know yet"
 * instead of fabricating checkpoints.
 */

// Aggregator courier codes.
const COURIER_CODES = {
  'jne': 'jne',
  'j&t': 'jnt',
  'j&t express': 'jnt',
  'j&t cargo': 'jntcargo',
  'j&t cargo / j&t express': 'jnt',
  'jnt': 'jnt',
  'sicepat': 'sicepat',
  'sicepat express': 'sicepat',
  'spx': 'spx',
  'spx express': 'spx',
  'shopee express': 'spx',
  'anteraja': 'anteraja',
  'ninja': 'ninja',
  'ninja xpress': 'ninja',
  'lion parcel': 'lion',
  'lion': 'lion',
  'pos indonesia': 'pos',
  'pos': 'pos',
  'wahana': 'wahana',
  'tiki': 'tiki',
  'sap': 'sap',
  'indah': 'indah',
  'id express': 'idexpress',
  'idexpress': 'idexpress'
};

export function toCourierCode(courierName) {
  if (!courierName) return null;
  const key = courierName.toLowerCase().trim();
  if (COURIER_CODES[key]) return COURIER_CODES[key];
  for (const [name, code] of Object.entries(COURIER_CODES)) {
    if (key.includes(name)) return code;
  }
  return null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Query the aggregator for genuine checkpoints.
 * Returns null when tracking is unavailable — the caller decides what to show.
 */
export async function fetchRealTracking(trackingNumber, courierName) {
  const apiKey = config.courier.apiKey;
  if (!apiKey || !trackingNumber) return null;

  const code = toCourierCode(courierName);
  if (!code) {
    console.warn(`⚠️ Kurir "${courierName}" belum didukung agregator, lewati tracking asli.`);
    return null;
  }

  try {
    const url = `${config.courier.baseUrl}/track?api_key=${encodeURIComponent(apiKey)}` +
                `&courier=${encodeURIComponent(code)}&awb=${encodeURIComponent(trackingNumber)}`;

    const res = await fetchWithTimeout(url, {}, config.courier.timeoutMs);

    if (!res.ok) {
      console.warn(`⚠️ Courier API error (${res.status}) untuk resi ${trackingNumber}`);
      return null;
    }

    const body = await res.json();
    if (body.status !== 200 || !body.data) {
      console.warn(`⚠️ Resi ${trackingNumber} tidak ditemukan di ${code}: ${body.message || 'no data'}`);
      return null;
    }

    return normalizeBinderByte(body.data, trackingNumber, courierName);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`⏱️ Courier API timeout untuk resi ${trackingNumber}`);
    } else {
      console.warn(`⚠️ Courier API gagal untuk resi ${trackingNumber}:`, err.message);
    }
    return null;
  }
}

function normalizeBinderByte(data, trackingNumber, courierName) {
  const summary = data.summary || {};
  const detail = data.detail || {};
  const history = Array.isArray(data.history) ? data.history : [];

  const rawStatus = (summary.status || '').toLowerCase();
  let status = 'shipping';
  if (/delivered|diterima|terkirim|selesai/.test(rawStatus)) status = 'delivered';
  else if (/pickup|manifest|processing|diproses/.test(rawStatus)) status = 'processing';

  // Real checkpoints, newest first from the API — present oldest first.
  const timeline = history
    .slice()
    .reverse()
    .map((h, index) => ({
      step: index + 1,
      title: h.desc || 'Update Pengiriman',
      desc: h.location ? `📍 ${h.location}` : '',
      time: h.date || '',
      location: h.location || null,
      completed: true,
      current: index === history.length - 1 && status !== 'delivered'
    }));

  const originCity = detail.origin || summary.origin || null;
  const destCity = detail.destination || summary.destination || null;

  // Place the marker at the LAST REAL CHECKPOINT, not at an invented midpoint.
  const lastLocation = history.length > 0 ? history[0].location : null;
  const originGeo = originCity ? getCityCoordinates(originCity) : null;
  const destGeo = destCity ? getCityCoordinates(destCity) : null;
  const currentGeo = lastLocation ? getCityCoordinates(lastLocation) : null;

  let coordinates = null;
  if (originGeo && destGeo) {
    coordinates = {
      origin: { ...originGeo },
      destination: { ...destGeo },
      current: currentGeo
        ? { ...currentGeo, name: `Terakhir tercatat: ${currentGeo.name}` }
        : null,
      // The UI uses this to decide whether to draw a real marker or a
      // dashed "position unknown" route.
      currentIsReal: Boolean(currentGeo)
    };
  }

  return {
    isEstimate: false,
    source: config.courier.provider,
    tracking_number: trackingNumber,
    courier: summary.courier || courierName,
    status,
    status_text: summary.status || null,
    item_title: summary.desc || null,
    origin_city: originCity,
    destination_city: destCity,
    receiver: detail.receiver || null,
    shipper: detail.shipper || null,
    estimated_delivery: summary.date || null,
    delivered_at: status === 'delivered' ? (summary.date || null) : null,
    timeline,
    coordinates,
    checkpointCount: timeline.length,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Honest fallback when no courier API key is set, or the AWB isn't found yet.
 *
 * Crucially this does NOT invent checkpoints or a GPS position. It states what
 * is actually known (the resi, the detected courier, the destination address)
 * and flags itself as an estimate so the UI renders it differently.
 */
export function buildHonestEstimate({
  trackingNumber,
  courier,
  platform,
  originCity,
  destinationCity,
  destinationCoords,
  status = 'shipping',
  reason = 'no_api_key'
}) {
  const destGeo = destinationCoords || getCityCoordinates(destinationCity || 'Bandung');
  const originGeo = originCity ? getCityCoordinates(originCity) : null;

  const reasonText = {
    no_api_key: 'Tracking real-time belum aktif — tambahkan API key kurir di Pengaturan untuk melihat checkpoint asli.',
    not_found: 'Resi belum terdaftar di sistem kurir. Biasanya butuh beberapa jam setelah paket diserahkan.',
    unsupported: 'Kurir ini belum didukung tracking otomatis. Gunakan tombol cek di situs resmi kurir.'
  }[reason] || 'Data checkpoint asli belum tersedia.';

  return {
    isEstimate: true,
    estimateReason: reason,
    estimateNote: reasonText,
    source: 'local',
    tracking_number: trackingNumber || null,
    courier: courier || 'Kurir Ekspedisi',
    platform: platform || null,
    status,
    origin_city: originCity || null,
    destination_city: destinationCity || null,
    // No fabricated "current" position. Only the endpoints we genuinely know.
    coordinates: {
      origin: originGeo ? { ...originGeo } : null,
      destination: { ...destGeo },
      current: null,
      currentIsReal: false
    },
    // No invented checkpoints. Only facts we can actually assert.
    timeline: [],
    checkpointCount: 0,
    estimated_delivery: null,
    fetchedAt: new Date().toISOString()
  };
}

export { CITY_COORDINATES, getCityCoordinates };
