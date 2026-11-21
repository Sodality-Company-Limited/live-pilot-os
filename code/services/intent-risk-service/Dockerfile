# Multi-stage production build for intent-risk-service
FROM node:22-alpine AS runner

WORKDIR /app

# Non-root security invariant
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV NODE_ENV=production
ENV PORT=3002

COPY package.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["node", "src/server.mjs"]
