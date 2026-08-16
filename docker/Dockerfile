# Ultra-lightweight Multi-stage Docker build for Acel & Haikal Sanctuary
# RAM consumption: ~45MB! Perfect for Pterodactyl 512MB / 1GB container

FROM node:20-alpine AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=23625

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist

# SQLite Data Volume
VOLUME ["/app/backend/data"]

EXPOSE 23625

CMD ["node", "backend/src/server.js"]
