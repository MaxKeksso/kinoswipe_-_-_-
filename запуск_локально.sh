#!/bin/bash
# Запуск KinoSwipe без Docker: бэкенд + фронтенд

cd "$(dirname "$0")"

echo "🔄 Останавливаем старые процессы на портах 8080 и 3000..."
for port in 8080 3000; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null
    echo "   Порт $port освобождён"
  fi
done
sleep 1

echo ""
echo "📂 Загружаем переменные из .env (если есть)..."
[ -f .env ] && export $(grep -v '^#' .env | xargs)

echo "▶️  Запускаем бэкенд (Go) на http://localhost:8080 ..."
go run cmd/server/main.go &
BACKEND_PID=$!
sleep 2

if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "❌ Бэкенд не запустился. Проверьте:"
  echo "   - PostgreSQL запущен (или задайте DATABASE_URL в .env)"
  echo "   - Миграции применены: ./применить_миграции.sh"
  exit 1
fi

echo "▶️  Запускаем фронтенд (React) на http://localhost:3000 ..."
cd frontend && npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Сервисы запущены:"
echo "   Бэкенд:  http://localhost:8080  (PID $BACKEND_PID)"
echo "   Фронт:   http://localhost:3000  (PID $FRONTEND_PID)"
echo ""
echo "Открой в браузере: http://localhost:3000"
echo "Остановка: Ctrl+C или закрой этот терминал"
echo ""

# Под macOS открыть браузер через 5 сек
(sleep 5 && open http://localhost:3000 2>/dev/null) &

wait $FRONTEND_PID 2>/dev/null
kill $BACKEND_PID 2>/dev/null
