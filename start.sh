#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
bunx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>/dev/null || true

echo "==> Starting scraper service on port 3030..."
cd /app/mini-services/scraper-service
bun run dev &
SCRAPER_PID=$!
cd /app

# Wait for scraper to be ready
echo "==> Waiting for scraper service to be ready..."
sleep 5

# Daily scrape loop in background
(
  while true; do
    echo "==> Running daily scrape..."
    curl -sf http://localhost:3030/scrape/list && echo "Scrape OK" || echo "Scrape failed"
    echo "==> Running db:push..."
    cd /app && bunx prisma db push --schema=/app/prisma/schema.prisma 2>/dev/null || true
    echo "==> Next scrape in 24h"
    sleep 86400
  done
) &

echo "==> Starting Next.js app..."
exec node server.js
