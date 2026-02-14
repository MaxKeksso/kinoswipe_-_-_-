-- Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50) UNIQUE,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    user_type VARCHAR(20) NOT NULL DEFAULT 'regular',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Создание таблицы rooms (без filter_id сначала)
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY,
    code VARCHAR(6) UNIQUE NOT NULL,
    host_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    filter_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Создание таблицы filters (теперь можно ссылаться на rooms)
CREATE TABLE IF NOT EXISTS filters (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    genres JSONB,
    min_year INTEGER,
    max_year INTEGER,
    min_duration INTEGER,
    max_duration INTEGER,
    min_imdb_rating DECIMAL(3,1),
    min_kp_rating DECIMAL(3,1),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_filters_room_id ON filters(room_id);

-- Добавление внешнего ключа filter_id в rooms после создания таблицы filters
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_filter_id 
    FOREIGN KEY (filter_id) REFERENCES filters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_filter_id ON rooms(filter_id);


-- Создание таблицы room_members
CREATE TABLE IF NOT EXISTS room_members (
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);

-- Создание таблицы movies
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    poster_url TEXT,
    imdb_rating DECIMAL(3,1),
    kp_rating DECIMAL(3,1),
    genre JSONB,
    year INTEGER,
    duration INTEGER,
    description TEXT,
    trailer_url TEXT,
    streaming_url JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies USING GIN(genre);
CREATE INDEX IF NOT EXISTS idx_movies_imdb_rating ON movies(imdb_rating);
CREATE INDEX IF NOT EXISTS idx_movies_kp_rating ON movies(kp_rating);

-- Создание таблицы swipes
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    room_id UUID NOT NULL,
    movie_id UUID NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE(user_id, room_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_room_id ON swipes(room_id);
CREATE INDEX IF NOT EXISTS idx_swipes_movie_id ON swipes(movie_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON swipes(direction);
CREATE INDEX IF NOT EXISTS idx_swipes_user_room ON swipes(user_id, room_id);

-- Создание таблицы matches
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    movie_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE(room_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_room_id ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_movie_id ON matches(movie_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Создание таблицы feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    room_id UUID NOT NULL,
    match_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    time_spent INTEGER,
    disputes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_room_id ON feedbacks(room_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_match_id ON feedbacks(match_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filters_updated_at BEFORE UPDATE ON filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
