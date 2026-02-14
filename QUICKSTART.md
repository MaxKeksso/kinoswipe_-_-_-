# Быстрый старт KinoSwipe

## Вариант 1: Запуск с Docker Compose (рекомендуется)

1. **Клонируйте проект** (если используете Git) или перейдите в директорию проекта

2. **Запустите контейнеры**:
   ```bash
   docker-compose up -d
   ```

3. **Примените миграции**:
   ```bash
   docker-compose exec app migrate -path ./migrations -database "postgres://kinoswipe:kinoswipe123@postgres:5432/kinoswipe?sslmode=disable" up
   ```

4. **Проверьте работу**:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```
   Должен вернуться `OK`

## Вариант 2: Локальный запуск

### Предварительные требования

- Go 1.21+
- PostgreSQL 16+
- golang-migrate

### Шаги

1. **Установите зависимости**:
   ```bash
   go mod download
   ```

2. **Создайте базу данных**:
   ```bash
   createdb kinoswipe
   # или через psql:
   # psql -U postgres -c "CREATE DATABASE kinoswipe;"
   ```

3. **Настройте переменные окружения** (опционально):
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_USER=kinoswipe
   export DB_PASSWORD=kinoswipe123
   export DB_NAME=kinoswipe
   ```

4. **Примените миграции**:
   ```bash
   ./scripts/init_db.sh
   # или вручную:
   # migrate -path ./migrations -database "postgres://kinoswipe:kinoswipe123@localhost:5432/kinoswipe?sslmode=disable" up
   ```

5. **Запустите приложение**:
   ```bash
   go run cmd/server/main.go
   # или
   make run
   ```

6. **Проверьте работу**:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```

## Первые шаги

### 1. Создайте двух пользователей

```bash
# Пользователь 1 (Алиса)
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username": "Alice", "email": "alice@example.com"}'

# Сохраните user_id из ответа (например: 550e8400-e29b-41d4-a716-446655440000)

# Пользователь 2 (Боб)
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username": "Bob", "email": "bob@example.com"}'

# Сохраните user_id из ответа
```

### 2. Создайте комнату (от имени Алисы)

```bash
ALICE_USER_ID="<user_id_из_шага_1>"

curl -X POST http://localhost:8080/api/v1/rooms \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $ALICE_USER_ID" \
  -d '{}'

# Сохраните room_id и code из ответа
```

### 3. Боб присоединяется к комнате

```bash
BOB_USER_ID="<user_id_Боба>"
ROOM_CODE="<code_из_шага_2>"

curl -X POST http://localhost:8080/api/v1/rooms/code/$ROOM_CODE/join \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $BOB_USER_ID" \
  -d "{\"code\": \"$ROOM_CODE\"}"
```

### 4. Добавьте фильмы в базу (для тестирования)

```bash
# Через SQL скрипт
psql -U kinoswipe -d kinoswipe -f scripts/seed_movies.sql

# Или через API
curl -X POST http://localhost:8080/api/v1/movies \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Матрица",
    "poster_url": "https://example.com/matrix.jpg",
    "imdb_rating": 8.7,
    "kp_rating": 8.5,
    "genre": "[\"фантастика\", \"боевик\"]",
    "year": 1999,
    "duration": 136
  }'
```

### 5. Получите фильмы для свайпа

```bash
ROOM_ID="<room_id_из_шага_2>"

# Алиса получает фильмы
curl -X GET "http://localhost:8080/api/v1/rooms/$ROOM_ID/movies?limit=10" \
  -H "X-User-ID: $ALICE_USER_ID"

# Боб получает фильмы
curl -X GET "http://localhost:8080/api/v1/rooms/$ROOM_ID/movies?limit=10" \
  -H "X-User-ID: $BOB_USER_ID"
```

### 6. Делайте свайпы

```bash
MOVIE_ID="<movie_id_из_шага_5>"

# Алиса лайкает фильм
curl -X POST http://localhost:8080/api/v1/rooms/$ROOM_ID/swipes \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $ALICE_USER_ID" \
  -d "{\"movie_id\": \"$MOVIE_ID\", \"direction\": \"right\"}"

# Боб лайкает тот же фильм (должен создаться матч!)
curl -X POST http://localhost:8080/api/v1/rooms/$ROOM_ID/swipes \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $BOB_USER_ID" \
  -d "{\"movie_id\": \"$MOVIE_ID\", \"direction\": \"right\"}"
```

### 7. Проверьте матчи

```bash
curl -X GET http://localhost:8080/api/v1/rooms/$ROOM_ID/matches \
  -H "X-User-ID: $ALICE_USER_ID"
```

## WebSocket подключение

Для real-time обновлений о матчах:

```javascript
const ws = new WebSocket('ws://localhost:8080/api/v1/rooms/<room_id>/ws?user_id=<user_id>');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Получено сообщение:', message);
  
  if (message.type === 'match') {
    console.log('Матч!', message.payload);
  }
};
```

## Полезные команды

```bash
# Показать логи
docker-compose logs -f app

# Остановить контейнеры
docker-compose down

# Перезапустить
docker-compose restart

# Просмотреть структуру БД
psql -U kinoswipe -d kinoswipe -c "\dt"
```

## Устранение неполадок

### База данных не подключена

```bash
# Проверьте, что PostgreSQL запущен
pg_isready

# Проверьте подключение
psql -U kinoswipe -d kinoswipe -c "SELECT 1;"
```

### Миграции не применяются

```bash
# Проверьте текущую версию
migrate -path ./migrations -database "postgres://..." version

# Примените вручную
migrate -path ./migrations -database "postgres://..." up
```

### Порт занят

Измените `SERVER_PORT` в `.env` или `docker-compose.yml`

## Следующие шаги

1. Изучите полную документацию API в `README.md`
2. Посмотрите архитектуру в `ARCHITECTURE.md`
3. Настройте интеграцию с фронтендом
4. Добавьте тесты
5. Настройте CI/CD

