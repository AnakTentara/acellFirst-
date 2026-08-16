import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Secret bootstrap.
 *
 * The old code shipped `|| 'Senin23062025'` as a fallback for both JWT and
 * webhook secrets. That string is committed to a public repo and is therefore
 * public knowledge — anyone could mint valid tokens.
 *
 * Now: read from env. If absent, generate a strong random secret once and
 * persist it outside git (backend/data/.secrets.json). Never fall back to a
 * value that exists in source control.
 */

const LEAKED = new Set(['Senin23062025', 'couple_secret_token_123', 'changeme', 'secret']);

function loadStore(storePath) {
  try {
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
  } catch (err) {
    console.warn('⚠️ Gagal membaca .secrets.json, akan dibuat ulang:', err.message);
  }
  return {};
}

function saveStore(storePath, store) {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('❌ Gagal menyimpan .secrets.json:', err.message);
  }
}

export function resolveSecrets(dataDir) {
  const storePath = path.join(dataDir, '.secrets.json');
  const store = loadStore(storePath);
  let dirty = false;
  const generated = [];

  const resolve = (envName, storeKey) => {
    const fromEnv = process.env[envName];

    if (fromEnv && !LEAKED.has(fromEnv)) return fromEnv;

    if (fromEnv && LEAKED.has(fromEnv)) {
      console.error(
        `\n🚨 ${envName} masih memakai secret lama yang sudah BOCOR di git history publik.\n` +
        `   Secret itu diabaikan dan diganti dengan yang baru & acak.\n`
      );
    }

    if (store[storeKey]) return store[storeKey];

    const fresh = crypto.randomBytes(32).toString('hex');
    store[storeKey] = fresh;
    dirty = true;
    generated.push(envName);
    return fresh;
  };

  const jwtSecret = resolve('JWT_SECRET', 'jwtSecret');
  const webhookSecret = resolve('WEBHOOK_SECRET', 'webhookSecret');

  if (dirty) saveStore(storePath, store);

  if (generated.length > 0) {
    console.log(
      `\n🔐 Secret baru dibuat otomatis (${generated.join(', ')}) dan disimpan di:\n` +
      `   ${storePath}   [file ini TIDAK masuk git]\n`
    );
    if (generated.includes('WEBHOOK_SECRET')) {
      console.log(
        `   ⚠️ PENTING: update header x-webhook-secret di Cloudflare Email Worker menjadi:\n` +
        `   ${webhookSecret}\n` +
        `   (bisa dilihat lagi kapan saja lewat: npm run show-webhook-secret)\n`
      );
    }
  }

  return { jwtSecret, webhookSecret };
}
