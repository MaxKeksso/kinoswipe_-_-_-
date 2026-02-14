-- Запустите этот файл под суперпользователем PostgreSQL (postgres),
-- чтобы создать пользователя kinoswipe и базу данных.
--
-- Пример: psql -h localhost -p 5432 -U postgres -f scripts/init_db.sql

CREATE USER kinoswipe WITH PASSWORD 'kinoswipe123';
CREATE DATABASE kinoswipe OWNER kinoswipe;
GRANT ALL PRIVILEGES ON DATABASE kinoswipe TO kinoswipe;

-- Подключитесь к базе kinoswipe и выдайте права на схему (выполните отдельно или см. ниже)
-- \c kinoswipe
-- GRANT ALL ON SCHEMA public TO kinoswipe;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinoswipe;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinoswipe;

\c kinoswipe
GRANT ALL ON SCHEMA public TO kinoswipe;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kinoswipe;
