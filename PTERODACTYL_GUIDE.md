# Panduan Deployment di Pterodactyl Panel (Hemat RAM < 60MB)

Karena kamu adalah admin di panel Pterodactyl temanmu, berikut cara termudah dan teringan untuk menjalankannya:

### 1. Buat Server Baru di Pterodactyl
* **Egg:** Gunakan **Generic Node.js Egg** (Node.js 18, 20, atau 22).
* **RAM:** Alokasikan 512 MB atau 1 GB (sistem ini hanya memakai ~45 MB RAM!).
* **Disk:** 2 - 5 GB.
* **Port Allocation:** Alokasikan 1 Port (misal: `4000` atau port yang diberikan server).

### 2. Upload File Project
Kamu cukup upload folder:
* `backend/`
* `frontend/dist/` (sudah kita build, jadi Pterodactyl tidak perlu compile frontend lagi)
* `.env` (isi sesuai domain dan port yang dialokasikan)
* `package.json`

### 3. Startup Command di Pterodactyl
Pada tab **Startup**:
* **Startup Command:** `node backend/src/server.js` (atau `npm start`)
* Server akan langsung running dan melayani API + Web Frontend Liquid Glass di port tersebut.

### 4. Reverse Proxy / Domain Subdomain
Arahkan subdomain kamu di Cloudflare / Nginx Reverse Proxy:
* Misal: `acellimut.haikaldev.my.id` &rarr; `IP_NODE_PTERODACTYL:PORT`
* Aktifkan SSL di Cloudflare (Full / Strict).
