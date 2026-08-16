import { parseReceiptEmail } from '../parsers/receiptParser.js';
import { config } from '../config.js';

// Coordinates for major Indonesian courier hubs & delivery centers
const CITY_COORDINATES = {
  'jakarta': { lat: -6.2088, lng: 106.8456, name: 'Jakarta (Hub Logistik Pusat)' },
  'jakarta barat': { lat: -6.1683, lng: 106.7588, name: 'Jakarta Barat (Sorting Center)' },
  'jakarta timur': { lat: -6.2250, lng: 106.9004, name: 'Jakarta Timur (DC Cakung)' },
  'tangerang': { lat: -6.1783, lng: 106.6319, name: 'Tangerang (Warehouse SPX/J&T)' },
  'bekasi': { lat: -6.2383, lng: 106.9756, name: 'Bekasi (Transit Hub)' },
  'bogor': { lat: -6.5971, lng: 106.8060, name: 'Bogor (Gateway)' },
  'bandung': { lat: -6.9175, lng: 107.6191, name: 'Bandung (Alamat Acell & Haikal)' },
  'surabaya': { lat: -7.2575, lng: 112.7521, name: 'Surabaya (Hub Timur)' },
  'semarang': { lat: -6.9667, lng: 110.4167, name: 'Semarang (Central Hub)' },
  'yogyakarta': { lat: -7.7956, lng: 110.3695, name: 'Yogyakarta (Gateway)' },
  'medan': { lat: 3.5952, lng: 98.6722, name: 'Medan (Sumatera Hub)' }
};

/**
 * Call OhhMyAgent / OpenAI API to analyze incoming email
 */
export async function analyzeEmailWithAI({ from, fromName, to, subject, text, html }) {
  const apiKey = process.env.AI_API_KEY || '';
  const baseUrl = (process.env.AI_BASE_URL || 'https://ohhmyagent.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'ohh/gpt-5.6';

  // If no AI API Key is provided, use high-precision local regex parser fallback
  if (!apiKey) {
    return fallbackLocalAnalysis({ from, fromName, to, subject, text, html });
  }

  const prompt = `
Kamu adalah asisten AI privat cerdas untuk ekosistem couple "Acell & Haikal Sanctuary" (domain: acellimut.my.id).
Tugasmu adalah menganalisis email masuk berikut dan mengembalikan JSON terstruktur:

EMAIL DATA:
From: ${fromName ? `"${fromName}" <${from}>` : from}
To: ${to}
Subject: ${subject}
Text Body:
${(text || '').slice(0, 3000)}

INSTRUKSI OUTPUT:
Kembalikan HANYA JSON valid tanpa format markdown atau penjelasan lain dengan skema:
{
  "is_order_receipt": boolean,
  "category": "shopping" | "love" | "personal" | "general",
  "summary": "Ringkasan 1-2 kalimat ramah dan jelas tentang email ini",
  "sentiment": "happy" | "romantic" | "neutral" | "urgent",
  "order": {
    "platform": "Shopee" | "Tokopedia" | "TikTok Shop" | "Lazada" | "Blibli" | "Lion Parcel" | "Apple" | "Store Lain",
    "courier": "SPX Express" | "JNE" | "J&T Express" | "SiCepat" | "Lion Parcel" | "Anteraja" | "Ninja Xpress" | "POS Indonesia" | "Paxel" | "Kurir Lain",
    "tracking_number": "nomor resi jika ada",
    "item_title": "nama produk belanjaan",
    "total_price": number (IDR),
    "currency": "IDR",
    "status": "processing" | "shipping" | "delivered",
    "estimated_delivery": "perkiraan tanggal/hari sampai",
    "origin_city": "nama kota asal pengiriman",
    "destination_city": "nama kota tujuan (default: Bandung / Jakarta)"
  }
}
`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert AI parser for Indonesian e-commerce receipts, courier deliveries, and couple emails. Always respond with strict valid JSON only.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`⚠️ OhhMyAgent AI API error (${res.status}):`, errText);
      return fallbackLocalAnalysis({ from, fromName, to, subject, text, html });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    
    // Extract JSON block
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return enrichOrderWithGeoTimeline(parsed, { subject, text, from, fromName });
  } catch (err) {
    console.warn('⚠️ AI analysis fallback triggered:', err.message);
    return fallbackLocalAnalysis({ from, fromName, to, subject, text, html });
  }
}

/**
 * Fallback local heuristic parser with enhanced multi-courier recognition
 */
