#!/bin/bash

# ========================================================
#   💑 ACEL & HAIKAL SANCTUARY - PTERODACTYL RUN SCRIPT
# ========================================================

echo "✨ Memulai Acel & Haikal Sanctuary Couple Ecosystem..."

# 1. Gunakan port yang dialokasikan oleh Pterodactyl jika ada
if [ -n "$SERVER_PORT" ]; then
  export PORT=$SERVER_PORT
elif [ -z "$PORT" ]; then
  export PORT=4000
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

ACTIVE_DOMAIN=acellimut.haikaldev.my.id
STAGING_DOMAIN=acellimut.haikaldev.my.id
PRIMARY_DOMAIN=acellimut.net
EOT
fi

# 3. Cek dependensi backend
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Menginstall dependencies backend..."
  cd backend && npm install --omit=dev && cd ..
fi

# 4. Cek build frontend jika belum ada
if [ ! -d "frontend/dist" ]; then
  echo "🎨 Mengompilasi frontend webmail Liquid Glass..."
  cd frontend && npm install && npm run build && cd ..
fi

echo "🚀 Menjalankan server di port $PORT..."
node backend/src/server.js
