#!/bin/sh
set -e

cat > /usr/share/nginx/html/env-config.js << EOF
window.__ENV__ = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost:3000}",
  LOG_LEVEL: "${LOG_LEVEL:-INFO}"
};
EOF

exec nginx -g "daemon off;"
