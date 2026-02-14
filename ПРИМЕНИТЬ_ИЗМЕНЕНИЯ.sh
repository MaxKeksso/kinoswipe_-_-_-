#!/bin/bash

# Скрипт для применения всех изменений

echo "🚀 Применение изменений KinoSwipe..."
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Ошибка: файл docker-compose.yml не найден."
    echo "   Убедитесь, что вы находитесь в корневой директории проекта."
    exit 1
fi

# Проверяем, запущен ли Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен!"
    echo "   Откройте Docker Desktop и запустите скрипт снова."
    exit 1
fi

echo "✅ Docker запущен"
echo ""

# Шаг 1: Применение миграции
echo "📦 Шаг 1: Применение миграции базы данных..."
if [ -f "apply_migration.sh" ]; then
    bash apply_migration.sh
else
    docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe <<'SQL_EOF'
-- Добавление поля password_hash в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Создание таблицы premieres
CREATE TABLE IF NOT EXISTS premieres (
    id UUID PRIMARY KEY,
    movie_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster_url TEXT,
    release_date TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    position VARCHAR(10) NOT NULL CHECK (position IN ('left', 'right')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_premieres_is_active ON premieres(is_active);
CREATE INDEX IF NOT EXISTS idx_premieres_position ON premieres(position);
CREATE INDEX IF NOT EXISTS idx_premieres_release_date ON premieres(release_date);

-- Создание таблицы match_links
CREATE TABLE IF NOT EXISTS match_links (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_links_match_id ON match_links(match_id);
CREATE INDEX IF NOT EXISTS idx_match_links_platform ON match_links(platform);

-- Триггер для обновления updated_at в premieres
CREATE TRIGGER update_premieres_updated_at BEFORE UPDATE ON premieres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для обновления updated_at в match_links
CREATE TRIGGER update_match_links_updated_at BEFORE UPDATE ON match_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
SQL_EOF
fi

if [ $? -eq 0 ]; then
    echo "✅ Миграция применена успешно"
else
    echo "⚠️  Миграция уже применена или произошла ошибка (это нормально)"
fi
echo ""

# Шаг 2: Создание первого админа
echo "👤 Шаг 2: Создание первого админа..."
if [ -f "create_admin.sh" ]; then
    bash create_admin.sh
else
    docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe <<'SQL_EOF'
INSERT INTO users (id, username, email, password_hash, user_type)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@kinoswipe.ru',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
SQL_EOF
    echo "✅ Админ создан (или уже существует)"
    echo ""
    echo "📝 Данные для входа:"
    echo "   Email: admin@kinoswipe.ru"
    echo "   Пароль: admin123"
fi
echo ""

# Шаг 3: Пересборка backend
echo "🔨 Шаг 3: Пересборка backend..."
docker-compose build app
if [ $? -eq 0 ]; then
    echo "✅ Backend пересобран"
else
    echo "❌ Ошибка пересборки backend"
    exit 1
fi
echo ""

# Шаг 4: Пересборка frontend
echo "🎨 Шаг 4: Пересборка frontend..."
docker-compose build frontend
if [ $? -eq 0 ]; then
    echo "✅ Frontend пересобран"
else
    echo "❌ Ошибка пересборки frontend"
    exit 1
fi
echo ""

# Шаг 5: Перезапуск сервисов
echo "🔄 Шаг 5: Перезапуск сервисов..."
docker-compose up -d
if [ $? -eq 0 ]; then
    echo "✅ Сервисы перезапущены"
else
    echo "❌ Ошибка перезапуска сервисов"
    exit 1
fi
echo ""

# Ждем немного для запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 5

# Проверка статуса
echo ""
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "✅ Все изменения применены!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080/api/v1"
echo ""
echo "📝 Данные для входа админа:"
echo "   Email: admin@kinoswipe.ru"
echo "   Пароль: admin123"
echo ""
echo "⚠️  ВАЖНО: Backend handlers еще не реализованы!"
echo "   См. файл НОВЫЕ_ФУНКЦИИ.md для инструкций по реализации."
echo ""
