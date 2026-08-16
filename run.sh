#!/bin/bash

# ========================================================
#   💑 ACELL & HAIKAL SANCTUARY - PTERODACTYL RUN SCRIPT
# ========================================================

set -u

# 1. Kunci direktori root aplikasi agar tidak pernah tersesat ke subfolder
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR" || exit 1

echo "✨ Memulai Acell & Haikal Sanctuary Couple Ecosystem..."
echo "📂 Lokasi Root: $ROOT_DIR"

# 2. Node 22+ wajib: backend memakai node:sqlite bawaan (tanpa binding C++).
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌ Node.js $NODE_MAJOR terdeteksi. Butuh Node 22 atau lebih baru."
  echo "   Ubah Docker Image di panel Pterodactyl ke node:22 lalu restart."
  exit 1
fi

# 3. Gunakan port unik 23625 (23-06-25 Anniversary) atau port Pterodactyl
if [ -n "${SERVER_PORT:-}" ]; then
  export PORT=$SERVER_PORT
elif [ -z "${PORT:-}" ]; then
  export PORT=23625
fi

# 4. Cek file .env di root.
#    Secret TIDAK ditulis di sini. Dulu file ini menulis JWT_SECRET dan
#    WEBHOOK_SECRET berisi 'Senin23062025' — nilai yang sudah bocor di git
#    history publik. Sekarang backend membuat secret acak sendiri dan
#    menyimpannya di backend/data/.secrets.json (di luar git).
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "📝 Membuat file .env default (tanpa secret)..."
  cat <<EOT > "$ROOT_DIR/.env"
PORT=${PORT}
NODE_ENV=production

BOY_NAME=Haikal
BOY_NICKNAME=Prince 👑
GIRL_NAME=Acell
GIRL_NICKNAME=Princess 👑
ANNIVERSARY_DATE=2025-06-23

ACTIVE_DOMAIN=acellimut.my.id
STAGING_DOMAIN=acellimut.my.id
PRIMARY_DOMAIN=acellimut.my.id

# Isi kalau sudah punya API key tracking kurir (BinderByte):
# COURIER_API_KEY=
EOT
fi

# 5. Dependensi backend.
#    Kondisi lama: `[ ! -d node_modules ] || [ -d node_modules/sqlite3 ]`.
#    npm install memasang ulang sqlite3 tiap kali, sehingga syarat kedua
#    selalu benar dan install berjalan lagi di SETIAP restart.
if [ ! -d "$ROOT_DIR/backend/node_modules" ]; then
  echo "📦 Memasang dependencies backend..."
  (cd "$ROOT_DIR/backend" && npm install --omit=dev --no-audit --no-fund) || exit 1
fi

# 6. Build frontend.
#    Rebuild kalau dist belum ada ATAU source lebih baru dari bundle —
#    sebelumnya hanya dicek "ada/tidak", jadi `git pull` yang membawa
#    perubahan UI tidak pernah benar-benar terpasang.
DIST_INDEX="$ROOT_DIR/frontend/dist/index.html"
NEEDS_BUILD=0

if [ ! -f "$DIST_INDEX" ]; then
  NEEDS_BUILD=1
elif [ -n "$(find "$ROOT_DIR/frontend/src" "$ROOT_DIR/frontend/index.html" \
              -newer "$DIST_INDEX" -print -quit 2>/dev/null)" ]; then
  echo "🔄 Source frontend lebih baru dari bundle — build ulang."
  NEEDS_BUILD=1
fi

if [ "$NEEDS_BUILD" -eq 1 ]; then
  echo "🎨 Mengompilasi frontend webmail Liquid Glass..."
  (cd "$ROOT_DIR/frontend" && npm install --no-audit --no-fund && npm run build) || {
    echo "⚠️ Build frontend gagal."
    # Bundle lama masih lebih baik daripada layar putih.
    [ -f "$DIST_INDEX" ] || { echo "❌ Tidak ada bundle sama sekali. Berhenti."; exit 1; }
    echo "   Melanjutkan dengan bundle lama yang masih ada."
  }
fi

# 7. Pastikan berada di root sebelum menjalankan Node.js
cd "$ROOT_DIR" || exit 1
echo "🚀 Menjalankan server di port $PORT..."
exec node backend/src/server.js
