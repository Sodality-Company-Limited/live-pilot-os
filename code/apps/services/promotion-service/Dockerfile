FROM node:22.11.0-bookworm-slim AS build

WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY src ./src
RUN npm run build

FROM node:22.11.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PROMOTION_HTTP_HOST=0.0.0.0 \
    PROMOTION_HTTP_PORT=3000

WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
