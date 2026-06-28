# Multi-stage Dockerfile for FoodLink.
# Stage 1 builds with full toolchain; Stage 2 ships only what we need.

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Native deps needed by bcrypt during install
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    LOG_DIR=/var/log/foodlink

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /var/log/foodlink /app/public/uploads \
 && chown -R app:app /var/log/foodlink /app

COPY --chown=app:app --from=build /app/node_modules ./node_modules
COPY --chown=app:app . .

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
