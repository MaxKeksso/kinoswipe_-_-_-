-- Добавление поля password в users (для авторизации)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Создание таблицы premieres
CREATE TABLE IF NOT EXISTS premieres (
    id UUID PRIMARY KEY,
    movie_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster_url TEXT,
    release_date TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    position VARCHAR(10) NOT NULL CHECK (position IN ('left', 'right')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_premieres_is_active ON premieres(is_active);
CREATE INDEX IF NOT EXISTS idx_premieres_position ON premieres(position);
CREATE INDEX IF NOT EXISTS idx_premieres_release_date ON premieres(release_date);

-- Создание таблицы match_links
CREATE TABLE IF NOT EXISTS match_links (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_links_match_id ON match_links(match_id);
CREATE INDEX IF NOT EXISTS idx_match_links_platform ON match_links(platform);

-- Триггеры для обновления updated_at (DROP на случай повторного применения миграции)
DROP TRIGGER IF EXISTS update_premieres_updated_at ON premieres;
CREATE TRIGGER update_premieres_updated_at BEFORE UPDATE ON premieres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_match_links_updated_at ON match_links;
CREATE TRIGGER update_match_links_updated_at BEFORE UPDATE ON match_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
