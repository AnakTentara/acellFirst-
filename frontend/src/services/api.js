// API Client & SSE Real-time events for Acell & Haikal Sanctuary

const DEV_BACKEND_PORT = 23625;

const getBaseUrl = () => {
  if (typeof window === 'undefined') return `http://localhost:${DEV_BACKEND_PORT}`;
  // Vite dev server runs on 5173; the backend lives on the couple's port.
  if (window.location.port === '5173') {
    return `http://${window.location.hostname}:${DEV_BACKEND_PORT}`;
  }
  return window.location.origin;
};

export const API_BASE = getBaseUrl();

// ---------------------------------------------------------------------------
// Token storage
//
// Every endpoint except /health, /login and the webhook now requires a bearer
// token. The token is issued once at login and reused for 30 days, so the
// couple is never asked for the PIN again on the same device.
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'sanctuary_token';
const USER_KEY = 'sanctuary_user';

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* private mode / storage disabled */ }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('Tidak bisa terhubung ke server. Cek koneksi internet kamu.');
  }

  if (res.status === 401) {
    // Token expired or missing — force a re-login instead of leaving the UI
    // stuck on a spinner.
    clearSession();
    if (onUnauthorized) onUnauthorized();
    throw new Error('Sesi kamu sudah berakhir. Masuk lagi dengan PIN ya.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request gagal (status ${res.status})`);
  }

  return res.json();
}

// 1. Auth & Profiles
export const authApi = {
  getProfiles: () => request('/api/auth/profiles'),
  login: async (username, pin) => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin })
    });
    if (res.token) setSession(res.token, res.user);
    return res;
  },
  me: () => request('/api/auth/me'),
  logout: () => clearSession(),
  updateProfile: (id, data) =>
    request(`/api/auth/profile/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
};

// 2. Mail API
export const mailApi = {
  getInbox: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/mail/inbox?${query}`);
  },
  getMail: (id) => request(`/api/mail/${id}`),
  // Attachments live behind requireAuth, so a plain <a href> would 401.
  // Fetch the bytes with the bearer token, then hand the browser a blob.
  downloadAttachment: async (id, index, filename) => {
    const res = await fetch(`${API_BASE}/api/mail/${id}/attachment/${index}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {}
    });
    if (!res.ok) throw new Error('Lampiran gagal diunduh.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'lampiran';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick; revoking immediately can cancel the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  sendMail: (data) => request('/api/mail/send', { method: 'POST', body: JSON.stringify(data) }),
  verifySmtp: (data) => request('/api/mail/verify-smtp', { method: 'POST', body: JSON.stringify(data) }),
  testAi: (data) => request('/api/mail/test-ai', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (id, role) => request(`/api/mail/${id}/read`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  toggleStar: (id) => request(`/api/mail/${id}/star`, { method: 'PATCH' }),
  moveToTrash: (id) => request(`/api/mail/${id}/trash`, { method: 'PATCH' }),
  restoreMail: (id) => request(`/api/mail/${id}/restore`, { method: 'PATCH' }),
  markSpam: (id) => request(`/api/mail/${id}/spam`, { method: 'PATCH' }),
  deleteMail: (id) => request(`/api/mail/${id}`, { method: 'DELETE' }),
  simulateTestMail: (type) => request('/api/mail/simulate-test', { method: 'POST', body: JSON.stringify({ type }) })
};

// 3. Shopping API
export const shoppingApi = {
  getItems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/shopping/items?${query}`);
  },
  // Read-only preview: tells you what a resi resolves to without saving it.
  lookupResi: (trackingNumber) =>
    request('/api/shopping/lookup', { method: 'POST', body: JSON.stringify({ trackingNumber }) }),
  scanResi: (data) => request('/api/shopping/scan-resi', { method: 'POST', body: JSON.stringify(data) }),
  // Re-sync one package against the courier API.
  refresh: (id) => request(`/api/shopping/${id}/refresh`, { method: 'POST' }),
  addManual: (data) => request('/api/shopping/manual', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, data) => request(`/api/shopping/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/api/shopping/${id}`, { method: 'DELETE' }),
  getStats: () => request('/api/shopping/stats')
};

