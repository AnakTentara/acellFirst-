/**
 * Cloudflare Email Routing Worker for Acell & Haikal Sanctuary
 *
 * Intercepts incoming emails sent to the couple's aliases (us@, shopping@,
 * etall@, acell@ acellimut.my.id) and forwards the raw MIME to the backend
 * webhook.
 *
 * SETUP (wajib, sekali saja):
 *   1. Ambil secret dari server: backend/data/.secrets.json → webhookSecret
 *   2. Simpan sebagai Secret di Cloudflare (BUKAN plain var):
 *        npx wrangler secret put WEBHOOK_SECRET
 *   3. Set WEBHOOK_URL kalau backend tidak di https://acellimut.my.id
 */

export default {
  async email(message, env, ctx) {
    const webhookUrl = env.WEBHOOK_URL || "https://acellimut.my.id/api/mail/inbound";
    const webhookSecret = env.WEBHOOK_SECRET;

    // Tidak ada fallback secret di sini. Dulu baris ini berisi 'Senin23062025'
    // — nilai yang sudah bocor di git history publik — sehingga siapa pun yang
    // membaca repo bisa menyuntik email palsu ke inbox. Backend sekarang juga
    // menolak nilai itu, jadi fallback hanya akan bikin email diam-diam gagal.
    if (!webhookSecret) {
      console.error(
        "WEBHOOK_SECRET belum diset di Cloudflare. Jalankan: wrangler secret put WEBHOOK_SECRET"
      );
      // Simpan email di antrian Cloudflare daripada dibuang diam-diam.
      message.setReject("Mail relay belum dikonfigurasi.");
      return;
    }

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
        // 401 di sini artinya secret di Cloudflare beda dengan yang di server.
        console.error(
          `Gagal meneruskan email ke backend. Status: ${response.status}` +
            (response.status === 401
              ? " — WEBHOOK_SECRET tidak cocok dengan backend/data/.secrets.json"
              : "")
        );
      } else {
        console.log(`Successfully forwarded email to ${webhookUrl}`);
      }
    } catch (err) {
      console.error("Error processing email in Cloudflare Worker:", err);
      // Fallback: don't crash email pipeline
    }
  },
};
