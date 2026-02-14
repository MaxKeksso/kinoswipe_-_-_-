# Решение проблем KinoSwipe

## Ошибка создания пользователя

Если вы видите ошибку "Ошибка создания пользователя" в браузере, выполните следующие шаги:

### 1. Проверьте, что все сервисы запущены

```bash
docker-compose ps
```

Все сервисы должны быть в статусе "Up".

### 2. Проверьте логи backend

```bash
docker-compose logs app -f
```

Ищите ошибки, связанные с созданием пользователя.

### 3. Проверьте базу данных

```bash
./check_db.sh
```

Или:
```bash
docker-compose exec postgres psql -U kinoswipe -d kinoswipe -c "\dt"
```

### 4. Попробуйте создать пользователя через curl

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123"}'
```

Если это работает, проблема в frontend.

### 5. Пересоберите frontend

Если вы изменили код frontend:

```bash
docker-compose build frontend
docker-compose up -d frontend
```

### 6. Очистите кеш браузера

- Нажмите Ctrl+Shift+R (Windows/Linux) или Cmd+Shift+R (Mac)
- Или откройте в режиме инкогнито

### 7. Проверьте консоль браузера

Откройте Developer Tools (F12) и посмотрите вкладку Console на наличие ошибок JavaScript.

### 8. Проверьте Network вкладку

В Developer Tools (F12) -> Network:
- Посмотрите запрос POST /api/v1/users
- Проверьте статус ответа (должен быть 201)
- Посмотрите содержимое ответа

## Если проблема сохраняется

1. Остановите все контейнеры:
```bash
docker-compose down
```

2. Запустите заново:
```bash
docker-compose up -d
```

3. Примените миграции:
```bash
docker run --rm -v "$(pwd)/migrations:/migrations" --network kinoswipe_kinoswipe_network migrate/migrate:v4.17.0 -path /migrations -database "postgres://kinoswipe:kinoswipe123@kinoswipe_db:5432/kinoswipe?sslmode=disable" up
```

## Полезные команды

```bash
# Просмотр всех логов
docker-compose logs -f

# Перезапуск frontend
docker-compose restart frontend

# Перезапуск backend
docker-compose restart app

# Пересборка и перезапуск
docker-compose build && docker-compose up -d
```
