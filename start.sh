#!/bin/sh

# Ensure log directory exists
LOG_DIR="${LOG_DIR:-./logs}"
mkdir -p "$LOG_DIR"

# If a DB host is provided, wait for the database port to be reachable
if [ -n "$DB_HOST" ]; then
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
fi

# Build React assets if missing
if [ ! -d "./public/dist" ]; then
  npm run build
fi

exec npm start
