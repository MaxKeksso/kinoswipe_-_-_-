#!/bin/bash
set -e

DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-kinoswipe}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Правильный URL (без ':' если пароль пустой)
if [ -z "$DB_PASSWORD" ]; then
    DB_URL="postgres://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
else
    DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
fi

echo "=================================="
echo "Запуск миграций для базы: ${DB_NAME}"
echo "Пользователь: ${DB_USER}"
echo "=================================="

# Ждём базу с PGPASSWORD
until PGPASSWORD="${DB_PASSWORD}" docker run --rm --network host postgres:16-alpine pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; do
    echo "Ждём базу... (2 сек)"
    sleep 2
done

echo "База готова!"

# Ключевое: явно передаём PGPASSWORD (даже пустой!)
PGPASSWORD="${DB_PASSWORD}" docker run --rm \
    -v "$(pwd)/migrations:/migrations" \
    --network host \
    migrate/migrate:v4.17.0 \
    -path /migrations \
    -database "${DB_URL}" \
    up

echo "=================================="
echo "Миграции успешно применены!"
echo "=================================="