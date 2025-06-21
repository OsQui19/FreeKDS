#!/bin/sh
# Install dependencies if node_modules is missing
if [ ! -d node_modules ]; then
  npm install
fi
exec npm start
