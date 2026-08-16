# Panduan Setup Cloudflare Zero Trust (Cloudflare Tunnel)

Menggunakan **Cloudflare Zero Trust / Cloudflare Tunnel (`cloudflared`)** sebagai Reverse Proxy adalah **pilihan paling aman dan modern!**

### Keunggulan Menggunakan Zero Trust:
1. **Zero Open Port:** Kamu tidak perlu membuka port publik (Port Forwarding) di Pterodactyl atau VPS.
2. **Tidak Perlu IP Publik Statis:** Server tetap privat dan aman dari port scanning atau serangan internet terbuka.
3. **Otomatis Full SSL/TLS:** Cloudflare menyediakan enkripsi HTTPS otomatis.
4. **Proteksi WAF & DDoS Kelas Dunia.**

---

### Langkah 1: Buat Cloudflare Tunnel
1. Buka [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Masuk ke menu **Networks** &rarr; **Tunnels** &rarr; Klik **Add a Tunnel**.
3. Pilih tipe **Cloudflared** &rarr; Beri nama (contoh: `acell-sanctuary-tunnel`) &rarr; Klik **Save Tunnel**.

---

### Langkah 2: Jalankan Connector `cloudflared` di Server / VPS
Cloudflare akan memberikan perintah instalasi sesuai OS:

* **Di VPS (Linux):**
  ```bash
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i cloudflared.deb
  sudo cloudflared service install <TOKEN_DARI_CLOUDFLARE>
  ```

* **Di Docker / Pterodactyl (Jika didukung Docker):**
  ```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token <TOKEN_DARI_CLOUDFLARE>
  ```

---

### Langkah 3: Tambahkan Public Hostname di Cloudflare Tunnel
Di halaman konfigurasi Tunnel &rarr; Tab **Public Hostname** &rarr; Klik **Add a public hostname**:

1. **Domain Configuration:**
   * **Subdomain:** `acellimut`
   * **Domain:** `haikaldev.my.id` (atau nanti saat ganti ke `acellimut.net`)
   * **Path:** *(kosongkan)*
2. **Service Configuration:**
   * **Type:** `HTTP`
   * **URL:** `localhost:4000` (atau `127.0.0.1:4000` / IP internal container kamu)
3. Klik **Save Hostname**.

Dalam beberapa detik, website `https://acellimut.haikaldev.my.id` sudah online dengan HTTPS aman!

---

### ⚠️ PENTING: Pengaturan Webhook Email & Zero Trust Access Policy
Jika kamu memasang **Cloudflare Access (Login dengan Email/OTP Zero Trust)** untuk melindungi website:
* **Halaman Webmail (`/`)**: Boleh diproteksi Zero Trust Access untuk kamu & Acell.
* **Webhook Email Masuk (`/api/mail/inbound`)**: **JANGAN diproteksi Cloudflare Access Login OTP**, agar Cloudflare Email Worker bisa mengirimkan email belanja/resi masuk dengan header `x-webhook-secret: Senin23062025`.
* Cara setting: Di Zero Trust **Access** &rarr; **Applications** &rarr; Tambahkan Rule **Bypass** untuk path `/api/mail/*`.
