-- Добавление тестовых премьер для боковых панелей

-- Премьеры слева
INSERT INTO premieres (id, title, description, poster_url, release_date, is_active, position)
VALUES 
    (
        gen_random_uuid(),
        'Дюна: Часть вторая',
        'Продолжение эпической саги о пустынной планете Арракис. Пол Атрейдес объединяется с фрименами для решающей битвы.',
        'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
        '2024-03-01'::timestamp,
        true,
        'left'
    ),
    (
        gen_random_uuid(),
        'Оппенгеймер',
        'История создания атомной бомбы глазами Роберта Оппенгеймера. Фильм о моральных дилеммах науки.',
        'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDkEGP7TtR7y2h5.jpg',
        '2023-07-21'::timestamp,
        true,
        'left'
    ),
    (
        gen_random_uuid(),
        'Барби',
        'Комедия о знаменитой кукле Барби, которая отправляется в реальный мир в поисках смысла жизни.',
        'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
        '2023-07-21'::timestamp,
        true,
        'left'
    )
ON CONFLICT DO NOTHING;

-- Премьеры справа
INSERT INTO premieres (id, title, description, poster_url, release_date, is_active, position)
VALUES 
    (
        gen_random_uuid(),
        'Джон Уик 4',
        'Легендарный наемный убийца Джон Уик сражается с Высшим столом в финальной битве.',
        'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
        '2023-03-24'::timestamp,
        true,
        'right'
    ),
    (
        gen_random_uuid(),
        'Гарри Поттер и Философский камень (4K)',
        'Ремастер классики в 4K. Первое путешествие юного волшебника в Хогвартс.',
        'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXv4xLfHn.jpg',
        '2024-01-01'::timestamp,
        true,
        'right'
    ),
    (
        gen_random_uuid(),
        'Мстители: Финал (Переиздание)',
        'Легендарный финал саги о Мстителях возвращается в кинотеатры с новыми сценами.',
        'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
        '2024-02-15'::timestamp,
        true,
        'right'
    )
ON CONFLICT DO NOTHING;
