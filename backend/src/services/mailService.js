import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { run, getOne } from '../db.js';
import { config } from '../config.js';
import { parseReceiptEmail } from '../parsers/receiptParser.js';
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
        attachments = parsed.attachments.map(att => ({
          filename: att.filename || 'attachment',
          contentType: att.contentType,
          size: att.size
        }));
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

  // Determine category
  let category = 'general';
  if (aliasName === 'shopping' || aliasName === 'order' || aliasName === 'receipts' || aliasName === 'bills') {
    category = 'shopping';
  } else if (aliasName === 'love' || aliasName === 'surat' || aliasName === 'secret') {
    category = 'love';
  } else if (aliasName === 'acel' || aliasName === 'haikal') {
    category = 'personal';
  }

  // If sender or content is obvious e-commerce, set category to shopping
  const lowerFrom = (fromAddress + ' ' + fromName).toLowerCase();
  if (/shopee|tokopedia|tiktok|lazada|blibli|zalora|apple/i.test(lowerFrom)) {
    category = 'shopping';
  }

  const emailId = `mail_${Date.now()}_${uuidv4().slice(0, 8)}`;

  // Save to DB
  await run(`
    INSERT INTO emails (
      id, message_id, from_address, from_name, to_address, alias_name, 
      subject, text_body, html_body, category, is_read_by_boy, is_read_by_girl,
      attachments_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, datetime('now'))
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
    JSON.stringify(attachments)
  ]);

  // Check if shopping receipt
  const receiptData = parseReceiptEmail({
    subject,
    textBody,
    htmlBody,
    fromAddress,
    fromName,
    toAddress,
    aliasName
  });

  let shoppingRecord = null;
  if (receiptData) {
    const shopItemId = `shop_${Date.now()}_${uuidv4().slice(0, 6)}`;
    await run(`
      INSERT INTO shopping_items (
        id, email_id, platform, order_id, tracking_number, courier,
        item_title, item_image, total_price, currency, status,
        estimated_delivery, notes, buyer_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      shopItemId,
      emailId,
      receiptData.platform,
      receiptData.orderId,
      receiptData.trackingNumber,
      receiptData.courier,
      receiptData.itemTitle,
      receiptData.itemImage,
      receiptData.totalPrice,
      receiptData.currency,
      receiptData.status,
      receiptData.estimated_delivery,
      receiptData.notes,
      receiptData.buyer_name
    ]);

    shoppingRecord = { id: shopItemId, ...receiptData, emailId };

    // Send push notification for Shopping
    await sendPushNotification({
      title: `🛍️ Paket Baru: ${receiptData.platform}`,
      body: `${receiptData.itemTitle} (${receiptData.courier} - ${receiptData.trackingNumber})`,
      data: { type: 'shopping', id: shopItemId, emailId }
    });
  } else if (category === 'love') {
    // Send push notification for Love Letter
    await sendPushNotification({
      title: `💌 Surat Masuk di love@${config.activeDomain}!`,
      body: `${fromName || fromAddress}: "${subject}" 💖`,
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

  return { emailId, category, receiptData, success: true };
}

/**
 * Send an outbound email
 */
export async function sendOutboundEmail({ fromAlias = 'love', to, subject, html, text, fromName }) {
  const fromEmail = `${fromAlias}@${config.activeDomain}`;
  const senderDisplay = fromName || config.smtp.fromName;

  if (!transporter) {
    console.log(`[SIMULATED OUTBOUND MAIL] From: ${senderDisplay} <${fromEmail}> To: ${to} Subject: ${subject}`);
    return {
      success: true,
      simulated: true,
      message: 'Email dikirim (Simulasi Preview - konfigurasi SMTP di .env untuk live outbound)'
    };
  }

  const result = await transporter.sendMail({
    from: `"${senderDisplay}" <${fromEmail}>`,
    to,
    subject,
    text,
    html
  });

  return { success: true, messageId: result.messageId };
}
