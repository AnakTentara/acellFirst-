// API Client & SSE Real-time events for Acel & Haikal Sanctuary

const getBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  // If running in development on port 5173, point to backend on 4000
  if (window.location.port === '5173') {
    return `http://${window.location.hostname}:4000`;
  }
  return window.location.origin;
};

export const API_BASE = getBaseUrl();

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// 1. Auth & Profiles
export const authApi = {
  getProfiles: () => request('/api/auth/profiles'),
  login: (username, pin) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, pin }) }),
  updateProfile: (id, data) => request(`/api/auth/profile/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
};

// 2. Mail API
export const mailApi = {
  getInbox: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/mail/inbox?${query}`);
  },
  getMail: (id) => request(`/api/mail/${id}`),
  sendMail: (data) => request('/api/mail/send', { method: 'POST', body: JSON.stringify(data) }),
  verifySmtp: (data) => request('/api/mail/verify-smtp', { method: 'POST', body: JSON.stringify(data) }),
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
  scanResi: (data) => request('/api/shopping/scan-resi', { method: 'POST', body: JSON.stringify(data) }),
  addManual: (data) => request('/api/shopping/manual', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, data) => request(`/api/shopping/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/api/shopping/${id}`, { method: 'DELETE' }),
  getStats: () => request('/api/shopping/stats')
};

// 4. Love Letters & Time Capsule
export const loveApi = {
  getLetters: () => request('/api/love/letters'),
  sendLetter: (data) => request('/api/love/letters', { method: 'POST', body: JSON.stringify(data) }),
  openLetter: (id, reaction) => request(`/api/love/letters/${id}/open`, { method: 'POST', body: JSON.stringify({ reaction }) }),
  getCounter: () => request('/api/love/counter')
};

// 5. Wishlist API
export const wishlistApi = {
  getItems: () => request('/api/wishlist'),
  addItem: (data) => request('/api/wishlist', { method: 'POST', body: JSON.stringify(data) }),
  toggleBought: (id, boughtBy) => request(`/api/wishlist/${id}/toggle-bought`, { method: 'PATCH', body: JSON.stringify({ boughtBy }) }),
  deleteItem: (id) => request(`/api/wishlist/${id}`, { method: 'DELETE' })
};

// 6. System & Domain API
export const systemApi = {
  getConfig: () => request('/api/system/config'),
  switchDomain: (newDomain) => request('/api/system/domain', { method: 'POST', body: JSON.stringify({ newDomain }) }),
  getDnsGuide: () => request('/api/system/dns-guide'),
  getHealth: () => request('/api/system/health')
};

// Real-time EventSource Subscriber
export function subscribeToEvents(onEvent, onStatusChange) {
  try {
    const eventSource = new EventSource(`${API_BASE}/api/system/events`);

    eventSource.onopen = () => {
      if (onStatusChange) onStatusChange(true);
    };

    eventSource.onerror = () => {
      if (onStatusChange) onStatusChange(false);
    };

    const eventNames = [
      'notification',
      'new_email',
      'mail_read_update',
      'mail_deleted',
      'shopping_update',
      'shopping_deleted',
      'new_love_letter',
      'letter_opened',
      'wishlist_update',
      'wishlist_deleted',
      'profile_update',
      'domain_switch'
    ];

    for (const name of eventNames) {
      eventSource.addEventListener(name, (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(name, data);
        } catch (err) {}
      });
    }

    return () => {
      eventSource.close();
      if (onStatusChange) onStatusChange(false);
    };
  } catch (err) {
    console.warn('⚠️ SSE not supported or connection failed:', err);
    return () => {};
  }
}
