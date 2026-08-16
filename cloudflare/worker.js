/**
 * Cloudflare Email Routing Worker for Acel & Haikal Sanctuary
 * 
 * Intercepts incoming emails sent to your custom domain (e.g. shopping@acellimut.net, love@acellimut.net, etc.)
 * and forwards the raw MIME content or parsed payload directly to your backend webhook.
 */

export default {
  async email(message, env, ctx) {
    const webhookUrl = env.WEBHOOK_URL || "https://acellimut.my.id/api/mail/inbound";
    const webhookSecret = env.WEBHOOK_SECRET || "Senin23062025";

    try {
      // Read raw email body as text/MIME
      const rawEmail = await new Response(message.raw).text();

      const payload = {
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject") || "(No Subject)",
        date: message.headers.get("date") || new Date().toISOString(),
        messageId: message.headers.get("message-id") || `msg_${Date.now()}`,
        raw: rawEmail,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret,
          "User-Agent": "Cloudflare-Email-Worker/1.0",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Failed to forward email to backend. Status: ${response.status}`);
        // Optionally reject or keep copy
      } else {
        console.log(`Successfully forwarded email to ${webhookUrl}`);
      }
    } catch (err) {
      console.error("Error processing email in Cloudflare Worker:", err);
      // Fallback: don't crash email pipeline
    }
  }
};
