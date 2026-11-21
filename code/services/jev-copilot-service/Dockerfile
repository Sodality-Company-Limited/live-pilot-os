# Multi-stage production build for LivePilot JEV Copilot Service
# Conforms to G-JEVC-009, security hardening invariants (non-root unprivileged user),
# dumb-init signal handling, and docs/03-architecture/deployment/runtime-topology-sot.md

# Stage 1: Build & Invariant Test Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dumb-init in builder or runner
RUN apk add --no-cache dumb-init

COPY package.json ./

COPY migrations/ ./migrations/
COPY src/ ./src/
COPY test/ ./test/

# Run unit and contract test suites to guarantee zero regressions during image build
RUN node --test test/*.test.mjs

# Stage 2: Minimal Production Runtime Image
FROM node:22-alpine AS runner

WORKDIR /app

# Process supervision invariant: dumb-init forwards SIGTERM/SIGINT cleanly to Node
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=8085
ENV HOST=0.0.0.0
ENV APP_ENV=prod
ENV JEV_EXECUTION_MODE=SIMULATED

COPY package.json ./

COPY migrations/ ./migrations/
COPY src/ ./src/

# Security invariant: run as unprivileged non-root node user (uid=1000, gid=1000)
RUN chown -R node:node /app
USER node

EXPOSE 8085

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8085/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.mjs"]
