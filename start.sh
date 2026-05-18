#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
bunx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>/dev/null || true

echo "==> Starting scraper service on port 3030..."
cd /app/mini-services/scraper-service
bun run dev &
cd /app

# Wait for scraper to actually be ready by polling port 3030
echo "==> Waiting for scraper service to be ready..."
SCRAPER_READY=0
for i in $(seq 1 30); do
  if curl -sf http://localhost:3030/scrape/list -o /dev/null 2>/dev/null; then
    SCRAPER_READY=1
    echo "==> Scraper ready after ${i}s"
    break
  fi
  sleep 1
done

if [ "$SCRAPER_READY" = "0" ]; then
  echo "==> Warning: scraper not ready after 30s, continuing anyway"
fi

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
