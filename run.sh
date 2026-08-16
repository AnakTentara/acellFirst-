#!/bin/bash

# ========================================================
#   💑 ACEL & HAIKAL SANCTUARY - PTERODACTYL RUN SCRIPT
# ========================================================

# 1. Kunci direktori root aplikasi agar tidak pernah tersesat ke subfolder
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR" || exit 1

echo "✨ Memulai Acell & Haikal Sanctuary Couple Ecosystem..."
echo "📂 Lokasi Root: $ROOT_DIR"

# 2. Gunakan port unik 23625 (23-06-25 Anniversary) atau port Pterodactyl ($SERVER_PORT)
if [ -n "$SERVER_PORT" ]; then
  export PORT=$SERVER_PORT
elif [ -z "$PORT" ]; then
  export PORT=23625
fi

# 3. Cek file .env di root
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "📝 Membuat file .env default..."
  cat <<EOT > "$ROOT_DIR/.env"
PORT=${PORT}
NODE_ENV=production
JWT_SECRET=Senin23062025
WEBHOOK_SECRET=Senin23062025

BOY_NAME=Haikal
BOY_NICKNAME=Prince 👑
GIRL_NAME=Acell
GIRL_NICKNAME=Princess 👑
ANNIVERSARY_DATE=2025-06-23

ACTIVE_DOMAIN=acellimut.my.id
STAGING_DOMAIN=acellimut.my.id
PRIMARY_DOMAIN=acellimut.my.id
EOT
fi

# 4. Cek dependensi backend (Pastikan selalu kembali ke root)
if [ ! -d "$ROOT_DIR/backend/node_modules" ] || [ -d "$ROOT_DIR/backend/node_modules/sqlite3" ]; then
  echo "📦 Menyesuaikan dependencies backend (Zero C++ bindings mode)..."
  rm -rf "$ROOT_DIR/backend/node_modules/sqlite3" 2>/dev/null || true
  (cd "$ROOT_DIR/backend" && npm install --omit=dev)
fi

# 5. Cek build frontend
if [ ! -f "$ROOT_DIR/frontend/dist/index.html" ]; then
  echo "🎨 Mengompilasi frontend webmail Liquid Glass..."
  (cd "$ROOT_DIR/frontend" && npm install && npm run build)
fi

# 6. Pastikan berada di root sebelum menjalankan Node.js
cd "$ROOT_DIR" || exit 1
echo "🚀 Menjalankan server di port $PORT..."
exec node backend/src/server.js
