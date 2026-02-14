# Архитектура проекта KinoSwipe

## Обзор

KinoSwipe построен по принципам чистой архитектуры с разделением на слои:

1. **Handlers** - HTTP handlers для обработки запросов
2. **Service** - Бизнес-логика приложения
3. **Repository** - Доступ к данным
4. **Models** - Доменные модели
5. **Database** - Подключение к БД и миграции

## Структура слоев

### 1. Models (Доменные модели)

Содержит все структуры данных приложения:
- `User` - пользователь
- `Room` - комната для совместного выбора
- `Movie` - фильм
- `Filter` - фильтры для поиска фильмов
- `Swipe` - действие пользователя (свайп)
- `Match` - совпадение (все лайкнули один фильм)
- `Feedback` - обратная связь

### 2. Repository (Слой данных)

Каждый репозиторий отвечает за CRUD операции с одной сущностью:
- `UserRepository` - операции с пользователями
- `RoomRepository` - операции с комнатами и участниками
- `MovieRepository` - операции с фильмами
- `FilterRepository` - операции с фильтрами
- `SwipeRepository` - операции со свайпами
- `MatchRepository` - операции с матчами
- `FeedbackRepository` - операции с отзывами

**Принципы:**
- Изоляция от бизнес-логики
- Использование SQL напрямую (без ORM)
- Обработка ошибок на уровне репозитория

### 3. Service (Бизнес-логика)

Содержит бизнес-правила и координацию между репозиториями:
- `MatchService` - логика создания матчей (проверка совпадений)

**Принципы:**
- Координация между несколькими репозиториями
- Реализация бизнес-правил
- Транзакции (если необходимо)

### 4. Handlers (HTTP слой)

Обработка HTTP запросов и ответов:
- Валидация входных данных
- Вызов сервисов/репозиториев
- Формирование ответов
- Обработка ошибок

**Принципы:**
- Тонкий слой без бизнес-логики
- Использование middleware для общей логики
- Стандартные HTTP коды ответов

### 5. Middleware

Промежуточное ПО для обработки запросов:
- `CORS` - настройка CORS заголовков
- `Logging` - логирование запросов
- `Recovery` - обработка паник

## Потоки данных

### Создание свайпа и матча

1. Клиент отправляет POST запрос на `/api/v1/rooms/{room_id}/swipes`
2. `SwipeHandler.CreateSwipe` обрабатывает запрос
3. Проверяется, не свайпал ли уже пользователь этот фильм
4. Создается `Swipe` через `SwipeRepository`
5. Если направление = "right" (лайк), вызывается `MatchService.CheckAndCreateMatch`
6. `MatchService` проверяет количество лайков для фильма
7. Если все участники лайкнули - создается `Match`
8. Через WebSocket отправляется уведомление всем участникам комнаты

### WebSocket поток

1. Клиент подключается к `/api/v1/rooms/{room_id}/ws?user_id={user_id}`
2. Создается `Client` и регистрируется в `Hub`
3. `Hub` хранит мапу комнат -> клиенты
4. При создании матча вызывается `Hub.BroadcastMatch`
5. Сообщение отправляется всем клиентам в комнате

## База данных

### Схема

```
users
  └── id (PK)

rooms
  └── id (PK)
  └── host_id (FK -> users.id)
  └── filter_id (FK -> filters.id)

room_members
  └── room_id (FK -> rooms.id)
  └── user_id (FK -> users.id)
  └── PRIMARY KEY (room_id, user_id)

filters
  └── id (PK)
  └── room_id (FK -> rooms.id)

movies
  └── id (PK)

swipes
  └── id (PK)
  └── user_id (FK -> users.id)
  └── room_id (FK -> rooms.id)
  └── movie_id (FK -> movies.id)
  └── UNIQUE (user_id, room_id, movie_id)

matches
  └── id (PK)
  └── room_id (FK -> rooms.id)
  └── movie_id (FK -> movies.id)
  └── UNIQUE (room_id, movie_id)

feedbacks
  └── id (PK)
  └── user_id (FK -> users.id)
  └── room_id (FK -> rooms.id)
  └── match_id (FK -> matches.id)
```

### Индексы

- `users`: email, phone, username
- `rooms`: code (unique), host_id, status, filter_id
- `room_members`: room_id, user_id
- `movies`: year, genre (GIN), imdb_rating, kp_rating
- `swipes`: user_id, room_id, movie_id, direction, (user_id, room_id)
- `matches`: room_id, movie_id, created_at

## Безопасность

### Текущее состояние (MVP)

- Заголовок `X-User-ID` для идентификации пользователя
- CORS настроен для разработки (`*`)
- WebSocket origin проверка отключена

### Для production

- JWT авторизация
- Ограничение CORS на конкретные домены
- Включение проверки origin для WebSocket
- Валидация и санитизация входных данных
- Rate limiting
- HTTPS обязателен

## Масштабирование

### Горизонтальное масштабирование

Для масштабирования на несколько серверов:

1. **WebSocket Hub**: Необходимо использовать Redis Pub/Sub или аналогичную систему для синхронизации между серверами
2. **База данных**: Можно использовать connection pooling и read replicas
3. **Статические файлы**: CDN для постеров фильмов

### Вертикальное масштабирование

- Увеличение connection pool в БД
- Оптимизация запросов (индексы, EXPLAIN)
- Кэширование популярных фильмов

## Тестирование

### Unit тесты

- Репозитории: Mock DB connection
- Сервисы: Mock репозитории
- Handlers: Mock сервисы

### Integration тесты

- Тестирование с реальной БД (testcontainers)
- Тестирование API endpoints
- Тестирование WebSocket соединений

## Мониторинг

Рекомендуется добавить:

- Логирование (структурированные логи)
- Метрики (Prometheus)
- Трейсинг (OpenTelemetry)
- Health checks
- Профилирование (pprof)

## Деплой

### Варианты деплоя

1. **Docker Compose** - для разработки и небольших проектов
2. **Kubernetes** - для production масштабирования
3. **Cloud platforms** - AWS, GCP, Azure

### CI/CD

Рекомендуется настроить:

- Автоматические тесты
- Линтинг (golangci-lint)
- Билд Docker образов
- Автоматический деплой

