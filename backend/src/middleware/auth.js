import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';

/**
 * Verify a bearer token (or ?token= for EventSource, which cannot set headers).
 * Returns the decoded payload, or null when absent/invalid.
 */
function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.query && typeof req.query.token === 'string') return req.query.token.trim();
  return null;
}

export function decodeToken(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

/**
 * Hard gate. Attaches req.user on success.
 */
export function requireAuth(req, res, next) {
  const payload = decodeToken(req);
  if (!payload) {
    return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
  }
  req.user = payload;
  next();
}

/**
 * Soft gate: attaches req.user when a valid token is present, but never rejects.
 * Used for read-only endpoints where we still want to know who is asking.
 */
export function optionalAuth(req, res, next) {
  req.user = decodeToken(req);
  next();
}

/**
 * Only the account owner may act on :id. Prevents the IDOR that let anyone
 * rewrite the other person's profile or reset their PIN.
 */
export function requireSelf(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
    }
    if (req.user.userId !== req.params[paramName]) {
      return res.status(403).json({ error: 'Kamu hanya bisa mengubah profilmu sendiri.' });
    }
    next();
  };
}

/**
 * Cloudflare inbound webhook guard.
 *
 * Accepts either a constant-time shared-secret match, or an HMAC-SHA256
 * signature over the raw body. Unlike the previous version this ALWAYS
 * rejects on failure, and a missing header is a failure.
 */
export function verifyWebhook(req, res, next) {
  if (!config.webhookSecret) {
    console.error('❌ WEBHOOK_SECRET belum diset — endpoint inbound ditolak demi keamanan.');
    return res.status(503).json({ error: 'Webhook belum dikonfigurasi di server.' });
  }

  const provided = req.headers['x-webhook-secret'];
  const signature = req.headers['x-webhook-signature'];

  if (typeof provided === 'string' && provided.length > 0) {
    const a = Buffer.from(provided);
    const b = Buffer.from(config.webhookSecret);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }

  if (typeof signature === 'string' && signature.length > 0 && req.rawBody) {
    const expected = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(req.rawBody)
      .digest('hex');
    const a = Buffer.from(signature.replace(/^sha256=/, ''));
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }

  console.warn(`⚠️ Webhook inbound DITOLAK dari ${req.ip} — secret/signature tidak cocok`);
  return res.status(401).json({ error: 'Webhook tidak terautentikasi.' });
}

/**
 * Minimal in-memory rate limiter. No external dependency, no persistence —
 * enough to stop PIN brute-force and webhook flooding on a 2-person app.
 */
export function rateLimit({ windowMs = 60_000, max = 20, key = (req) => req.ip } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    const entry = hits.get(k);

    if (!entry || now > entry.resetAt) {
      hits.set(k, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`
        });
      }
    }

    // Opportunistic cleanup so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [mapKey, value] of hits) {
        if (now > value.resetAt) hits.delete(mapKey);
      }
    }

    next();
  };
}
