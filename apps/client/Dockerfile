FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/client/package.json apps/client/package.json
COPY services/api/package.json services/api/package.json
ARG TARGETARCH
RUN npm ci \
  && case "$TARGETARCH" in \
    amd64) lightningcss_package=lightningcss-linux-x64-gnu ;; \
    arm64) lightningcss_package=lightningcss-linux-arm64-gnu ;; \
    *) echo "Unsupported build architecture: $TARGETARCH" >&2; exit 1 ;; \
  esac \
  && npm install --no-save --package-lock=false --ignore-scripts "$lightningcss_package@1.32.0"

COPY packages/contracts packages/contracts
COPY apps/client apps/client
ARG EXPO_PUBLIC_API_BASE_URL=/api
ARG EXPO_PUBLIC_API_TIMEOUT_MS=10000
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
ENV EXPO_PUBLIC_API_TIMEOUT_MS=$EXPO_PUBLIC_API_TIMEOUT_MS
RUN npm run build --workspace @airme/contracts && npm run build:web --workspace airme

FROM nginx:1.27-alpine

COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
