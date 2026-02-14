# Скрипты KinoSwipe

**Важно:** все команды ниже нужно выполнять из **корня проекта** (`kinoswipe`), а не из папки `frontend`.

```bash
cd /Users/maksimzagorodnev/Downloads/kinoswipe
```

## Перед запуском скриптов: запустите PostgreSQL из проекта

Пользователь `kinoswipe` создаётся только в контейнере Docker. Если видите ошибку **role "kinoswipe" does not exist**:

1. **Остановите и пересоздайте контейнер PostgreSQL:**
   ```bash
   docker-compose down postgres
   docker-compose up -d postgres
   ```

2. **Подождите 10 секунд** для инициализации БД

3. **Проверьте, что контейнер работает:**
   ```bash
   docker ps | grep kinoswipe_db
   ```

**Важно:** PostgreSQL из проекта теперь работает на порту **5433** (чтобы избежать конфликта с локальным PostgreSQL на 5432). Скрипты уже настроены на порт 5433.

## Загрузка фильмов в БД

```bash
go run -tags loadmovies ./scripts/
```

## Создание администратора

```bash
go run -tags createadmin ./scripts/
```

## Генерация bcrypt-хеша пароля (БД не нужна)

```bash
go run -tags bcrypt ./scripts/
```

## Требования

- PostgreSQL из проекта: `docker-compose up -d postgres`
- Подключение: `localhost:5432`, пользователь `kinoswipe`, пароль `kinoswipe123`, БД `kinoswipe`
- Если на 5432 уже запущен другой PostgreSQL (например, Homebrew), остановите его или измените порт в `docker-compose.yml` (например, `"5433:5432"`), тогда в скриптах используйте порт 5433 или переменную `DATABASE_URL`.
