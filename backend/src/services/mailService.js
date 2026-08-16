import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { run, getOne } from '../db.js';
import { config } from '../config.js';
import { parseReceiptEmail } from '../parsers/receiptParser.js';
import { analyzeEmailWithAI, getCourierTrackingUrl, detectCourierFromAwb } from './aiService.js';
import { sendPushNotification, broadcastEvent } from './pushService.js';

// Setup Nodemailer transporter if SMTP config provided
let transporter = null;
if (config.smtp.host && config.smtp.user) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
}

const ATTACHMENTS_DIR = path.join(config.uploadsPath, 'attachments');
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/**
 * Write attachment bytes to disk and return metadata rows.
 * Filenames are randomised; the original name is kept only as a label, so a
 * hostile "../../etc/passwd" or "invoice.pdf.html" can never reach the FS.
 */
async function persistAttachments(parsedAttachments) {
  await fs.promises.mkdir(ATTACHMENTS_DIR, { recursive: true });

  const saved = [];
  for (const att of parsedAttachments) {
    const label = (att.filename || 'lampiran').replace(/[\r\n]/g, '').slice(0, 200);
    const meta = {
      filename: label,
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || att.content?.length || 0
    };

    if (att.content && att.content.length > 0 && att.content.length <= MAX_ATTACHMENT_BYTES) {
      try {
        const storedName = `${crypto.randomUUID()}.bin`;
        await fs.promises.writeFile(path.join(ATTACHMENTS_DIR, storedName), att.content);
        meta.storedName = storedName;
      } catch (err) {
        console.warn('⚠️ Gagal menyimpan lampiran:', err.message);
      }
    } else if (att.content && att.content.length > MAX_ATTACHMENT_BYTES) {
      meta.skipped = 'Lampiran melebihi 15 MB, tidak disimpan.';
    }

    saved.push(meta);
  }
  return saved;
}

/**
 * Process an inbound email received from Cloudflare Worker or direct API call
 */
