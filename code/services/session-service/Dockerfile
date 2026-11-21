# Multi-stage production build for session-service
# Stage 1: Build & Typecheck
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Security & Process isolation invariants:
# Install dumb-init for proper PID 1 signal forwarding (SIGTERM/SIGINT)
RUN apk add --no-cache dumb-init

# Non-root user execution
# node:22-alpine already provides a default unprivileged 'node' user (uid=1000, gid=1000)
ENV NODE_ENV=production
ENV PORT=3004
ENV HOST=0.0.0.0

# Copy production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JavaScript output and database migrations
COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/

# Ensure ownership by unprivileged node user
RUN chown -R node:node /app

USER node

EXPOSE 3004

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3004/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
