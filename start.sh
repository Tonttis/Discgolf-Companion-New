#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
bunx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>/dev/null || true

echo "==> Starting scraper service on port 3030..."
cd /app/mini-services/scraper-service
bun run dev &
cd /app

# Wait for scraper port to open using /bin/sh TCP check
echo "==> Waiting for scraper service to be ready..."
for i in $(seq 1 30); do
  # Use bash TCP pseudo-device to check if port is open
  if (echo > /dev/tcp/localhost/3030) 2>/dev/null; then
    echo "==> Scraper port open after ${i}s"
    break
  fi
  sleep 1
done

# Daily scrape loop in background - starts with a 10s delay to let scraper fully init
(
  echo "==> Waiting 10s before first scrape..."
  sleep 10
  while true; do
    echo "==> Running daily scrape..."
    curl -sf --max-time 30 http://localhost:3030/scrape/list && echo "Scrape OK" || echo "Scrape failed"
    echo "==> Running db:push..."
    cd /app && bunx prisma db push --schema=/app/prisma/schema.prisma 2>/dev/null || true
    echo "==> Next scrape in 24h"
    sleep 86400
  done
) &

echo "==> Starting Next.js app..."
exec node server.js