export async function processInboundEmail(payload) {
  let fromAddress = payload.from || '';
  let fromName = payload.fromName || '';
  let toAddress = payload.to || '';
  let subject = payload.subject || '(Tanpa Subjek)';
  let textBody = payload.text || '';
  let htmlBody = payload.html || '';
  let messageId = payload.messageId || `msg_${Date.now()}_${uuidv4().slice(0, 8)}`;
  let attachments = [];

  // If raw MIME is provided, parse with mailparser
  if (payload.raw) {
    try {
      const parsed = await simpleParser(payload.raw);
      fromAddress = parsed.from?.value?.[0]?.address || fromAddress;
      fromName = parsed.from?.value?.[0]?.name || fromName;
      toAddress = parsed.to?.value?.[0]?.address || toAddress;
      subject = parsed.subject || subject;
      textBody = parsed.text || textBody;
      htmlBody = parsed.html || htmlBody || `<p>${textBody}</p>`;
      messageId = parsed.messageId || messageId;

      if (parsed.attachments && parsed.attachments.length > 0) {
        // Previously only the metadata was kept and the bytes were thrown
        // away, so attachments could never actually be opened. Now the
        // content is written to disk and the row stores a path.
        attachments = await persistAttachments(parsed.attachments);
      }
    } catch (err) {
      console.warn('⚠️ Error parsing raw MIME, fallback to payload fields:', err.message);
    }
  }

  // Extract alias from toAddress (e.g., shopping@domain.com -> "shopping")
  let aliasName = 'general';
  if (toAddress) {
    const atIndex = toAddress.indexOf('@');
    if (atIndex > 0) {
      aliasName = toAddress.substring(0, atIndex).toLowerCase().trim();
    }
  }

  // AI Analysis (OhhMyAgent / GPT-5.6 / Local Fallback)
  let aiAnalysis = null;
  try {
    aiAnalysis = await analyzeEmailWithAI({
      from: fromAddress,
      fromName: fromName || fromAddress,
      to: toAddress,
      subject,
      text: textBody,
      html: htmlBody
    });
  } catch (aiErr) {
    console.warn('⚠️ AI analysis error, continuing:', aiErr.message);
  }

  // Use AI category if available, or fallback to alias rules
  let category = aiAnalysis?.category || 'general';
  if (!aiAnalysis) {
    if (aliasName === 'shopping' || aliasName === 'etall' || aliasName === 'order' || aliasName === 'receipts' || aliasName === 'bills') {
      category = 'shopping';
    } else if (aliasName === 'us' || aliasName === 'love' || aliasName === 'surat' || aliasName === 'secret') {
      category = 'love';
    } else if (aliasName === 'acell' || aliasName === 'acel') {
      category = 'personal';
    }
  }

  // Cloudflare retries webhooks on any non-2xx or timeout. Without this check
  // a single retry duplicated the email in the inbox.
  if (messageId) {
    const existing = await getOne(`SELECT id FROM emails WHERE message_id = ?`, [messageId]);
    if (existing) {
      console.log(`↩️ Email duplikat diabaikan (message_id: ${messageId})`);
      return { duplicate: true, emailId: existing.id, shoppingItem: null };
    }
  }

  const emailId = `mail_${Date.now()}_${uuidv4().slice(0, 8)}`;

  // Save to DB
  await run(`
    INSERT INTO emails (
      id, message_id, from_address, from_name, to_address, alias_name, 
      subject, text_body, html_body, category, is_read_by_boy, is_read_by_girl,
      attachments_json, ai_summary, ai_sentiment, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, datetime('now'))
  `, [
    emailId,
    messageId,
    fromAddress,
    fromName || fromAddress,
    toAddress,
    aliasName,
    subject,
    textBody,
    htmlBody || `<p>${textBody}</p>`,
    category,
    JSON.stringify(attachments),
    aiAnalysis?.summary || null,
    aiAnalysis?.sentiment || 'neutral'
  ]);

  // Check if shopping receipt from AI or local parser
  const orderData = aiAnalysis?.order || parseReceiptEmail({
    subject,
    textBody,
    htmlBody,
    fromAddress,
    fromName,
    toAddress,
    aliasName
  });

  let shoppingRecord = null;
  if (orderData && (orderData.tracking_number || orderData.trackingNumber || orderData.item_title || orderData.itemTitle)) {
    const shopItemId = `shop_${Date.now()}_${uuidv4().slice(0, 6)}`;
    const platform = orderData.platform || 'Online Store';
    const trackingNumber = orderData.tracking_number || orderData.trackingNumber || 'Belum Ada Resi';

    // A shipper's own confirmation email often names no courier, so the row
    // used to read "Kurir Ekspedisi" even when the resi format says exactly
    // which one it is. The AWB pattern is deterministic — trust it over a
    // placeholder, but never over a courier the email actually stated.
    const awb = detectCourierFromAwb(trackingNumber);
    const statedCourier = orderData.courier;
    const isPlaceholder = !statedCourier ||
      /^(kurir (standar|ekspedisi)|ekspedisi|unknown|-)$/i.test(statedCourier.trim());
    const courier = (isPlaceholder && awb.matched) ? awb.courier : (statedCourier || 'Kurir Standar');
    const itemTitle = orderData.item_title || orderData.itemTitle || 'Paket Belanjaan';
    const totalPrice = orderData.total_price || orderData.totalPrice || 0;
    const status = orderData.status || 'shipping';
    const estimatedDelivery = orderData.estimated_delivery || orderData.estimatedDelivery || '1-3 Hari';
    const originCity = orderData.origin_city || 'Jakarta';
    const destinationCity = orderData.destination_city || 'Bandung';
    const timelineJson = JSON.stringify(orderData.timeline || []);
    const coordinatesJson = JSON.stringify(orderData.coordinates || {});
    const aiSummary = aiAnalysis?.summary || `Paket ${platform} dikirim via ${courier}`;
    const trackingUrl = orderData.tracking_url || getCourierTrackingUrl(courier, trackingNumber);

    // One physical package, one row. A confirmation email plus a shipping
    // email for the same order used to create two entries with the same resi —
    // the radar then showed the couple's single package twice.
    const existing = trackingNumber !== 'Belum Ada Resi'
      ? await getOne(`SELECT id FROM shopping_items WHERE tracking_number = ?`, [trackingNumber])
      : null;

    if (existing) {
      // Link the newer email and fill in fields the first email didn't know,
      // without overwriting anything already established.
      await run(`
        UPDATE shopping_items SET
          email_id = ?,
          courier = CASE WHEN courier IN ('Kurir Standar','Kurir Ekspedisi','') OR courier IS NULL
                         THEN ? ELSE courier END,
          item_title = CASE WHEN item_title IN ('Paket Belanjaan','') OR item_title IS NULL
                            THEN ? ELSE item_title END,
          total_price = CASE WHEN COALESCE(total_price, 0) = 0 THEN ? ELSE total_price END,
          status = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `, [emailId, courier, itemTitle, totalPrice, status, existing.id]);

      shoppingRecord = {
        id: existing.id, emailId, platform, courier, trackingNumber,
        itemTitle, totalPrice, status, merged: true
      };
      broadcastEvent('shopping_update', { id: existing.id, trackingNumber });
    } else {
      await run(`
      INSERT INTO shopping_items (
        id, email_id, platform, order_id, tracking_number, courier,
        item_title, item_image, total_price, currency, status,
        estimated_delivery, origin_city, destination_city, timeline_json,
        coordinates_json, ai_summary, tracking_url, notes, buyer_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      shopItemId,
      emailId,
      platform,
      orderData.order_id || orderData.orderId || `#${Date.now().toString().slice(-6)}`,
      trackingNumber,
      courier,
      itemTitle,
      orderData.item_image || orderData.itemImage || null,
      totalPrice,
      'IDR',
      status,
      estimatedDelivery,
      originCity,
      destinationCity,
      timelineJson,
      coordinatesJson,
      aiSummary,
      trackingUrl,
      orderData.notes || '',
      orderData.buyer_name || 'Acell & Haikal'
    ]);

      shoppingRecord = {
        id: shopItemId,
        emailId,
        platform,
        courier,
        trackingNumber,
        itemTitle,
        totalPrice,
        status,
        estimatedDelivery,
        originCity,
        destinationCity,
        timeline: orderData.timeline || [],
        coordinates: orderData.coordinates || {},
        aiSummary,
        trackingUrl
      };
    }

    // Send push notification for Shopping
    await sendPushNotification({
      title: `🛍️ Paket ${platform}: ${courier}`,
      body: `${itemTitle} (Resi: ${trackingNumber})`,
      data: { type: 'shopping', id: shoppingRecord.id, emailId }
    });
  } else if (category === 'love') {
    // Send push notification for Love Letter
    await sendPushNotification({
      title: `💌 Surat Cinta Masuk!`,
      body: `${fromName || fromAddress}: "${subject}" 💙`,
      data: { type: 'love_mail', emailId }
    });
  } else {
    // General notification
    await sendPushNotification({
      title: `📬 Email Baru: ${aliasName}@${config.activeDomain}`,
      body: `${fromName || fromAddress}: ${subject}`,
      data: { type: 'email', emailId }
    });
  }

  // Broadcast live SSE to connected frontend
  const fullMail = await getOne(`SELECT * FROM emails WHERE id = ?`, [emailId]);
  broadcastEvent('new_email', {
    email: fullMail,
    shopping: shoppingRecord
  });

  return { emailId, category, orderData, shoppingRecord, success: true };
}

