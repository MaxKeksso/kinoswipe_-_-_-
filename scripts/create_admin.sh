#!/bin/bash

# Скрипт для создания администратора через Go

echo "🔐 Создание администратора..."

cd "$(dirname "$0")/.."

# Проверяем, запущен ли Docker
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL не запущен. Запустите: docker-compose up -d postgres"
    exit 1
fi

# Запускаем Go скрипт внутри контейнера app или локально
if command -v go &> /dev/null; then
    echo "📦 Используем локальный Go..."
    export DATABASE_URL="postgres://kinoswipe:kinoswipe123@localhost:5432/kinoswipe?sslmode=disable"
    go run scripts/create_admin_go.go
else
    echo "📦 Используем Docker контейнер..."
    docker-compose exec -T app go run /app/scripts/create_admin_go.go || {
        echo "⚠️  Не удалось запустить через Docker, используем SQL напрямую..."
        
        # Альтернативный способ через SQL с правильным bcrypt хешем
        # Генерируем bcrypt хеш (стоимость 10)
        docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe <<'SQL'
-- Создаем или обновляем админа
DO $$
DECLARE
    admin_exists boolean;
    admin_id uuid;
    -- Bcrypt хеш для пароля "admin123" (стоимость 10)
    -- Это предварительно сгенерированный хеш
    bcrypt_hash text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@kinoswipe.ru') INTO admin_exists;
    
    IF admin_exists THEN
        RAISE NOTICE 'Администратор уже существует. Обновляем пароль...';
        SELECT id INTO admin_id FROM users WHERE email = 'admin@kinoswipe.ru';
        UPDATE users 
        SET password_hash = bcrypt_hash,
            user_type = 'admin',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = admin_id;
    ELSE
        RAISE NOTICE 'Создаем нового администратора...';
        admin_id := gen_random_uuid();
        INSERT INTO users (id, username, email, password_hash, user_type, created_at, updated_at)
        VALUES (
            admin_id,
            'Администратор',
            'admin@kinoswipe.ru',
            bcrypt_hash,
            'admin',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RAISE NOTICE '✅ Администратор готов!';
END $$;
SQL
    }
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📝 Данные для входа:"
echo "   Email: admin@kinoswipe.ru"
echo "   Пароль: admin123"
echo ""
