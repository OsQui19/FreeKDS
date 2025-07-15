#!/bin/sh

# Ensure log directory exists
LOG_DIR="${LOG_DIR:-./logs}"
mkdir -p "$LOG_DIR"

# If a DB host is provided, wait for the database port to be reachable
if [ -n "$DB_HOST" ]; then
  DB_PORT="${DB_PORT:-3306}"
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  until nc -z "$DB_HOST" "$DB_PORT"; do
    sleep 2
  done
fi

exec npm start