/**
 * Build Galactic Blue styled HTML Email template
 */
export function buildGalacticEmailHtml({ title, content, senderName, domain }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6faff; margin: 0; padding: 24px; color: #0f172a; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #dbeafe; box-shadow: 0 10px 30px rgba(37,99,235,0.08); }
      .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
      .content { padding: 32px 28px; line-height: 1.7; font-size: 15px; color: #1e293b; white-space: pre-wrap; }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      .badge { display: inline-block; background: #eff6ff; color: #2563eb; font-weight: 700; padding: 4px 10px; border-radius: 999px; font-size: 11px; margin-top: 12px; border: 1px solid #bfdbfe; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🌌 ${title || 'Acell & Haikal Sanctuary'}</h1>
        <p>Private Couple Mail System • ${domain || 'acellimut.my.id'}</p>
      </div>
      <div class="content">${content}</div>
      <div class="footer">
        <div>Dikirim oleh <b>${senderName || 'Haikal & Acell'}</b> lewat <b>Acell & Haikal Sanctuary</b> 💙</div>
        <div class="badge">✨ Verified Custom Domain Email</div>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Test & Verify SMTP Server Connection
 */
export async function verifySmtpConnection(customSmtp) {
  const smtpConfig = customSmtp || config.smtp;
  if (!smtpConfig.host || !smtpConfig.user) {
    return {
      connected: false,
      message: 'SMTP belum dikonfigurasi di .env (Host & User masih kosong). Outbound saat ini berjalan dalam mode Simulasi Preview.'
    };
  }

  try {
    const testTransporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });

    await testTransporter.verify();
    return {
      connected: true,
      message: `✅ SMTP Handshake Berhasil ke ${smtpConfig.host}:${smtpConfig.port} sebagai ${smtpConfig.user}`
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      message: `❌ Gagal menghubungi SMTP server: ${err.message}`
    };
  }
}

