# Multi-stage Containerfile for Core BFF Service
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json tsconfig.json ./
RUN npm install --ignore-scripts
COPY src/ ./src/
COPY test/ ./test/

RUN npx tsc -b

FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init ca-certificates && \
    addgroup -g 10001 -S livepilot && \
    adduser -u 10001 -S livepilot -G livepilot

WORKDIR /app

COPY --from=builder --chown=livepilot:livepilot /build/package.json ./
COPY --from=builder --chown=livepilot:livepilot /build/dist ./dist

USER livepilot:livepilot

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
