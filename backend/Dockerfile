FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY backend/package.json backend/package.json
COPY app/package.json app/package.json
RUN npm ci

COPY packages/contracts packages/contracts
COPY backend backend
RUN npm run build --workspace @airme/contracts && npm run build --workspace airme-api

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY backend/package.json backend/package.json
COPY app/package.json app/package.json
RUN npm ci --omit=dev --ignore-scripts \
  --workspace @airme/contracts \
  --workspace airme-api \
  --include-workspace-root=false

COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/database ./backend/database

WORKDIR /app/backend
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["sh", "-c", "npm run db:migrate && node dist/src/server.js"]
