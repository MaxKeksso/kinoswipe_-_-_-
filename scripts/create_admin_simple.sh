#!/bin/bash

# Простой скрипт для создания администратора с правильным bcrypt хешем

echo "🔐 Создание администратора..."

# Bcrypt хеш для пароля "admin123" (стоимость 10)
# Сгенерирован через: go run scripts/generate_bcrypt.go
BCRYPT_HASH='$2a$10$IRB5xJkqftozpjJjHkDLE.zS4HU2jxeR73BKOMVhvcarGb5ianJye'

docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe <<SQL
-- Создаем или обновляем админа
DO \$\$
DECLARE
    admin_exists boolean;
    admin_id uuid;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@kinoswipe.ru') INTO admin_exists;
    
    IF admin_exists THEN
        RAISE NOTICE 'Администратор уже существует. Обновляем пароль...';
        SELECT id INTO admin_id FROM users WHERE email = 'admin@kinoswipe.ru';
        UPDATE users 
        SET password_hash = '$BCRYPT_HASH',
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
            '$BCRYPT_HASH',
            'admin',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RAISE NOTICE '✅ Администратор готов!';
END \$\$;

-- Проверяем результат
SELECT id, username, email, user_type, 
       CASE WHEN password_hash IS NOT NULL THEN 'Пароль установлен' ELSE 'Пароль отсутствует' END as password_status
FROM users 
WHERE email = 'admin@kinoswipe.ru';
SQL

echo ""
echo "✅ Администратор создан/обновлен!"
echo ""
echo "📝 Данные для входа:"
echo "   Email: admin@kinoswipe.ru"
echo "   Пароль: admin123"
echo ""
