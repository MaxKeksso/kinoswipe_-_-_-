#!/bin/bash

# Финальный скрипт для запуска всего проекта с новыми функциями

echo "🚀 Запуск KinoSwipe с новыми функциями..."
echo ""

cd /Users/maksimzagorodnev/Downloads/kinoswipe

# Проверка Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен! Запустите Docker Desktop."
    exit 1
fi

echo "✅ Docker запущен"
echo ""

# Шаг 1: Установка зависимости (если нужно)
echo "📦 Шаг 1: Проверка зависимостей..."
if ! grep -q "golang.org/x/crypto" go.mod; then
    echo "   Добавление зависимости bcrypt..."
    echo 'require golang.org/x/crypto v0.17.0' >> go.mod
fi
echo "✅ Зависимости готовы"
echo ""

# Шаг 2: Пересборка backend
echo "🔨 Шаг 2: Пересборка backend..."
docker-compose build app
if [ $? -ne 0 ]; then
    echo "❌ Ошибка пересборки backend"
    exit 1
fi
echo "✅ Backend пересобран"
echo ""

# Шаг 3: Пересборка frontend
echo "🎨 Шаг 3: Пересборка frontend..."
docker-compose build frontend
if [ $? -ne 0 ]; then
    echo "❌ Ошибка пересборки frontend"
    exit 1
fi
echo "✅ Frontend пересобран"
echo ""

# Шаг 4: Перезапуск всех сервисов
echo "🔄 Шаг 4: Перезапуск сервисов..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ Ошибка перезапуска сервисов"
    exit 1
fi
echo "✅ Сервисы перезапущены"
echo ""

# Ждем запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 5

# Проверка статуса
echo ""
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "✅ Все готово!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080/api/v1"
echo ""
echo "📝 Данные для входа админа:"
echo "   Email: admin@kinoswipe.ru"
echo "   Пароль: admin123"
echo ""
echo "⚠️  ВАЖНО: Очистите кеш браузера (Cmd+Shift+R)!"
echo ""
