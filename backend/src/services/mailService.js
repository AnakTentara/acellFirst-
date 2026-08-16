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
  if (aliasName === 'shopping' || aliasName === 'etall' || aliasName === 'order' || aliasName === 'receipts' || aliasName === 'bills') {
    category = 'shopping';
  } else if (aliasName === 'us' || aliasName === 'love' || aliasName === 'surat' || aliasName === 'secret') {
    category = 'love';
  } else if (aliasName === 'acell' || aliasName === 'acel' || aliasName === 'haikal') {
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
