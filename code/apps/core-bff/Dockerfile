# Multi-stage Containerfile for Core BFF Service
# Security invariants: Alpine base, non-root user (livepilot:livepilot), dumb-init process reaper.

FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json tsconfig.json ./
COPY src/ ./src/

RUN npm install -g typescript && tsc -b

FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init ca-certificates && \
    addgroup -g 10001 -S livepilot && \
    adduser -u 10001 -S livepilot -G livepilot

WORKDIR /app

COPY --from=builder --chown=livepilot:livepilot /build/package.json ./
COPY --from=builder --chown=livepilot:livepilot /build/dist ./dist

USER livepilot:livepilot

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
