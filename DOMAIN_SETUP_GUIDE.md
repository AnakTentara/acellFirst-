# Panduan Setup Cloudflare Email & Migrasi Domain Fleksibel

Sistem ini dirancang dengan arsitektur **Zero-Downtime Dynamic Domain Switcher**. Kamu bisa mulai testing di domain staging kamu hari ini, dan pindah ke domain utama kapan saja hanya dengan 1 klik.

---

### Langkah 1: Tahap Beta / Staging (`acellimut.haikaldev.my.id`)
1. Di Cloudflare Dashboard domain `haikaldev.my.id`:
   - Buat DNS record `A` atau `CNAME`: `acellimut` &rarr; `IP Server Pterodactyl / VPS` (Proxy Status: Proxied ☁️).
2. Di Dashboard Ekosistem kita:
   - Domain aktif otomatis berjalan di `acellimut.haikaldev.my.id`.
   - Email alias siap dipakai: `shopping@acellimut.haikaldev.my.id`, `love@...`, `acel@...`, `haikal@...`.

---

### Langkah 2: Setup Cloudflare Email Routing (Gratis)
1. Buka Cloudflare Dashboard &rarr; Pilih domain kamu &rarr; Klik **Email Routing**.
2. Aktifkan fitur Email Routing (Cloudflare akan otomatis menambahkan MX record).
3. Buat Cloudflare Worker dengan script dari file `cloudflare/worker.js`.
4. Isi Environment Variable di Worker:
   * `WEBHOOK_URL` = `https://<domain-aktif-kalian>/api/mail/inbound`
   * `WEBHOOK_SECRET` = `couple_secret_token_123`
5. Di menu **Routing Rules**, buat rule **Catch-All** atau custom address (`shopping@...`, `love@...`):
   * Action: **Send to Worker** &rarr; Pilih worker yang baru dibuat.
6. Selesai! Email belanja dari Shopee, Tokopedia, TikTok Shop, atau surat cinta akan langsung diteruskan ke webhook dan di-parse secara otomatis.

---

### Langkah 3: Saat Kamu Beli Domain Utama (`acellimut.net`)
Ketika kamu sudah beli domain baru:
1. Tambahkan domain `acellimut.net` ke Cloudflare.
2. Buka Web Sanctuary kita &rarr; Klik icon **Domain (Globe)** di pojok kanan atas TopBar.
3. Masukkan `acellimut.net` &rarr; Klik **Ganti Domain**.
4. Sistem akan langsung memperbarui semua alias email dan webhook seketika **tanpa perlu restart atau ubah kode apa pun!**
