#!/bin/sh
set -e

echo "Entrypoint: preparing environment..."

# Try to install PostgreSQL client if not present
if ! command -v pg_isready >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache postgresql-client >/dev/null 2>&1 || true
  elif command -v apt-get >/dev/null 2>&1; then
    apt-get update && apt-get install -y postgresql-client --no-install-recommends >/dev/null 2>&1 || true
  else
    echo "PostgreSQL client not found, skipping readiness check."
  fi
fi

# Database connection details (defaults)
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-boost_hive}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER"; do
    sleep 2
    echo -n "."
  done
  echo "Postgres is ready."
else
  echo "pg_isready not found, skipping DB readiness check."
fi

# Run migrations and generate Prisma client if Prisma is installed
echo "Running Prisma migrations..."
if [ -d prisma/migrations ]; then
  ./node_modules/.bin/prisma migrate deploy || true
else
  echo "No migrations found."
fi
echo "Generating Prisma client..."
./node_modules/.bin/prisma generate || true

# Seed data if seed.cjs exists
if [ -f prisma/seed.cjs ]; then
  echo "Seeding database..."
  node prisma/seed.cjs || true
fi

echo "Starting server..."
exec npm start
