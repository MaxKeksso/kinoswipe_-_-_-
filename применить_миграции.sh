#!/bin/bash
# Применяет миграции к локальной БД kinoswipe.
# Использование:
#   ./применить_миграции.sh
#   или: DATABASE_URL="postgres://user:pass@localhost:5432/kinoswipe?sslmode=disable" ./применить_миграции.sh

set -e
cd "$(dirname "$0")"

if [ -n "$DATABASE_URL" ]; then
  echo "Используем DATABASE_URL из окружения"
elif [ -f .env ] && grep -q '^DATABASE_URL=' .env; then
  export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
  echo "Используем DATABASE_URL из .env"
else
  # БД из docker-compose (порт 5433)
  export DATABASE_URL="postgres://kinoswipe:kinoswipe123@localhost:5433/kinoswipe?sslmode=disable"
  echo "Используем DATABASE_URL по умолчанию (Docker Postgres, порт 5433)"
fi
# Показать, куда подключаемся (без пароля), чтобы в pgAdmin смотреть ту же БД
echo "Подключение: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')"

# Проверка: в URL не должно быть шаблонов ПОЛЬЗОВАТЕЛЬ/ПАРОЛЬ/ИМЯ_БАЗЫ
if echo "$DATABASE_URL" | grep -qE 'ПОЛЬЗОВАТЕЛЬ|ПАРОЛЬ|ИМЯ_БАЗЫ'; then
  echo "Ошибка: в .env указан шаблон вместо реальных данных."
  echo "Открой .env и замени на одну из строк:"
  echo "  DATABASE_URL=postgres://kinoswipe:kinoswipe123@localhost:5433/kinoswipe?sslmode=disable"
  echo "  (для БД из Docker: docker-compose up -d postgres)"
  echo "или"
  echo "  DATABASE_URL=postgres://ТВОЙ_ЛОГИН:ТВОЙ_ПАРОЛЬ@localhost:5432/kinoswipe?sslmode=disable"
  echo "  (для своей PostgreSQL — подставь логин и пароль из pgAdmin)"
  exit 1
fi

if ! command -v migrate &>/dev/null; then
  echo "Установи golang-migrate: brew install golang-migrate"
  echo "Или скачай: https://github.com/golang-migrate/migrate/releases"
  exit 1
fi

echo "Применяем миграции к БД..."
if ! err=$(migrate -path ./migrations -database "$DATABASE_URL" up 2>&1); then
  if echo "$err" | grep -q "Dirty database"; then
    echo "Сбрасываем «грязную» версию и повторяем..."
    migrate -path ./migrations -database "$DATABASE_URL" force 1
    migrate -path ./migrations -database "$DATABASE_URL" up
  else
    echo "$err"
    exit 1
  fi
fi
echo "Готово. Таблицы: users, rooms, movies, swipes, matches, premieres и др. созданы/обновлены."
