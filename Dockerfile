# ---- Base ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Dependencies (main app) ----
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ---- Dependencies (scraper-service) ----
FROM base AS scraper-deps
WORKDIR /app/mini-services/scraper-service
COPY mini-services/scraper-service/package.json ./
RUN bun install

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---- Runner ----
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Install curl for health checks / scrape trigger
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy scraper-service with its deps
COPY --from=scraper-deps /app/mini-services/scraper-service/node_modules ./mini-services/scraper-service/node_modules
COPY --from=builder /app/mini-services/scraper-service ./mini-services/scraper-service

# Copy entrypoint
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Create db directory
RUN mkdir -p /app/db

EXPOSE 3000
EXPOSE 3030

CMD ["/bin/sh", "/app/start.sh"]
