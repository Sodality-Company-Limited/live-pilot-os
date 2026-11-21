# Multi-stage production build for LivePilot Approval & Control Service
# Conforms to G-APPR-007, security best practices (unprivileged non-root node user: uid 10001),
# dumb-init signal supervisor, and docs/03-architecture/deployment/digitalocean-droplets-sot.md

# Stage 1: Build & Invariant Test Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json* ./
RUN npm install --ignore-scripts

COPY migrations/ ./migrations/
COPY src/ ./src/
COPY test/ ./test/

# Run static TypeScript typecheck, migration invariants, and full test suite
RUN npm run build
RUN npm test

# Stage 2: Minimal Hardened Production Runtime Image
FROM node:22-alpine AS runner

WORKDIR /app

# Install dumb-init for deterministic PID 1 signal forwarding (SIGTERM / SIGINT)
RUN apk add --no-cache dumb-init

# Security: Create non-root unprivileged livepilot user (uid=10001, gid=10001)
RUN addgroup -g 10001 -S nodejs && \
    adduser -u 10001 -S nodejs -G nodejs

ENV NODE_ENV=production
ENV PORT=8086
ENV HOST=0.0.0.0

COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Run as unprivileged non-root user
USER nodejs

EXPOSE 8086

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8086/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--experimental-strip-types", "src/server.ts"]
