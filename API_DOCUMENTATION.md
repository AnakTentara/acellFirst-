# 🌌 API Documentation: Acell & Haikal Sanctuary

Selamat datang di dokumentasi resmi REST API & Webhook untuk **Acell & Haikal Sanctuary Couple Ecosystem**.
Dokumentasi ini dirancang agar kamu (Haikal) atau siapa pun yang mengembangkan client (Web, Flutter Mobile App, bot notifikasi, Cloudflare Worker) dapat mengintegrasikan seluruh fitur dengan sangat mudah.

---

## 📌 Base URL & Konfigurasi
* **Domain Utama:** `https://acellimut.my.id`
* **Local Development Port:** `http://localhost:23625`
* **Format Request/Response:** `application/json`
* **Headers Wajib untuk Webhook:** `x-webhook-secret: Senin23062025`

---

## 1. 👥 Autentikasi & Profil Pengguna (`/api/auth`)

### 1.1 Ambil Semua Profil Pasangan
* **Endpoint:** `GET /api/auth/profiles`
* **Deskripsi:** Mengambil data profil Haikal & Acell (nama, role, mood, baterai cinta, status).
* **Contoh Response `200 OK`:**
```json
{
  "users": [
    {
      "id": "user_haikal",
      "username": "haikal",
      "display_name": "Haikal",
      "nickname": "My Boy 💙",
      "role": "boy",
      "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      "mood": "💖 Lagi kangen kamu",
      "battery_level": 100
    },
    {
      "id": "user_acell",
      "username": "acell",
      "display_name": "Acell",
      "nickname": "My Girl 💖",
      "role": "girl",
      "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      "mood": "✨ Semangat hari ini!",
      "battery_level": 100
    }
  ]
}
```

