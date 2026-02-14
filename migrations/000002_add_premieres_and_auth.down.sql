-- Удаление триггеров
DROP TRIGGER IF EXISTS update_match_links_updated_at ON match_links;
DROP TRIGGER IF EXISTS update_premieres_updated_at ON premieres;

-- Удаление таблиц
DROP TABLE IF EXISTS match_links;
DROP TABLE IF EXISTS premieres;

-- Удаление поля password_hash
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
