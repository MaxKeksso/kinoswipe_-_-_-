#!/bin/bash

# Скрипт для инициализации базы данных
# Использование: ./scripts/init_db.sh

set -e

echo "Инициализация базы данных KinoSwipe..."

# Проверка наличия migrate
if ! command -v migrate &> /dev/null; then
    echo "Ошибка: golang-migrate не установлен"
    echo "Установите его: brew install golang-migrate (macOS) или с https://github.com/golang-migrate/migrate"
    exit 1
fi

# Параметры подключения к БД
DB_USER="${DB_USER:-kinoswipe}"
DB_PASSWORD="${DB_PASSWORD:-kinoswipe123}"
DB_NAME="${DB_NAME:-kinoswipe}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

echo "Подключение к БД: ${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Применение миграций
echo "Применение миграций..."
migrate -path ./migrations -database "${DB_URL}" up

echo "Миграции применены успешно!"

# Опционально: заполнение тестовыми данными
read -p "Заполнить базу тестовыми фильмами? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Заполнение тестовыми данными..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f scripts/seed_movies.sql
    echo "Тестовые данные добавлены!"
fi

echo "Инициализация завершена!"

