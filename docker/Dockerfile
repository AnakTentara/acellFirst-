# Multi-stage build for Acell & Haikal Sanctuary
# Runtime footprint ~45MB — fits a 512MB Pterodactyl container.
#
# Node 22 is a hard requirement, not a preference: backend/src/db.js opens the
# database with the built-in `node:sqlite` module, which does not exist in
# Node 20. On node:20-alpine the app fell back to the `sqlite3` package that
# isn't in the dependency list, and crashed on boot.

FROM node:22-alpine AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=23625

COPY backend/package*.json ./backend/
RUN cd backend && (npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund)

COPY backend/ ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist

# SQLite database + the generated secret store both live here.
VOLUME ["/app/backend/data"]

EXPOSE 23625

# Don't run as root — a compromised email parser shouldn't own the container.
RUN mkdir -p /app/backend/data && chown -R node:node /app
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||23625)+'/api/system/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/src/server.js"]
