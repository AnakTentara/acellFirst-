/**
 * Smart Receipt & Shopping Tracker Parser
 * Detects platforms (Shopee, Tokopedia, TikTok Shop, Lazada, Blibli, Apple, Grab, GoFood)
 * and extracts tracking numbers, items, prices, and status.
 */

export function parseReceiptEmail(email) {
  const subject = email.subject || '';
  const text = (email.textBody || '') + ' ' + (email.htmlBody || '');
  const from = (email.fromAddress || '') + ' ' + (email.fromName || '');
  const to = email.toAddress || '';

  const lowerSubject = subject.toLowerCase();
  const lowerText = text.toLowerCase();
  const lowerFrom = from.toLowerCase();

  // Determine if it's a shopping email
  const isShoppingAlias = email.aliasName === 'shopping' || email.aliasName === 'order' || email.aliasName === 'receipts';
  const isShoppingSender = /shopee|tokopedia|tiktok|lazada|blibli|zalora|amazon|apple|grab|gofood|sayurbox|sociolla|uniqlo|zara/i.test(lowerFrom);
  const isShoppingKeyword = /pesanan|order|resi|dikirim|pembayaran|pengiriman|shipping|receipt|invoice|tracking|paket|tagihan/i.test(lowerSubject);

  if (!isShoppingAlias && !isShoppingSender && !isShoppingKeyword) {
    return null; // Not a shopping receipt
  }

  // Detect Platform
  let platform = 'E-Commerce / Online Store';
  let defaultImage = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';

  if (/shopee/i.test(lowerFrom) || /shopee/i.test(lowerSubject)) {
    platform = 'Shopee';
    defaultImage = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80';
  } else if (/tokopedia/i.test(lowerFrom) || /tokopedia/i.test(lowerSubject)) {
    platform = 'Tokopedia';
    defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80';
  } else if (/tiktok/i.test(lowerFrom) || /tiktok/i.test(lowerSubject)) {
    platform = 'TikTok Shop';
    defaultImage = 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=300&auto=format&fit=crop&q=80';
  } else if (/lazada/i.test(lowerFrom) || /lazada/i.test(lowerSubject)) {
    platform = 'Lazada';
    defaultImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80';
  } else if (/blibli/i.test(lowerFrom) || /blibli/i.test(lowerSubject)) {
    platform = 'Blibli';
  } else if (/apple/i.test(lowerFrom) || /apple/i.test(lowerSubject)) {
    platform = 'Apple Store';
    defaultImage = 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300&auto=format&fit=crop&q=80';
  } else if (/grab/i.test(lowerFrom) || /gofood/i.test(lowerFrom)) {
    platform = /grab/i.test(lowerFrom) ? 'Grab Food' : 'GoFood';
    defaultImage = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80';
  }

  // Extract Order ID
  let orderId = '';
  const orderIdMatches = [
    /(?:no\.?\s*pesanan|nomor\s*pesanan|order\s*id|order\s*#|invoice|pesanan\s*#)\s*[:#]?\s*([A-Za-z0-9\-_]{6,30})/i,
    /#([0-9]{8,24})/i,
    /([0-9]{12,20})/
  ];
  for (const regex of orderIdMatches) {
    const match = text.match(regex) || subject.match(regex);
    if (match && match[1]) {
      orderId = match[1].trim();
      break;
    }
  }
  if (!orderId) {
    orderId = `ORD-${Date.now().toString().slice(-6)}`;
  }

  // Extract Tracking / Resi Number & Courier
  let courier = 'Kurir Ekspedisi';
  let trackingNumber = '';

  const courierPatterns = [
    { name: 'SPX Express', regex: /spx|shopee express/i, resiRegex: /(SPX[A-Z0-9]{8,20})/i },
    { name: 'J&T Express / J&T Cargo', regex: /j&t|jnt|jet express|jt cargo|j&t cargo/i, resiRegex: /(JY[0-9]{8,16}|Jx[0-9]{8,16}|JP[0-9]{8,16}|JZ[0-9]{8,16}|JS[0-9]{8,16}|JD[0-9]{8,16}|[0-9]{12})/i },
    { name: 'SiCepat Express', regex: /sicepat/i, resiRegex: /(00[0-9]{10,14})/i },
    { name: 'Lion Parcel', regex: /lion parcel|lionparcel/i, resiRegex: /(LP[0-9]{8,14}|[0-9]{11,15})/i },
    { name: 'Anteraja', regex: /anteraja/i, resiRegex: /(1000[0-9]{8,14})/i },
    { name: 'JNE Express', regex: /jne/i, resiRegex: /(JNE[0-9]{8,14}|[0-9]{13,16})/i },
    { name: 'Ninja Xpress', regex: /ninja/i, resiRegex: /(NVID[0-9]{8,14})/i },
    { name: 'POS Indonesia', regex: /pos indonesia|kantor pos/i, resiRegex: /(P[0-9]{11,14})/i },
    { name: 'Paxel', regex: /paxel/i, resiRegex: /(EM\.[A-Za-z0-9\-]{8,16})/i },
    { name: 'ID Express', regex: /id express|idx/i, resiRegex: /(IDE[0-9]{10,14})/i },
    { name: 'GoSend / GrabExpress', regex: /gosend|grabexpress|instant/i, resiRegex: /(GK-[0-9]{6,12})/i }
  ];

  for (const c of courierPatterns) {
    if (c.regex.test(lowerText) || c.regex.test(lowerSubject)) {
      courier = c.name;
      const resiMatch = text.match(c.resiRegex);
      if (resiMatch && resiMatch[1]) {
        trackingNumber = resiMatch[1];
      }
      break;
    }
  }

  if (!trackingNumber) {
    const generalResiMatch = text.match(/(?:resi|tracking|awb|waybill)\s*[:#]?\s*([A-Za-z0-9]{8,24})/i);
    if (generalResiMatch && generalResiMatch[1]) {
      trackingNumber = generalResiMatch[1];
    }
  }

  // Extract Price (IDR / Rupiah)
  let totalPrice = 0;
  const priceMatches = [
    /(?:total\s*(?:pembayaran|belanja|harga|biaya)|grand\s*total|rp\.?)\s*[:]?\s*Rp?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i,
    /Rp\s*([0-9]{1,3}(?:\.[0-9]{3})+)/i
  ];
  for (const regex of priceMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/\./g, '').replace(',', '.');
      const parsedNum = parseFloat(cleanNum);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        totalPrice = parsedNum;
        break;
      }
    }
  }

  // Status Detection
  let status = 'processing';
  if (/telah\s*dikirim|dalam\s*perjalanan|sedang\s*dikirim|shipped|on\s*delivery|out\s*for\s*delivery/i.test(lowerSubject) ||
      /telah\s*dikirim|dalam\s*perjalanan|kurir\s*sedang\s*menuju/i.test(lowerText)) {
    status = 'shipping';
  } else if (/selesai|telah\s*diterima|delivered|sukses\s*diantar|sampai\s*di\s*tujuan/i.test(lowerSubject) ||
             /telah\s*diterima|berhasil\s*diantar/i.test(lowerText)) {
    status = 'delivered';
  } else if (/dibatalkan|cancelled/i.test(lowerSubject)) {
    status = 'cancelled';
  }

  // Item Title
  let itemTitle = subject
    .replace(/^Re:\s*/i, '')
    .replace(/^Fwd:\s*/i, '')
    .replace(/\[.*?\]/g, '')
    .trim();

  if (itemTitle.length > 80) {
    itemTitle = itemTitle.slice(0, 80) + '...';
  }

  return {
    platform,
    orderId,
    trackingNumber: trackingNumber || 'Sedang Diproses',
    courier,
    itemTitle: itemTitle || 'Paket Belanjaan Couple',
    itemImage: defaultImage,
    totalPrice,
    currency: 'IDR',
    status,
    estimated_delivery: status === 'delivered' ? 'Telah Diterima' : '1 - 3 Hari Kerja',
    notes: `Otomatis diekstrak dari email ${platform}`,
    buyer_name: 'Acel & Haikal'
  };
}
