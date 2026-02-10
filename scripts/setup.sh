#!/usr/bin/env bash
set -euo pipefail

echo "=== Realm of Crowns - First-Time Setup ==="
echo ""

# Check required tools
for cmd in node npm docker; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

echo "[1/6] Tools verified: node $(node -v), npm $(npm -v), docker $(docker --version | cut -d' ' -f3)"

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[2/6] Created .env from .env.example"
else
  echo "[2/6] .env already exists, skipping"
fi

# Install dependencies
echo "[3/6] Installing npm dependencies..."
npm install

# Start database and cache
echo "[4/6] Starting PostgreSQL and Redis containers..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# Wait for postgres
echo "[5/6] Waiting for PostgreSQL to be ready..."
until docker compose exec postgres pg_isready -U roc_user -d realm_of_crowns &> /dev/null; do
  sleep 1
done
echo "       PostgreSQL is ready."

# Run migrations and seed
echo "[6/6] Running database migrations and seed..."
npx prisma migrate deploy --schema=database/prisma/schema.prisma
npm run db:seed

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Start development servers:"
echo "  npm run dev"
echo ""
echo "Client: http://localhost:3000"
echo "Server: http://localhost:4000"
echo ""
