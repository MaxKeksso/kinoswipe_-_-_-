#!/bin/bash
# Останавливает сервисы, очищает кэш, перезапускает проект.

set -e
cd "$(dirname "$0")"

echo "🛑 Останавливаем сервисы..."
docker-compose down 2>/dev/null || true

echo "🧹 Очистка кэша..."
go clean -cache 2>/dev/null || true
rm -rf frontend/node_modules/.cache frontend/build .eslintcache 2>/dev/null || true
echo "   — Go cache"
echo "   — frontend/node_modules/.cache, frontend/build"

echo ""
echo "🔄 Запуск сервисов..."
docker-compose up -d

echo ""
echo "⏳ Ожидание запуска (5 сек)..."
sleep 5
docker-compose ps

echo ""
echo "✅ Готово."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080/api/v1"
echo ""
echo "⚠️  В браузере нажми Cmd+Shift+R (или Ctrl+Shift+R) для жёсткой перезагрузки без кэша."
