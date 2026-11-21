# Production build for LivePilot Inventory Service
FROM node:20-alpine AS runner

WORKDIR /app

# Add unprivileged user for security
RUN addgroup -S livepilot && adduser -S livepilot -G livepilot

COPY --chown=livepilot:livepilot package.json ./
COPY --chown=livepilot:livepilot src/ ./src/
COPY --chown=livepilot:livepilot migrations/ ./migrations/

USER livepilot

EXPOSE 3005
ENV NODE_ENV=production
ENV PORT=3005

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/healthz || exit 1

CMD ["node", "src/index.js"]