/**
 * Send an outbound email & save to Sent database
 */
export async function sendOutboundEmail({ fromAlias = 'us', to, subject, html, text, fromName }) {
  const fromEmail = `${fromAlias}@${config.activeDomain}`;
  const senderDisplay = fromName || `${config.boyName} & ${config.girlName} (${config.smtp.fromName})`;

  const formattedHtml = html || buildGalacticEmailHtml({
    title: subject,
    content: text || '',
    senderName: senderDisplay,
    domain: config.activeDomain
  });

  const emailId = `sent_${Date.now()}_${uuidv4().slice(0, 8)}`;
  let isSimulated = false;
  let messageId = `msg_${Date.now()}`;

  if (!transporter && (!config.smtp.host || !config.smtp.user)) {
    isSimulated = true;
    console.log(`[SIMULATED OUTBOUND MAIL] From: ${senderDisplay} <${fromEmail}> To: ${to} Subject: ${subject}`);
  } else {
    try {
      const activeTransporter = transporter || nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: { user: config.smtp.user, pass: config.smtp.pass }
      });

      const result = await activeTransporter.sendMail({
        from: `"${senderDisplay}" <${fromEmail}>`,
        to,
        subject,
        text: text || '',
        html: formattedHtml
      });
      messageId = result.messageId || messageId;
    } catch (err) {
      console.warn('⚠️ SMTP send error, falling back to simulated save:', err.message);
      isSimulated = true;
    }
  }

  // Save record to emails table as outbound
  await run(`
    INSERT INTO emails (
      id, message_id, from_address, from_name, to_address, alias_name,
      subject, text_body, html_body, category, is_read_by_boy, is_read_by_girl,
      is_outbound, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'general', 1, 1, 1, datetime('now'))
  `, [
    emailId,
    messageId,
    fromEmail,
    senderDisplay,
    to,
    fromAlias,
    subject,
    text || '',
    formattedHtml
  ]);

  broadcastEvent('outbound_email_sent', {
    id: emailId,
    to,
    fromEmail,
    subject,
    isSimulated
  });

  return {
    success: true,
    emailId,
    messageId,
    isSimulated,
    message: isSimulated 
      ? `Email tersimpan di Outbox/Sent (Simulasi Preview - isi SMTP di .env untuk pengiriman nyata ke internet)`
      : `Email berhasil dikirim secara live ke ${to}!`
  };
}
