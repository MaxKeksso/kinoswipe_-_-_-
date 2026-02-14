# Исправление проблемы авторизации

## Внесенные изменения

1. **Добавлена валидация username** в `handlers/user_handler.go`:
   - Проверка на пустое значение после обрезки пробелов
   - Более понятные сообщения об ошибках

2. **Исправлена обработка NULL значений** в `repository/user_repository.go`:
   - `GetByID` и `GetByEmail` теперь правильно обрабатывают NULL значения для email, phone и avatar_url
   - Используется `sql.NullString` для сканирования из базы данных

3. **Улучшена обработка ошибок** на фронтенде:
   - Более детальные сообщения об ошибках
   - Различение типов ошибок (сеть, сервер, валидация)

4. **Добавлено подробное логирование** в `CreateUser` handler для диагностики

## Как проверить, что авторизация работает

### 1. Убедитесь, что все сервисы запущены

```bash
docker-compose ps
```

Все сервисы должны быть в статусе "Up".

### 2. Проверьте логи backend при попытке входа

```bash
docker-compose logs app -f
```

При попытке входа вы должны увидеть логи вида:
```
CreateUser: received request from ...
CreateUser: request data - username: "...", email: "", phone: ""
CreateUser: attempting to create user with ID: ..., username: ...
CreateUser: user created successfully with ID: ...
```

### 3. Проверьте базу данных

```bash
./check_db.sh
```

Или вручную:
```bash
docker-compose exec postgres psql -U kinoswipe -d kinoswipe -c "SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
```

### 4. Проверьте API напрямую через curl

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123"}'
```

Должен вернуться JSON с данными созданного пользователя.

### 5. Проверьте консоль браузера

Откройте Developer Tools (F12) -> Console и посмотрите на ошибки при попытке входа.

### 6. Проверьте Network вкладку

В Developer Tools (F12) -> Network:
- Найдите запрос `POST /api/v1/users`
- Проверьте статус ответа (должен быть 201 Created)
- Посмотрите содержимое ответа и запроса

## Возможные проблемы и решения

### Проблема: "Не удалось подключиться к серверу"

**Решение:**
1. Проверьте, что Docker запущен: `docker ps`
2. Проверьте, что все контейнеры запущены: `docker-compose ps`
3. Перезапустите сервисы: `docker-compose restart`

### Проблема: "Username is required" или "Invalid request payload"

**Решение:**
1. Убедитесь, что вы вводите имя в поле ввода
2. Проверьте консоль браузера на наличие ошибок JavaScript
3. Проверьте Network вкладку - какой запрос отправляется

### Проблема: "Failed to create user: ..." (ошибка базы данных)

**Решение:**
1. Проверьте логи backend: `docker-compose logs app`
2. Проверьте, что миграции применены: `docker-compose exec postgres psql -U kinoswipe -d kinoswipe -c "\dt"`
3. Если таблиц нет, примените миграции:
   ```bash
   docker-compose run --rm migrate -path /migrations -database "postgres://kinoswipe:kinoswipe@postgres:5432/kinoswipe?sslmode=disable" up
   ```

### Проблема: Белый экран или ошибки JavaScript

**Решение:**
1. Очистите кеш браузера: Ctrl+Shift+R (Windows/Linux) или Cmd+Shift+R (Mac)
2. Пересоберите frontend:
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```
3. Проверьте консоль браузера на наличие ошибок

## Перезапуск после изменений

После внесения изменений в код:

```bash
# Пересобрать и перезапустить backend
docker-compose build app
docker-compose up -d app

# Пересобрать и перезапустить frontend (если меняли фронтенд)
docker-compose build frontend
docker-compose up -d frontend

# Проверить логи
docker-compose logs app -f
```
