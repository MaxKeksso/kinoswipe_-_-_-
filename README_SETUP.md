# Настройка и запуск KinoSwipe

## Важно! База данных в Docker

Приложение использует **PostgreSQL базу данных внутри Docker контейнера**, а не локальную базу данных на вашем компьютере.

## Подключение к базе данных в Docker

Если вы хотите посмотреть таблицы или данные в базе данных, используйте:

```bash
# Посмотреть все таблицы
docker-compose exec postgres psql -U kinoswipe -d kinoswipe -c "\dt"

# Подключиться к базе данных интерактивно
docker-compose exec postgres psql -U kinoswipe -d kinoswipe

# Использовать скрипт проверки
./check_db.sh
```

## Параметры подключения к базе данных в Docker

- **Хост**: localhost (или kinoswipe_db внутри Docker сети)
- **Порт**: 5432
- **База данных**: kinoswipe
- **Пользователь**: kinoswipe
- **Пароль**: kinoswipe123

## Если нужно подключиться из внешнего приложения (например, DBeaver, pgAdmin)

Используйте:
- Host: localhost
- Port: 5432
- Database: kinoswipe
- Username: kinoswipe
- Password: kinoswipe123

## Запуск всего приложения

```bash
docker-compose up -d
```

Или используйте скрипт:
```bash
./start.sh
```

## Проверка работы

- Frontend: http://localhost:3000
- Backend API: http://localhost:3000/api/v1 (через nginx) или http://localhost:8080/api/v1 (напрямую)
- База данных: localhost:5432

## Логи

```bash
# Все логи
docker-compose logs -f

# Логи backend
docker-compose logs -f app

# Логи базы данных
docker-compose logs -f postgres

# Логи frontend
docker-compose logs -f frontend
```
