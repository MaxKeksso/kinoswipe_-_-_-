# KinoSwipe - Приложение для совместного выбора фильмов

KinoSwipe - это веб-приложение на Go, которое помогает парам, друзьям и семьям быстро и легко выбирать фильмы для просмотра, используя механику свайпов (как в Tinder).

## Описание проекта

Приложение решает проблему долгого выбора фильма и споров между пользователями. Участники создают "комнату", совместно свайпают карточки фильмов, и когда все лайкают один фильм, происходит "матч" - система показывает подходящий вариант.

## Технологический стек

- **Backend**: Go 1.21+
- **База данных**: PostgreSQL 16
- **WebSocket**: gorilla/websocket для real-time обновлений
- **API**: RESTful API с использованием gorilla/mux
- **Миграции**: golang-migrate

## Структура проекта

```
kinoswipe/
├── cmd/
│   └── server/
│       └── main.go              # Точка входа приложения
├── config/
│   └── config.go                # Конфигурация приложения
├── database/
│   └── database.go              # Подключение к БД
├── handlers/
│   ├── user_handler.go          # Обработчики для пользователей
│   ├── room_handler.go          # Обработчики для комнат
│   ├── movie_handler.go         # Обработчики для фильмов
│   ├── swipe_handler.go         # Обработчики для свайпов
│   ├── match_handler.go         # Обработчики для матчей
│   ├── filter_handler.go        # Обработчики для фильтров
│   ├── feedback_handler.go      # Обработчики для обратной связи
│   ├── websocket_handler.go     # WebSocket handler для real-time
│   └── response.go              # Вспомогательные функции ответов
├── middleware/
│   ├── cors.go                  # CORS middleware
│   ├── logging.go               # Логирование запросов
│   └── recovery.go              # Обработка паник
├── migrations/
│   ├── 001_init_schema.up.sql   # Миграция создания схемы
│   └── 001_init_schema.down.sql # Откат миграции
├── models/
│   ├── user.go                  # Модели пользователя
│   ├── room.go                  # Модели комнаты
│   ├── movie.go                 # Модели фильма
│   ├── filter.go                # Модели фильтра
│   ├── swipe.go                 # Модели свайпа
│   ├── match.go                 # Модели матча
│   ├── feedback.go              # Модели обратной связи
│   └── websocket.go             # Модели WebSocket сообщений
├── repository/
│   ├── user_repository.go       # Репозиторий пользователей
│   ├── room_repository.go       # Репозиторий комнат
│   ├── movie_repository.go      # Репозиторий фильмов
│   ├── filter_repository.go     # Репозиторий фильтров
│   ├── swipe_repository.go      # Репозиторий свайпов
│   ├── match_repository.go      # Репозиторий матчей
│   └── feedback_repository.go   # Репозиторий обратной связи
├── service/
│   └── match_service.go         # Бизнес-логика для матчей
├── docker-compose.yml           # Docker Compose конфигурация
├── Dockerfile                   # Docker образ приложения
├── go.mod                       # Go модули
├── go.sum                       # Go зависимости
└── README.md                    # Документация
```

## Требования

- Go 1.21 или выше
- PostgreSQL 16 или выше
- Docker и Docker Compose (опционально, для запуска через Docker)

## Установка и запуск

### Вариант 1: Локальный запуск

1. **Клонируйте репозиторий** (если используется Git):
   ```bash
   git clone <repository-url>
   cd kinoswipe
   ```

2. **Установите PostgreSQL** и создайте базу данных:
   ```bash
   createdb kinoswipe
   ```

3. **Настройте переменные окружения**:
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл под ваши настройки
   ```

4. **Установите зависимости**:
   ```bash
   go mod download
   ```

5. **Примените миграции**:
   
   Сначала установите golang-migrate:
   ```bash
   # macOS
   brew install golang-migrate
   
   # Linux
   curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
   sudo mv migrate /usr/local/bin/migrate
   ```
   
   Затем примените миграции:
   ```bash
   migrate -path ./migrations -database "postgres://kinoswipe:kinoswipe123@localhost:5432/kinoswipe?sslmode=disable" up
   ```

6. **Запустите приложение**:
   ```bash
   go run cmd/server/main.go
   ```

   Сервер будет доступен по адресу `http://localhost:8080`

### Вариант 2: Запуск через Docker Compose

1. **Склонируйте репозиторий** и перейдите в директорию проекта

2. **Настройте переменные окружения** (опционально, можно использовать значения по умолчанию):
   ```bash
   cp .env.example .env
   ```

3. **Запустите через Docker Compose**:
   ```bash
   docker-compose up -d
   ```

   Это запустит:
   - PostgreSQL базу данных
   - Приложение Go

4. **Примените миграции** (если они не применяются автоматически):
   ```bash
   docker-compose exec app migrate -path ./migrations -database "postgres://kinoswipe:kinoswipe123@postgres:5432/kinoswipe?sslmode=disable" up
   ```

## API Endpoints

### Пользователи

- `POST /api/v1/users` - Создать пользователя
- `GET /api/v1/users/{id}` - Получить пользователя
- `PUT /api/v1/users/{id}` - Обновить пользователя

### Комнаты

