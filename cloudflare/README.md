# Cara Setup Cloudflare Email Routing untuk acellimut.my.id

Ada 2 cara menghubungkan custom domain `acellimut.my.id` di Cloudflare ke backend kita:

### Cara 1: Lewat Dashboard Cloudflare (Paling Mudah, Tanpa CLI)
1. Buka Cloudflare Dashboard -> Pilih Domain `acellimut.my.id`.
2. Di menu sebelah kiri, klik **Email Routing**.
3. Aktifkan Email Routing (Cloudflare akan otomatis menambahkan record MX dan TXT SPF yang dibutuhkan).
4. Buat **Worker** di menu **Workers & Pages** -> **Create Application** -> **Create Worker**:
   - Beri nama `acell-mail-router`.
   - Copy & Paste kode dari file `worker.js`.
   - Masukkan Variable `WEBHOOK_URL` = `https://acellimut.my.id/api/mail/inbound` dan `WEBHOOK_SECRET` = `Senin23062025`.
   - Klik **Deploy**.
5. Kembali ke **Email Routing** -> Tab **Routing rules** -> Buat Custom Address atau **Catch-all rule**:
   - Action: **Send to Worker** -> Pilih `acell-mail-router`.
6. Selesai! Semua email yang masuk ke domain `acellimut.my.id` akan langsung dikirim ke backend secara real-time.

---

### Cara 2: Lewat Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```
