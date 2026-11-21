FROM node:22-alpine AS runner

WORKDIR /app
RUN addgroup -S livepilot && adduser -S livepilot -G livepilot

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY dist ./dist

USER livepilot

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