// 4. Love Letters & Time Capsule
export const loveApi = {
  getLetters: () => request('/api/love/letters'),
  sendLetter: (data) => request('/api/love/letters', { method: 'POST', body: JSON.stringify(data) }),
  openLetter: (id, reaction) =>
    request(`/api/love/letters/${id}/open`, { method: 'POST', body: JSON.stringify({ reaction }) }),
  getCounter: () => request('/api/love/counter')
};

// 5. Wishlist API
export const wishlistApi = {
  getItems: () => request('/api/wishlist'),
  addItem: (data) => request('/api/wishlist', { method: 'POST', body: JSON.stringify(data) }),
  toggleBought: (id, boughtBy) =>
    request(`/api/wishlist/${id}/toggle-bought`, { method: 'PATCH', body: JSON.stringify({ boughtBy }) }),
  deleteItem: (id) => request(`/api/wishlist/${id}`, { method: 'DELETE' })
};

// 6. Address API (Couple Delivery Addresses)
export const addressApi = {
  getAddresses: () => request('/api/addresses'),
  addAddress: (data) => request('/api/addresses', { method: 'POST', body: JSON.stringify(data) }),
  setPrimary: (id) => request(`/api/addresses/${id}/primary`, { method: 'PATCH' }),
  deleteAddress: (id) => request(`/api/addresses/${id}`, { method: 'DELETE' })
};

// 7. System & Domain API
export const systemApi = {
  getConfig: () => request('/api/system/config'),
  getWebhookSecret: () => request('/api/system/webhook-secret'),
  switchDomain: (newDomain) =>
    request('/api/system/domain', { method: 'POST', body: JSON.stringify(newDomain ? { newDomain } : {}) }),
  getDnsGuide: () => request('/api/system/dns-guide'),
  getHealth: () => request('/api/system/health')
};

// ---------------------------------------------------------------------------
// Real-time EventSource Subscriber
//
// EventSource cannot set an Authorization header, so the token rides in the
// query string; the backend accepts either.
// ---------------------------------------------------------------------------

// Kept in sync with every broadcastEvent() name in the backend. Missing names
// here meant trash/restore/spam/outbound updates silently never arrived.
const EVENT_NAMES = [
  'notification',
  'new_email',
  'mail_read_update',
  'mail_trash',
  'mail_restore',
  'mail_spam',
  'mail_deleted',
  'outbound_email_sent',
  'shopping_update',
  'shopping_deleted',
  'new_love_letter',
  'letter_opened',
  'wishlist_update',
  'wishlist_deleted',
  'address_updated',
  'address_primary_changed',
  'address_deleted',
  'profile_update',
  'domain_switch'
];

export function subscribeToEvents(onEvent, onStatusChange) {
  const token = getToken();
  if (!token) {
    if (onStatusChange) onStatusChange(false);
    return () => {};
  }

  let eventSource = null;
  let retryTimer = null;
  let retryDelay = 2000;
  let closed = false;

  const connect = () => {
    if (closed) return;
    try {
      eventSource = new EventSource(
        `${API_BASE}/api/system/events?token=${encodeURIComponent(token)}`
      );

      eventSource.onopen = () => {
        retryDelay = 2000;
        if (onStatusChange) onStatusChange(true);
      };

      eventSource.onerror = () => {
        if (onStatusChange) onStatusChange(false);
        // EventSource auto-reconnects, but not after the server closes the
        // stream outright — reconnect with backoff so "Live" recovers itself.
        if (eventSource && eventSource.readyState === EventSource.CLOSED && !closed) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        }
      };

      for (const name of EVENT_NAMES) {
        eventSource.addEventListener(name, (e) => {
          try {
            onEvent(name, JSON.parse(e.data));
          } catch { /* malformed frame */ }
        });
      }
    } catch (err) {
      console.warn('⚠️ SSE gagal tersambung:', err);
      if (onStatusChange) onStatusChange(false);
    }
  };

  connect();

  return () => {
    closed = true;
    clearTimeout(retryTimer);
    if (eventSource) eventSource.close();
    if (onStatusChange) onStatusChange(false);
  };
}
