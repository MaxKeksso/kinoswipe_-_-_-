# Быстрое решение проблемы подключения

Если вы видите ошибку "Не удалось подключиться к серверу", выполните:

## 1. Проверьте, что все сервисы запущены

```bash
docker-compose ps
```

Все должны быть в статусе "Up".

## 2. Перезапустите все сервисы

```bash
docker-compose restart
```

Или полный перезапуск:

```bash
docker-compose down
docker-compose up -d
```

## 3. Очистите кеш браузера

- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R
- Или откройте в режиме инкогнито (Ctrl/Cmd + Shift + N)

## 4. Убедитесь, что открываете правильный адрес

**Правильно**: http://localhost:3000  
**Неправильно**: http://localhost:8080 (это backend, не frontend)

## 5. Проверьте консоль браузера (F12)

Откройте Developer Tools (F12) -> Console и посмотрите на ошибки.

## 6. Если ничего не помогает

Полный перезапуск:

```bash
docker-compose down
docker-compose up -d --build
```

Подождите 10 секунд и попробуйте снова.
