# Multi-stage production build for LivePilot Margin Policy Service
# Conforms to G-MARG-007, security best practices (non-root unprivileged user),
# and docs/03-architecture/deployment/runtime-topology-sot.md

# Stage 1: Build & Invariant Test Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY migrations/ ./migrations/
COPY src/ ./src/
COPY test/ ./test/

# Run unit tests to guarantee zero regressions during image build
RUN npm test

# Stage 2: Minimal Production Runtime Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8084
ENV HOST=0.0.0.0

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

COPY migrations/ ./migrations/
COPY src/ ./src/

# Security: run as unprivileged non-root node user (uid=1000, gid=1000)
USER node

EXPOSE 8084

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8084/healthz || exit 1

CMD ["node", "src/server.mjs"]
