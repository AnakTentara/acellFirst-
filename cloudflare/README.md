# Cara Setup Cloudflare Email Routing (Gratis & Mudah)

Ada 2 cara menghubungkan custom domain di Cloudflare ke backend kita:

### Cara 1: Lewat Dashboard Cloudflare (Paling Mudah, Tanpa CLI)
1. Buka Cloudflare Dashboard -> Pilih Domain kamu (misal: `acellimut.net` atau subdomain staging).
2. Di menu sebelah kiri, klik **Email Routing**.
3. Aktifkan Email Routing (Cloudflare akan otomatis menambahkan record MX dan TXT SPF yang dibutuhkan).
4. Buat **Worker** di menu **Workers & Pages** -> **Create Application** -> **Create Worker**:
   - Beri nama `acel-mail-router`.
   - Copy & Paste kode dari file `worker.js`.
   - Masukkan Variable `WEBHOOK_URL` (URL backend kamu, contoh: `https://acellimut.haikaldev.my.id/api/mail/inbound`) dan `WEBHOOK_SECRET`.
   - Klik **Deploy**.
5. Kembali ke **Email Routing** -> Tab **Routing rules** -> **Catch-all rule** (atau buat Custom Address seperti `shopping@acellimut.net`, `love@acellimut.net`, `*@acellimut.net`):
   - Action: **Send to Worker** -> Pilih `acel-mail-router`.
6. Selesai! Semua email yang masuk ke domain kalian akan langsung dikirim ke backend secara real-time.

---

### Cara 2: Lewat Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```
