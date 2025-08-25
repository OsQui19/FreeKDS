#!/usr/bin/env bash
set -euo pipefail

# Ensure log directory exists
LOG_DIR="${LOG_DIR:-./logs}"
mkdir -p "$LOG_DIR"

# If a DB host is provided, optionally wait for the database port to be reachable
if [ -n "${DB_HOST:-}" ] && [ -z "${SKIP_DB_WAIT:-}" ]; then
  if command -v nc >/dev/null 2>&1; then
    DB_PORT="${DB_PORT:-3306}"
    DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-60}"
    echo "Waiting for database at $DB_HOST:$DB_PORT (timeout: ${DB_WAIT_TIMEOUT}s)..."
    start_time=$(date +%s)
    while ! nc -z "$DB_HOST" "$DB_PORT"; do
      now=$(date +%s)
      elapsed=$((now - start_time))
      if [ "$elapsed" -ge "$DB_WAIT_TIMEOUT" ]; then
        echo "Database not reachable after ${DB_WAIT_TIMEOUT}s" >&2
        exit 1
      fi
      sleep 2
    done
  else
    echo "Warning: nc (netcat) not installed; skipping database wait." >&2
  fi
fi

# Build React assets if missing
if [ ! -f "./public/dist/app.js" ]; then
  npm run build
fi

# Verify built bundle exists
if [ ! -f "./public/dist/app.js" ]; then
  echo "Error: public/dist/app.js not found. Run 'npm run build' to generate frontend assets." >&2
  exit 1
fi

exec node server.js
