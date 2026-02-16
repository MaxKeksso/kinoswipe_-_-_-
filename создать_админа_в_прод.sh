#!/bin/bash
# Создание админа в продакшен-базе Railway

echo "🔐 Создание администратора в продакшен-базе Railway..."
echo ""

# DATABASE_URL из Railway (из предыдущего разговора)
export DATABASE_URL="postgresql://postgres:aBjuAMLnYagFfbJndvtFHbTJWJFBGZoe@shortline.proxy.rlwy.net:36234/railway"

echo "Подключение к базе: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')"
echo ""

# Проверяем, установлен ли Go
if ! command -v go &> /dev/null; then
    echo "❌ Go не установлен. Используем SQL напрямую через psql..."
    
    # Проверяем psql
    if ! command -v psql &> /dev/null; then
        echo "❌ psql не установлен. Установите PostgreSQL client или используйте Go скрипт."
        exit 1
    fi
    
    # Используем psql напрямую
    psql "$DATABASE_URL" <<'SQL'
-- Создаем или обновляем админа
DO $$
DECLARE
    admin_exists boolean;
    admin_id uuid;
    -- Bcrypt хеш для пароля "admin123" (стоимость 10)
    bcrypt_hash text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@kinoswipe.ru') INTO admin_exists;
    
    IF admin_exists THEN
        RAISE NOTICE 'Администратор уже существует. Обновляем пароль и тип...';
        SELECT id INTO admin_id FROM users WHERE email = 'admin@kinoswipe.ru';
        UPDATE users 
        SET password_hash = bcrypt_hash,
            user_type = 'admin',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = admin_id;
        RAISE NOTICE '✅ Администратор обновлен!';
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
        RAISE NOTICE '✅ Администратор создан!';
    END IF;
END $$;

-- Проверяем результат
SELECT id, username, email, user_type, 
       CASE WHEN password_hash IS NOT NULL THEN 'Пароль установлен' ELSE 'Пароль отсутствует' END as password_status
FROM users 
WHERE email = 'admin@kinoswipe.ru';
SQL

else
    echo "📦 Используем Go скрипт..."
    cd "$(dirname "$0")"
    go run scripts/create_admin_go.go
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📝 Данные для входа:"
echo "   Email: admin@kinoswipe.ru"
echo "   Пароль: admin123"
echo ""
echo "🌐 Теперь попробуй войти на сайте:"
echo "   https://kinoswipe-production.up.railway.app"
echo ""
