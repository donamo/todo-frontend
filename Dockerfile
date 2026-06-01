FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─────────────────────────────────────────────
FROM nginx:stable-alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/dist/favicon.ico /usr/share/nginx/html/favicon.ico
COPY --from=builder /app/dist/favicon.svg /usr/share/nginx/html/favicon.svg
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- --timeout=2 http://localhost:80/health | grep -q 'ok' || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