### 1.2 Login dengan PIN
* **Endpoint:** `POST /api/auth/login`
* **Payload:**
```json
{
  "username": "acell",
  "pin": "123456"
}
```
* **Contoh Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_acell",
    "username": "acell",
    "display_name": "Acell",
    "role": "girl"
  }
}
```

### 1.3 Update Mood & Level Baterai
* **Endpoint:** `PATCH /api/auth/profile/:id`
* **Payload:**
```json
{
  "mood": "🥰 Bahagia banget hari ini!",
  "batteryLevel": 95
}
```

---

## 2. 💌 Email & Webmail System (`/api/mail`)

### 2.1 Webhook Email Masuk (Cloudflare Inbound)
* **Endpoint:** `POST /api/mail/inbound`
* **Headers:** `x-webhook-secret: Senin23062025`
* **Deskripsi:** Diterima otomatis dari Cloudflare Worker Email Routing ketika ada email masuk ke `@acellimut.my.id`.
* **Payload:**
```json
{
  "from": "order@shopee.co.id",
  "fromName": "Shopee Indonesia",
  "to": "shopping@acellimut.my.id",
  "subject": "Pesanan Shopee Anda Telah Dikirim! [Resi SPX048192841]",
  "text": "Paket Anda dengan nomor resi SPX048192841 sedang menuju alamat.",
  "html": "<div>...</div>"
}
```

### 2.2 Ambil Daftar Email (Inbox & Sent)
* **Endpoint:** `GET /api/mail/inbox`
* **Query Parameters (Opsional):**
  * `type`: `inbox` | `sent` | `all` (default: `all`)
  * `category`: `shopping` | `love` | `personal` | `all`
  * `alias`: `shopping` | `us` | `etall` | `acell` | `haikal`
  * `search`: kata kunci pencarian
  * `starred`: `true` | `false`
* **Contoh Request:** `GET /api/mail/inbox?category=shopping&type=inbox`

### 2.3 Kirim Email Keluar / Surat Cinta (Outbound SMTP)
* **Endpoint:** `POST /api/mail/send`
* **Payload:**
```json
{
  "fromAlias": "us",
  "to": "acell@gmail.com",
  "subject": "Surat Manis untuk Acell 🌌💙",
  "text": "Selamat pagi kesayanganku! Semoga harimu penuh senyuman.",
  "fromName": "Haikal & Acell"
}
```
* **Contoh Response `200 OK`:**
```json
{
  "success": true,
  "emailId": "sent_1723819482912_a8b9c0",
  "isSimulated": false,
  "message": "Email berhasil dikirim secara live ke acell@gmail.com!"
}
```

### 2.4 Uji Koneksi Server SMTP (Handshake Test)
* **Endpoint:** `POST /api/mail/verify-smtp`
* **Payload (Opsional, jika kosong akan menguji SMTP dari `.env`):**
```json
{
  "host": "smtp.resend.com",
  "port": 587,
  "user": "resend",
  "pass": "re_your_api_key",
  "secure": false
}
```

### 2.5 Toggle Bintang / Tandai Dibaca / Hapus
* `PATCH /api/mail/:id/star` &rarr; Toggle status berbintang
* `PATCH /api/mail/:id/read` &rarr; Payload: `{"role": "girl"}`
* `DELETE /api/mail/:id` &rarr; Menghapus email

---

## 3. 🛍️ E-Commerce & Resi Paket Tracker (`/api/shopping`)

### 3.1 Ambil Semua Paket & Belanjaan
* **Endpoint:** `GET /api/shopping/items`
* **Query Parameters:** `status=shipping` | `delivered` | `processing` | `all`
* **Contoh Response:**
```json
{
  "items": [
    {
      "id": "shop_item_001",
      "platform": "Shopee",
      "order_id": "#260816SHP",
      "tracking_number": "SPXID048192841",
      "courier": "SPX Express",
      "item_title": "Galactic Blue Aesthetic Keyboard & Desk Mat",
      "total_price": 285000,
      "currency": "IDR",
      "status": "shipping",
      "estimated_delivery": "Besok Sore",
      "created_at": "2026-08-16T06:00:00.000Z"
    }
  ]
}
```

### 3.2 Tambah Paket Manual
* **Endpoint:** `POST /api/shopping/manual`
* **Payload:**
```json
{
  "itemTitle": "Buku Jurnal Aesthetic & Cute Pen Set",
  "platform": "Tokopedia",
  "courier": "SiCepat",
  "trackingNumber": "004918274192",
  "totalPrice": 120000,
  "notes": "Buku catatan impian kita"
}
```

### 3.3 Update Status Paket
* **Endpoint:** `PATCH /api/shopping/:id/status`
* **Payload:** `{"status": "delivered"}` *(Pilihan: `processing`, `shipping`, `delivered`)*

---

## 4. 💖 Surat Cinta & Kapsul Waktu (`/api/love`)

### 4.1 Hitung Hari Bersama (Anniversary Counter)
* **Endpoint:** `GET /api/love/counter`
* **Contoh Response `200 OK`:**
```json
{
  "anniversaryDate": "2025-06-23",
  "daysTogether": 419,
  "togetherString": "419 Hari Bersama 💕",
  "months": 13,
  "years": 1
}
```

### 4.2 Ambil Semua Surat Cinta
* **Endpoint:** `GET /api/love/letters?userId=user_acell`
* **Kapsul Waktu:** Jika `is_locked = 1` dan `unlock_date` belum tiba, konten surat disamarkan sebagai `🔒 [Terkunci di dalam Kapsul Waktu]`.

### 4.3 Tulis Surat Cinta Baru / Kunci Kapsul Waktu
* **Endpoint:** `POST /api/love/letters`
* **Payload:**
```json
{
  "authorId": "user_haikal",
  "recipientId": "user_acell",
  "title": "Untuk Acell di Ulang Tahun Nanti 🌸",
  "content": "Selamat ulang tahun sayang! Ini surat rahasia yang kutulis dari dulu.",
  "musicUrl": "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
  "themeColor": "#2563eb",
  "isLocked": true,
  "unlockDate": "2026-12-25 00:00:00"
}
```

---

## 5. ✨ Shared Wishlist (`/api/wishlist`)

* `GET /api/wishlist/items` &rarr; Ambil semua daftar barang impian
* `POST /api/wishlist/items` &rarr; Tambah item baru
* `PATCH /api/wishlist/:id/bought` &rarr; Tandai barang sudah dibeli (akan memunculkan animasi konfeti)
* `DELETE /api/wishlist/:id` &rarr; Hapus item dari wishlist

---

## 6. 🌐 Real-Time Live Sync (Server-Sent Events)

* **Endpoint:** `GET /api/system/events`
* **Protokol:** SSE (`text/event-stream`)
* **Event Types:**
  * `new_email`: Saat ada email resi atau surat baru masuk secara real-time.
  * `outbound_email_sent`: Saat ada email yang berhasil dikirim.
  * `profile_updated`: Saat mood atau baterai cinta diubah pasangan.
  * `domain_switch`: Saat domain sistem dialihkan.
