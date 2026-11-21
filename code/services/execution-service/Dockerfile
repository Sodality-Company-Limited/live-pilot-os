FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY src ./src
COPY tsconfig.json ./
RUN npx tsc

FROM node:22-alpine AS runner

WORKDIR /app
RUN addgroup -S livepilot && adduser -S livepilot -G livepilot

ENV NODE_ENV=production
ENV PORT=3004

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist

USER livepilot

EXPOSE 3004

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3004/healthz || exit 1

CMD ["node", "dist/index.js"]
