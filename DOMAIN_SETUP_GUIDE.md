# Panduan Setup Cloudflare Email & Domain acellimut.my.id

Sistem ini berjalan di domain utama resmi **`acellimut.my.id`** dengan arsitektur **Zero-Downtime Dynamic Domain Switcher**.

---

### Langkah 1: Setup Cloudflare Email Routing (Inbound)
1. Buka Cloudflare Dashboard &rarr; Pilih domain **`acellimut.my.id`** &rarr; Klik **Email Routing**.
2. Aktifkan Email Routing (Cloudflare akan otomatis membuat MX record).
3. Buat Cloudflare Worker dengan script dari file [`cloudflare/worker.js`](file:///e:/CoupleProject/cloudflare/worker.js).
4. Isi Environment Variable di Worker:
   * `WEBHOOK_URL` = `https://acellimut.my.id/api/mail/inbound`
   * `WEBHOOK_SECRET` = `Senin23062025`
5. Di menu **Routing Rules**, buat rule untuk custom address:
   * `us@acellimut.my.id` &rarr; Send to Worker
   * `shopping@acellimut.my.id` &rarr; Send to Worker
   * `etall@acellimut.my.id` &rarr; Send to Worker
   * `acell@acellimut.my.id` &rarr; Send to Worker
   * `haikal@acellimut.my.id` &rarr; Send to Worker
   * Atau **Catch-all** &rarr; Send to Worker.

---

### Langkah 2: Setup Resend SMTP (Outbound)
1. Buka [Resend.com](https://resend.com) &rarr; Masukkan domain `acellimut.my.id`.
2. Masukkan DNS TXT (DKIM & SPF) ke Cloudflare DNS (DNS Only).
3. Buat API Key & masukkan ke `.env`:
   ```env
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=re_xxxxxx
   ```