- `POST /api/v1/rooms` - Создать комнату
- `GET /api/v1/rooms/{id}` - Получить комнату по ID
- `GET /api/v1/rooms/code/{code}` - Получить комнату по коду
- `POST /api/v1/rooms/{id}/join` - Присоединиться к комнате
- `GET /api/v1/rooms/{id}/members` - Получить участников комнаты
- `PUT /api/v1/rooms/{id}/status` - Обновить статус комнаты

### Фильтры

- `POST /api/v1/rooms/{room_id}/filters` - Создать фильтр для комнаты
- `GET /api/v1/filters/{id}` - Получить фильтр
- `GET /api/v1/rooms/{room_id}/filters` - Получить фильтр комнаты

### Фильмы

- `POST /api/v1/movies` - Создать фильм
- `GET /api/v1/movies/{id}` - Получить фильм
- `GET /api/v1/rooms/{room_id}/movies` - Получить фильмы для комнаты (не свайпнутые пользователем)

### Свайпы

- `POST /api/v1/rooms/{room_id}/swipes` - Создать свайп
- `POST /api/v1/rooms/{room_id}/swipes/undo` - Отменить последний свайп
- `GET /api/v1/rooms/{room_id}/swipes` - Получить свайпы пользователя

### Матчи

- `GET /api/v1/matches/{id}` - Получить матч
- `GET /api/v1/rooms/{room_id}/matches` - Получить матчи комнаты

### Обратная связь

- `POST /api/v1/feedbacks` - Создать отзыв
- `GET /api/v1/feedbacks/{id}` - Получить отзыв
- `GET /api/v1/rooms/{room_id}/feedbacks` - Получить отзывы комнаты

### WebSocket

- `GET /api/v1/rooms/{room_id}/ws?user_id={user_id}` - WebSocket подключение для real-time обновлений

## Использование API

### Пример: Создание комнаты и свайп фильмов

1. **Создать пользователя**:
   ```bash
   curl -X POST http://localhost:8080/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{
       "username": "Alice",
       "email": "alice@example.com"
     }'
   ```

2. **Создать комнату**:
   ```bash
   curl -X POST http://localhost:8080/api/v1/rooms \
     -H "Content-Type: application/json" \
     -H "X-User-ID: <user_id>" \
     -d '{}'
   ```

3. **Присоединиться к комнате** (другой пользователь):
   ```bash
   curl -X POST http://localhost:8080/api/v1/rooms/{room_id}/join \
     -H "Content-Type: application/json" \
     -H "X-User-ID: <other_user_id>" \
     -d '{
       "code": "ABC123"
     }'
   ```

4. **Получить фильмы для свайпа**:
   ```bash
   curl -X GET "http://localhost:8080/api/v1/rooms/{room_id}/movies?limit=10" \
     -H "X-User-ID: <user_id>"
   ```

5. **Сделать свайп**:
   ```bash
   curl -X POST http://localhost:8080/api/v1/rooms/{room_id}/swipes \
     -H "Content-Type: application/json" \
     -H "X-User-ID: <user_id>" \
     -d '{
       "movie_id": "<movie_id>",
       "direction": "right"
     }'
   ```

## WebSocket

WebSocket используется для real-time обновлений о матчах, присоединении участников и других событиях в комнате.

### Подключение

```
ws://localhost:8080/api/v1/rooms/{room_id}/ws?user_id={user_id}
```

### Типы сообщений

- `match` - Уведомление о матче (все участники лайкнули фильм)
- `join` - Пользователь присоединился к комнате
- `leave` - Пользователь покинул комнату
- `ping/pong` - Keep-alive сообщения

## Разработка

### Запуск в режиме разработки

```bash
# С hot reload (требует установки air или аналогичного инструмента)
air

# Или обычный запуск
go run cmd/server/main.go
```

### Тестирование

```bash
# Запуск всех тестов
go test ./...

# С покрытием
go test -cover ./...
```

### Миграции

```bash
# Создать новую миграцию
migrate create -ext sql -dir migrations -seq <migration_name>

# Применить миграции
migrate -path ./migrations -database "postgres://..." up

# Откатить миграции
migrate -path ./migrations -database "postgres://..." down
```

## Особенности реализации

### Бизнес-логика

- **Матчи**: Автоматически создаются, когда все участники комнаты лайкнули один фильм
- **Свайпы**: Пользователь может свайпать фильм только один раз, но может отменить последний свайп (Undo)
- **Фильтры**: Применяются к списку фильмов для сужения выбора по жанрам, годам, длительности и рейтингу
- **WebSocket**: Real-time синхронизация событий между участниками комнаты

### Безопасность

- В MVP версии используется заголовок `X-User-ID` для идентификации пользователя
- В production версии необходимо добавить JWT авторизацию
- CORS настроен для разработки (в production нужно ограничить origin)
- WebSocket origin проверка отключена для разработки (нужно включить в production)

## Будущие улучшения

- [ ] JWT авторизация
- [ ] Интеграция с API Кинопоиска/IMDb для автоматической загрузки фильмов
- [ ] Геймификация (бейджи, достижения)
- [ ] Совместные списки "хочу посмотреть"
- [ ] Интеграция с стриминговыми сервисами
- [ ] Система подписок и монетизация
- [ ] Мобильное приложение

## Лицензия

MIT

## Автор

Разработано для проекта KinoSwipe

