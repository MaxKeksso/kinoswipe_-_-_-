# Быстрый старт

## Проблема: Docker не запущен

Если вы видите ошибку:
```
Cannot connect to the Docker daemon at unix:///Users/maksimzagorodnev/.docker/run/docker.sock. Is the docker daemon running?
```

## Решение:

### 1. Запустите Docker Desktop
- Откройте приложение **Docker Desktop** на Mac
- Дождитесь полного запуска (иконка в строке меню должна быть зеленой)

### 2. Перейдите в корневую директорию проекта

```bash
cd /Users/maksimzagorodnev/Downloads/kinoswipe
```

**Важно:** Вы должны быть в корневой директории проекта (где находится `docker-compose.yml`), а не в папке `frontend`.

### 3. Запустите проект

**Вариант А: Используйте скрипт (рекомендуется)**
```bash
./start.sh
```

**Вариант Б: Вручную**
```bash
docker-compose up -d
```

### 4. Проверьте статус

```bash
docker-compose ps
```

Все сервисы должны быть в статусе "Up".

### 5. Откройте приложение

Откройте браузер: **http://localhost:3000**

---

## После изменений в коде (для применения исправлений авторизации)

```bash
# Пересобрать и перезапустить backend
cd /Users/maksimzagorodnev/Downloads/kinoswipe
docker-compose build app
docker-compose up -d app

# Проверить логи
docker-compose logs app -f
```

---

## Полезные команды

```bash
# Просмотр логов backend
docker-compose logs app -f

# Просмотр логов frontend
docker-compose logs frontend -f

# Остановка всех сервисов
docker-compose down

# Перезапуск всех сервисов
docker-compose restart
```
