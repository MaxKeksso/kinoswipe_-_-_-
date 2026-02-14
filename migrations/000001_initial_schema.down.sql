-- Удаление триггеров
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
DROP TRIGGER IF EXISTS update_filters_updated_at ON filters;
DROP TRIGGER IF EXISTS update_movies_updated_at ON movies;

-- Удаление функции
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Удаление таблиц в обратном порядке (из-за внешних ключей)
DROP TABLE IF EXISTS feedbacks;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS swipes;
DROP TABLE IF EXISTS room_members;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS filters;
DROP TABLE IF EXISTS users;
