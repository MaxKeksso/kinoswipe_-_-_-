#!/bin/bash
# Импорт фильмов из CSV в таблицу movies.
# Использование:
#   ./импорт_csv.sh
#   ./импорт_csv.sh путь/к/films.csv
#
# 1. Положите CSV в корень проекта (например imdb_top_1000.csv) или укажите путь.
# 2. В .env должен быть DATABASE_URL (как для приложения и миграций).
# 3. Миграции уже применены (таблица movies существует).

set -e
cd "$(dirname "$0")"

CSV="${1:-imdb_top_1000.csv}"
if [ ! -f "$CSV" ]; then
  if [ "$CSV" = "imdb_top_1000.csv" ]; then
    echo "Файл imdb_top_1000.csv не найден. Скачиваю..."
    if command -v curl >/dev/null 2>&1; then
      if curl -sL -o "imdb_top_1000.csv" "https://github.com/krishna-koly/IMDB_TOP_1000/raw/main/imdb_top_1000.csv"; then
        echo "Скачано."
        CSV="imdb_top_1000.csv"
      else
        echo "Не удалось скачать. Скачайте вручную:"
        echo "  https://github.com/krishna-koly/IMDB_TOP_1000/raw/main/imdb_top_1000.csv"
        echo "Сохраните как imdb_top_1000.csv в корень проекта и запустите снова."
        exit 1
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -q -O "imdb_top_1000.csv" "https://github.com/krishna-koly/IMDB_TOP_1000/raw/main/imdb_top_1000.csv"; then
        echo "Скачано."
        CSV="imdb_top_1000.csv"
      else
        echo "Не удалось скачать. Скачайте вручную по ссылке выше."
        exit 1
      fi
    else
      echo "Файл не найден и нет curl/wget для загрузки."
      echo "Скачайте: https://github.com/krishna-koly/IMDB_TOP_1000/raw/main/imdb_top_1000.csv"
      echo "Сохраните как imdb_top_1000.csv в корень проекта и запустите снова."
      exit 1
    fi
  else
    echo "Файл не найден: $CSV"
    exit 1
  fi
fi

if [ -n "$DATABASE_URL" ]; then
  echo "Используем DATABASE_URL из окружения"
elif [ -f .env ] && grep -q '^DATABASE_URL=' .env; then
  export DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
  echo "Используем DATABASE_URL из .env"
else
  echo "Ошибка: задайте DATABASE_URL (export DATABASE_URL=... или в .env)"
  exit 1
fi
echo "Подключение: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')"

echo "Импорт из $CSV в БД..."
go run ./cmd/import_csv "$CSV"
echo "Готово. Проверьте фильмы в приложении или в pgAdmin (таблица movies)."
