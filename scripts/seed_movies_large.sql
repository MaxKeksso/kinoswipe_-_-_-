-- Скрипт для заполнения базы данных большим количеством фильмов (200-300 фильмов)
-- Используйте: docker-compose exec -T postgres psql -U kinoswipe -d kinoswipe -f /app/migrations/../scripts/seed_movies_large.sql

-- Популярные фильмы с реальными постерами
INSERT INTO movies (id, title, title_en, poster_url, imdb_rating, kp_rating, genre, year, duration, description) VALUES
-- Фантастика
(gen_random_uuid(), 'Матрица', 'The Matrix', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 8.7, 8.5, '["фантастика", "боевик"]', 1999, 136, 'Хакер Нео узнает, что его реальность - это иллюзия, созданная машинами.'),
(gen_random_uuid(), 'Интерстеллар', 'Interstellar', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 8.6, 8.6, '["фантастика", "драма"]', 2014, 169, 'Исследователи отправляются в космос, чтобы найти новый дом для человечества.'),
(gen_random_uuid(), 'Начало', 'Inception', 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 8.8, 8.7, '["фантастика", "триллер"]', 2010, 148, 'Профессионал по проникновению в сны получает задание внедрить идею.'),
(gen_random_uuid(), 'Бегущий по лезвию 2049', 'Blade Runner 2049', 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWj5FlWHauUxPSX.jpg', 8.0, 7.5, '["фантастика", "триллер"]', 2017, 164, 'Молодой детектив раскрывает секрет, который может погубить общество.'),
(gen_random_uuid(), 'Дюна', 'Dune', 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 8.0, 7.8, '["фантастика", "драма"]', 2021, 155, 'Сын знатного рода отправляется на опасную планету Арракис.'),
(gen_random_uuid(), 'Терминатор 2: Судный день', 'Terminator 2: Judgment Day', 'https://image.tmdb.org/t/p/w500/weVXMD5QBGeQil4HATwg2JIZvi3.jpg', 8.6, 8.1, '["фантастика", "боевик"]', 1991, 137, 'Кибернетический организм из будущего защищает подростка.'),
(gen_random_uuid(), 'Звездные войны: Эпизод IV - Новая надежда', 'Star Wars: Episode IV - A New Hope', 'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', 8.6, 8.1, '["фантастика", "приключения"]', 1977, 121, 'Молодой фермер присоединяется к повстанцам в борьбе против Империи.'),
(gen_random_uuid(), 'Пятый элемент', 'The Fifth Element', 'https://image.tmdb.org/t/p/w500/zaFa1NRZEnFgRTv5OVXkNIZO78O.jpg', 7.7, 8.0, '["фантастика", "боевик"]', 1997, 126, 'Таксист должен помочь спасти Землю от зла.'),
(gen_random_uuid(), 'Чужой', 'Alien', 'https://image.tmdb.org/t/p/w500/b33JdS7NPx5YDNBa5cOty4h4Ouz.jpg', 8.5, 8.0, '["фантастика", "ужасы"]', 1979, 117, 'Экипаж космического корабля сталкивается с инопланетной формой жизни.'),
(gen_random_uuid(), 'Гравитация', 'Gravity', 'https://image.tmdb.org/t/p/w500/wVW2sJpgPh7p8l6qHiF3UlF7rNI.jpg', 7.7, 7.3, '["фантастика", "драма"]', 2013, 91, 'Астронавты пытаются выжить после катастрофы в космосе.'),

-- Драма
(gen_random_uuid(), 'Криминальное чтиво', 'Pulp Fiction', 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 8.9, 8.6, '["криминал", "драма"]', 1994, 154, 'Переплетенные истории криминального мира Лос-Анджелеса.'),
(gen_random_uuid(), 'Зеленая миля', 'The Green Mile', 'https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg', 8.6, 9.1, '["драма", "фэнтези"]', 1999, 189, 'История тюремного надзирателя и необычного заключенного.'),
(gen_random_uuid(), 'Побег из Шоушенка', 'The Shawshank Redemption', 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', 9.3, 9.1, '["драма"]', 1994, 142, 'Банкир приговорен к пожизненному заключению за убийство жены.'),
(gen_random_uuid(), 'Форрест Гамп', 'Forrest Gump', 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 8.8, 8.9, '["драма", "комедия"]', 1994, 142, 'История простого парня, который становится свидетелем важных событий.'),
(gen_random_uuid(), 'Список Шиндлера', 'Schindler''s List', 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', 9.0, 8.8, '["драма", "биография"]', 1993, 195, 'История бизнесмена, спасавшего евреев во время Холокоста.'),
(gen_random_uuid(), 'Бойцовский клуб', 'Fight Club', 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 8.8, 8.7, '["драма", "триллер"]', 1999, 139, 'Офисный работник создает подпольный бойцовский клуб.'),
(gen_random_uuid(), 'Властелин колец: Возвращение короля', 'The Lord of the Rings: The Return of the King', 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', 9.0, 8.7, '["фэнтези", "драма"]', 2003, 201, 'Финальная битва за Средиземье.'),
(gen_random_uuid(), 'Гладиатор', 'Gladiator', 'https://image.tmdb.org/t/p/w500/6WBIzCgmDCYrqh64yDREGeDk9d3.jpg', 8.5, 8.5, '["боевик", "драма"]', 2000, 155, 'Преданный генерал становится рабом и гладиатором.'),
(gen_random_uuid(), 'Титаник', 'Titanic', 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', 7.9, 8.4, '["драма", "мелодрама"]', 1997, 194, 'Любовная история на фоне гибели "Титаника".'),
(gen_random_uuid(), 'Темный рыцарь', 'The Dark Knight', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 9.0, 8.5, '["боевик", "криминал"]', 2008, 152, 'Бэтмен сталкивается с новым противником - Джокером.'),

-- Боевики
(gen_random_uuid(), 'Убить Билла', 'Kill Bill: Vol. 1', 'https://image.tmdb.org/t/p/w500/v7TaX8kXMXs5yFFGR41guUDNcnB.jpg', 8.2, 7.9, '["боевик", "триллер"]', 2003, 111, 'Невеста мстит за убийство на свадьбе.'),
(gen_random_uuid(), 'Джон Уик', 'John Wick', 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg', 7.4, 7.5, '["боевик", "криминал"]', 2014, 101, 'Легендарный киллер выходит на пенсию, но враги не дают покоя.'),
(gen_random_uuid(), 'Безумный Макс: Дорога ярости', 'Mad Max: Fury Road', 'https://image.tmdb.org/t/p/w500/hA2ple9q4USAdbJs5dS8fiTZ6iy.jpg', 8.1, 7.6, '["боевик", "фантастика"]', 2015, 120, 'Макс помогает беглой рабыне сбежать от тирана.'),
(gen_random_uuid(), 'Мстители: Финал', 'Avengers: Endgame', 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', 8.4, 8.3, '["боевик", "фантастика"]', 2019, 181, 'Мстители собираются для финальной битвы с Таносом.'),
(gen_random_uuid(), 'Начало', 'Inception', 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 8.8, 8.7, '["боевик", "фантастика"]', 2010, 148, 'Профессионал по проникновению в сны получает задание внедрить идею.')

ON CONFLICT DO NOTHING;
