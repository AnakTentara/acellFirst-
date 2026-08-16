#!/bin/bash

# ========================================================
#   💑 ACEL & HAIKAL SANCTUARY - PTERODACTYL RUN SCRIPT
# ========================================================

echo "✨ Memulai Acell & Haikal Sanctuary Couple Ecosystem..."

# 1. Gunakan port unik 23625 (23-06-25 Anniversary) atau port Pterodactyl
if [ -n "$SERVER_PORT" ]; then
  export PORT=$SERVER_PORT
elif [ -z "$PORT" ]; then
  export PORT=23625
fi

# 2. Cek file .env
if [ ! -f .env ]; then
  echo "📝 Membuat file .env default..."
  cat <<EOT > .env
PORT=${PORT}
NODE_ENV=production
JWT_SECRET=Senin23062025
WEBHOOK_SECRET=Senin23062025

BOY_NAME=Haikal
BOY_NICKNAME=My Boy 💙
GIRL_NAME=Acell
GIRL_NICKNAME=My Girl 💖
ANNIVERSARY_DATE=2025-06-23

ACTIVE_DOMAIN=acellimut.my.id
STAGING_DOMAIN=acellimut.my.id
PRIMARY_DOMAIN=acellimut.my.id
EOT
fi

# 3. Cek dependensi backend
if [ ! -d "backend/node_modules" ] || [ -d "backend/node_modules/sqlite3" ]; then
  echo "📦 Menyesuaikan dependencies backend (Zero C++ bindings mode)..."
  rm -rf backend/node_modules/sqlite3 2>/dev/null || true
  cd backend && npm install --omit=dev && cd ..
fi

# 4. Cek build frontend jika belum ada
if [ ! -d "frontend/dist" ]; then
  echo "🎨 Mengompilasi frontend webmail Liquid Glass..."
  cd frontend && npm install && npm run build && cd ..
fi

echo "🚀 Menjalankan server di port $PORT..."
node backend/src/server.js
