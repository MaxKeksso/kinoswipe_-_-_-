#!/bin/bash
# Подставляет постеры для фильмов без картинки (запрос к OMDb API).
# Нужен бесплатный API-ключ: https://www.omdbapi.com/apikey.aspx
#
# Использование:
#   export OMDB_API_KEY=ваш_ключ
#   ./обновить_постеры.sh
# Или положите OMDB_API_KEY в .env (добавьте строку OMDB_API_KEY=...).

set -e
cd "$(dirname "$0")"

if [ -z "$OMDB_API_KEY" ] && [ -f .env ] && grep -q '^OMDB_API_KEY=' .env; then
  export OMDB_API_KEY=$(grep '^OMDB_API_KEY=' .env | cut -d= -f2-)
  echo "Используем OMDB_API_KEY из .env"
fi

if [ -z "$OMDB_API_KEY" ]; then
  echo "Задайте OMDB_API_KEY (бесплатный ключ: https://www.omdbapi.com/apikey.aspx)"
  echo "  export OMDB_API_KEY=ваш_ключ"
  echo "  ./обновить_постеры.sh"
  exit 1
fi

if [ -f .env ] && grep -q '^DATABASE_URL=' .env; then
  export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
fi

if [ "$UPDATE_ALL" = "1" ] || [ "$UPDATE_ALL" = "true" ]; then
  echo "Обновление постеров у всех фильмов (UPDATE_ALL=1)..."
else
  echo "Обновление постеров (только у фильмов без картинки). Чтобы обновить у всех: UPDATE_ALL=1 $0"
fi
go run ./cmd/update_posters
echo "Готово."
