#!/bin/bash

# Скрипт для проверки базы данных в Docker контейнере

echo "🔍 Проверка базы данных KinoSwipe в Docker..."
echo ""

# Подключение к базе данных в Docker контейнере
echo "📊 Список таблиц:"
docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe -c "\dt"

echo ""
echo "📋 Версия миграций:"
docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe -c "SELECT version FROM schema_migrations;"

echo ""
echo "👥 Последние пользователи:"
docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe -c "SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "💡 Для подключения через psql используйте:"
echo "   docker-compose exec postgres psql -U kinoswipe -d kinoswipe"
