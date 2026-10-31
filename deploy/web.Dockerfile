# Expo web bundle served by nginx. Build context: repository root.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/ ./
# Public base URL of the API (same origin as the web app in production, e.g. https://order.example.com)
ARG EXPO_PUBLIC_API_URL
RUN test -n "$EXPO_PUBLIC_API_URL" || (echo "build arg EXPO_PUBLIC_API_URL is required" && exit 1)
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export --platform web --output-dir dist

# ---- serve ----
FROM nginx:1.27-alpine
COPY deploy/nginx/web-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
