#!/bin/sh
# Install dependencies if node_modules is missing
if [ ! -d node_modules ]; then
  npm install
fi

# If a DB host is provided, wait for the database port to be reachable
if [ -n "$DB_HOST" ]; then
  DB_PORT="${DB_PORT:-3306}"
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  until nc -z "$DB_HOST" "$DB_PORT"; do
    sleep 2
  done
fi

exec npm start