export function fallbackLocalAnalysis({ from, fromName, to, subject, text, html }) {
  const localReceipt = parseReceiptEmail({
    fromAddress: from,
    fromName,
    subject,
    textBody: text,
    htmlBody: html,
    toAddress: to
  });
  const isOrder = Boolean(localReceipt);

  let category = 'general';
  if (isOrder || /shopping|etall|order|resi|paket|invoice/i.test((to || '') + ' ' + (subject || ''))) {
    category = 'shopping';
  } else if (/us@|love|surat|sayang|kangen|cinta|date/i.test((to || '') + ' ' + (subject || ''))) {
    category = 'love';
  } else if (/acell@/i.test(to || '')) {
    category = 'personal';
  }

  const result = {
    is_order_receipt: isOrder,
    category: category,
    summary: isOrder 
      ? `Pesanan ${localReceipt.platform} (${localReceipt.itemTitle}) sedang diproses dengan kurir ${localReceipt.courier}.`
      : `Email masuk dari ${fromName || from}: "${subject}".`,
    sentiment: category === 'love' ? 'romantic' : 'neutral',
    order: localReceipt ? {
      platform: localReceipt.platform,
      courier: localReceipt.courier,
      tracking_number: localReceipt.trackingNumber,
      item_title: localReceipt.itemTitle,
      total_price: localReceipt.totalPrice || 0,
      currency: 'IDR',
      status: localReceipt.status || 'shipping',
      estimated_delivery: localReceipt.estimatedDelivery || '1-3 Hari Kerja',
      origin_city: 'Jakarta Barat',
      destination_city: 'Bandung'
    } : null
  };

  return enrichOrderWithGeoTimeline(result, { subject, text, from, fromName });
}

/**
 * Enrich order with visual map coordinates and courier checkpoint timeline
 */
function enrichOrderWithGeoTimeline(parsed, { subject, text, from, fromName }) {
  if (!parsed.is_order_receipt || !parsed.order) {
    return parsed;
  }

  const order = parsed.order;
  const originCityKey = (order.origin_city || 'jakarta barat').toLowerCase();
  const destCityKey = (order.destination_city || 'bandung').toLowerCase();

  const originGeo = CITY_COORDINATES[originCityKey] || CITY_COORDINATES['jakarta barat'];
  const destGeo = CITY_COORDINATES[destCityKey] || CITY_COORDINATES['bandung'];

  // Calculate simulated in-transit progress coordinates
  const progressRatio = order.status === 'delivered' ? 1.0 : (order.status === 'shipping' ? 0.6 : 0.2);
  const currentLat = originGeo.lat + (destGeo.lat - originGeo.lat) * progressRatio;
  const currentLng = originGeo.lng + (destGeo.lng - originGeo.lng) * progressRatio;

  order.coordinates = {
    origin: { lat: originGeo.lat, lng: originGeo.lng, name: originGeo.name },
    current: { lat: currentLat, lng: currentLng, name: `Dalam Perjalanan Menuju ${destGeo.name}` },
    destination: { lat: destGeo.lat, lng: destGeo.lng, name: destGeo.name }
  };

  // Generate multi-checkpoint timeline
  order.timeline = [
    {
      step: 1,
      title: 'Pesanan Terkonfirmasi',
      desc: `Pembayaran pesanan di ${order.platform} terverifikasi`,
      time: 'Hari ini',
      completed: true
    },
    {
      step: 2,
      title: 'Diproses Penjual',
      desc: 'Paket telah dikemas rapi dan siap diserahkan',
      time: 'Hari ini',
      completed: true
    },
    {
      step: 3,
      title: `Diserahkan ke ${order.courier}`,
      desc: `Nomor Resi: ${order.tracking_number || 'Sedang Diproses'}`,
      time: 'Hari ini',
      completed: order.status === 'shipping' || order.status === 'delivered',
      current: order.status === 'shipping'
    },
    {
      step: 4,
      title: 'Menuju Alamat Tujuan',
      desc: `Paket dibawa kurir menuju ${destGeo.name}`,
      time: order.estimated_delivery || 'Segera',
      completed: order.status === 'delivered'
    },
    {
      step: 5,
      title: 'Paket Diterima',
      desc: 'Paket tiba di Sanctuary Acell & Haikal',
      time: order.estimated_delivery || 'Estimasi Tiba',
      completed: order.status === 'delivered',
      current: order.status === 'delivered'
    }
  ];

  // Official Courier Tracking Links
  order.tracking_url = getCourierTrackingUrl(order.courier, order.tracking_number);

  return parsed;
}

/**
 * Generate official tracking URL for courier
 */
export function getCourierTrackingUrl(courier, resi) {
  if (!resi || resi === 'Belum Ada Resi') return null;
  const c = (courier || '').toLowerCase();

  if (c.includes('spx') || c.includes('shopee')) {
    return `https://spx.co.id/track?trackingNumber=${encodeURIComponent(resi)}`;
  } else if (c.includes('jne')) {
    return `https://www.jne.co.id/tracking-package?tracking_number=${encodeURIComponent(resi)}`;
  } else if (c.includes('j&t') || c.includes('jnt')) {
    return `https://www.jet.co.id/track?awb=${encodeURIComponent(resi)}`;
  } else if (c.includes('sicepat')) {
    return `https://www.sicepat.com/checkAwb?awb=${encodeURIComponent(resi)}`;
  } else if (c.includes('lion')) {
    return `https://lionparcel.com/track/${encodeURIComponent(resi)}`;
  } else if (c.includes('anteraja')) {
    return `https://anteraja.id/tracking/${encodeURIComponent(resi)}`;
  } else if (c.includes('ninja')) {
    return `https://www.ninjaxpress.co/id-id/tracking?tracking_id=${encodeURIComponent(resi)}`;
  } else if (c.includes('pos')) {
    return `https://www.posindonesia.co.id/id/tracking`;
  }
  return `https://cekresi.com/?noresi=${encodeURIComponent(resi)}`;
}
