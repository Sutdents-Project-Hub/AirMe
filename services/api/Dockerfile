FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/api/package.json services/api/package.json
COPY apps/client/package.json apps/client/package.json
RUN npm ci

COPY packages/contracts packages/contracts
COPY services/api services/api
RUN npm run build --workspace @airme/contracts && npm run build --workspace airme-api

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/services/api ./services/api

WORKDIR /app/services/api
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["sh", "-c", "npm run db:migrate && node dist/src/server.js"]
