#!/bin/bash

# Создание первого админа

echo "👤 Создание первого админа..."

docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe <<EOF
-- Хеш пароля "admin123" (bcrypt)
INSERT INTO users (id, username, email, password_hash, user_type)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@kinoswipe.ru',
    '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
EOF

echo "✅ Админ создан (или уже существует)"
echo ""
echo "📝 Данные для входа:"
echo "   Email: admin@kinoswipe.ru"
echo "   Пароль: admin123"
