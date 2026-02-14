# Инструкция по запуску проекта

## Шаг 1: Запустите Docker Desktop

На Mac откройте приложение **Docker Desktop** и дождитесь, пока оно полностью запустится (иконка в строке меню должна быть зеленой).

## Шаг 2: Перейдите в корневую директорию проекта

```bash
cd /Users/maksimzagorodnev/Downloads/kinoswipe
```

**Важно:** Команды `docker-compose` нужно запускать из корневой директории проекта, где находится файл `docker-compose.yml`, а не из папки `frontend`.

## Шаг 3: Запустите все сервисы

```bash
docker-compose up -d
```

Эта команда запустит:
- PostgreSQL (база данных)
- Backend (Go приложение)
- Frontend (React приложение)

## Шаг 4: Проверьте статус

```bash
docker-compose ps
```

Все сервисы должны быть в статусе "Up".

## Шаг 5: Откройте приложение

Откройте браузер и перейдите по адресу:
- **http://localhost:3000**

## После изменений в коде

### Пересобрать и перезапустить backend:

```bash
cd /Users/maksimzagorodnev/Downloads/kinoswipe
docker-compose build app
docker-compose up -d app
```

### Пересобрать и перезапустить frontend:

```bash
cd /Users/maksimzagorodnev/Downloads/kinoswipe
docker-compose build frontend
docker-compose up -d frontend
```

### Пересобрать и перезапустить все:

```bash
cd /Users/maksimzagorodnev/Downloads/kinoswipe
docker-compose build
docker-compose up -d
```

## Просмотр логов

```bash
# Логи backend
docker-compose logs app -f

# Логи frontend
docker-compose logs frontend -f

# Логи всех сервисов
docker-compose logs -f
```

## Остановка сервисов

```bash
docker-compose down
```

## Полная перезагрузка (если что-то не работает)

```bash
# Остановить все
docker-compose down

# Удалить volumes (ОСТОРОЖНО: удалит данные в БД!)
# docker-compose down -v

# Пересобрать и запустить
docker-compose build
docker-compose up -d
```
