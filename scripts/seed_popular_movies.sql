-- Скрипт для загрузки популярных фильмов в базу данных
-- Используйте: docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe < scripts/seed_popular_movies.sql
-- Или: docker-compose exec postgres psql -U kinoswipe -d kinoswipe -f /app/migrations/../scripts/seed_popular_movies.sql

-- Популярные фильмы с реальными постерами из TMDb API
INSERT INTO movies (id, title, title_en, poster_url, imdb_rating, kp_rating, genre, year, duration, description) VALUES
-- Фантастика
(gen_random_uuid(), 'Матрица', 'The Matrix', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 8.7, 8.5, '["фантастика", "боевик"]', 1999, 136, 'Хакер Нео узнает, что его реальность - это иллюзия, созданная машинами.'),
(gen_random_uuid(), 'Интерстеллар', 'Interstellar', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 8.6, 8.6, '["фантастика", "драма"]', 2014, 169, 'Исследователи отправляются в космос, чтобы найти новый дом для человечества.'),
(gen_random_uuid(), 'Начало', 'Inception', 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 8.8, 8.7, '["фантастика", "триллер"]', 2010, 148, 'Профессионал по проникновению в сны получает задание внедрить идею.'),
(gen_random_uuid(), 'Бегущий по лезвию 2049', 'Blade Runner 2049', 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWj5FlWHauUxPSX.jpg', 8.0, 7.5, '["фантастика", "триллер"]', 2017, 164, 'Молодой детектив раскрывает секрет, который может погубить общество.'),
(gen_random_uuid(), 'Дюна', 'Dune', 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 8.0, 7.8, '["фантастика", "драма"]', 2021, 155, 'Сын знатного рода отправляется на опасную планету Арракис.'),

-- Драма
(gen_random_uuid(), 'Криминальное чтиво', 'Pulp Fiction', 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 8.9, 8.6, '["криминал", "драма"]', 1994, 154, 'Переплетенные истории криминального мира Лос-Анджелеса.'),
(gen_random_uuid(), 'Побег из Шоушенка', 'The Shawshank Redemption', 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', 9.3, 9.1, '["драма"]', 1994, 142, 'Банкир приговорен к пожизненному заключению за убийство жены.'),
(gen_random_uuid(), 'Форрест Гамп', 'Forrest Gump', 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 8.8, 8.9, '["драма", "комедия"]', 1994, 142, 'История простого парня, который становится свидетелем важных событий.'),
(gen_random_uuid(), 'Бойцовский клуб', 'Fight Club', 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 8.8, 8.7, '["драма", "триллер"]', 1999, 139, 'Офисный работник создает подпольный бойцовский клуб.'),

-- Боевики
(gen_random_uuid(), 'Темный рыцарь', 'The Dark Knight', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 9.0, 8.5, '["боевик", "криминал"]', 2008, 152, 'Бэтмен сталкивается с новым противником - Джокером.'),
(gen_random_uuid(), 'Джон Уик', 'John Wick', 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg', 7.4, 7.5, '["боевик", "криминал"]', 2014, 101, 'Легендарный киллер выходит на пенсию, но враги не дают покоя.')

ON CONFLICT DO NOTHING;
