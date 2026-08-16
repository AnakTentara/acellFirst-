import { config } from '../config.js';

// Connected SSE clients for live updates
const sseClients = new Set();

export function registerSSEClient(res) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastEvent(eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

/**
 * Dispatch push notification to Flutter App (OneSignal / Custom Webhook)
 */
export async function sendPushNotification({ title, body, data = {} }) {
  // Always broadcast locally via SSE first
  broadcastEvent('notification', { title, body, data, timestamp: new Date().toISOString() });

  // If OneSignal is configured
  if (config.oneSignalAppId && config.oneSignalApiKey) {
    try {
      await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Basic ${config.oneSignalApiKey}`
        },
        body: JSON.stringify({
          app_id: config.oneSignalAppId,
          included_segments: ['All'],
          headings: { en: title, id: title },
          contents: { en: body, id: body },
          data
        })
      });
    } catch (err) {
      console.warn('⚠️ OneSignal push failed:', err.message);
    }
  }

  // If custom push webhook is set
  if (config.pushWebhookUrl) {
    try {
      await fetch(config.pushWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, data, timestamp: new Date().toISOString() })
      });
    } catch (err) {
      console.warn('⚠️ Custom push webhook failed:', err.message);
    }
  }
}
