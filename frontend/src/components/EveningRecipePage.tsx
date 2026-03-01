import React, { useState, useEffect } from 'react';
import './EveningRecipePage.css';
import { apiService, Movie } from '../api/api';
import { getMovieDisplayTitle } from '../utils/movieRussian';

interface Recipe {
  playlist: { name: string; tracks: string[]; link: string; icon: string };
  cocktail: { name: string; ingredients: string[]; steps: string[] };
  food: { name: string; description: string; promo: string; service: string; icon: string };
  aviasales?: { city: string; reason: string; price: string };
  atmosphere: string[];
}

const RECIPES_BY_GENRE: Record<string, Recipe> = {
  'Drama': {
    playlist: { name: 'Jazz of the Roaring 20s', tracks: ['Rhapsody in Blue — Gershwin', "Ain't Misbehavin' — Fats Waller", "Let's Misbehave — Cole Porter"], link: '#vk-music', icon: '🎷' },
    cocktail: { name: 'Gatsby Sidecar', ingredients: ['60 мл коньяка', '30 мл Cointreau', '30 мл лимонного сока', 'Сахарная кромка'], steps: ['Охладить бокал с сахарной кромкой', 'Смешать ингредиенты со льдом в шейкере', 'Процедить в бокал', 'Украсить долькой лимона'] },
    food: { name: 'Устрицы и канапе', description: 'Лёгкие закуски в стиле 20-х: мини-сэндвичи, оливки, канапе с икрой', promo: 'DRAMA10', service: 'Яндекс Еда', icon: '🦪' },
    atmosphere: ['Приглуши свет, включи настольную лампу', 'Добавь свечи на стол', 'Накрой стол как на вечеринку — красивые бокалы обязательны'],
  },
  'Romance': {
    playlist: { name: 'Café de Paris', tracks: ["La Valse d'Amélie — Yann Tiersen", 'Le Moulin — Yann Tiersen', "Comptine d'un autre été"], link: '#vk-music', icon: '🎹' },
    cocktail: { name: 'Французский 75', ingredients: ['30 мл джина', '15 мл лимонного сока', '10 мл сахарного сиропа', 'Шампанское'], steps: ['Смешать джин, лимон и сироп со льдом', 'Процедить в флюте', 'Долить шампанским', 'Украсить цедрой лимона'] },
    food: { name: 'Круассаны и сыр', description: 'Французский вечер: круассаны, камамбер, виноград, багет', promo: 'ROMANCE15', service: 'Delivery Club', icon: '🥐' },
    aviasales: { city: 'Париж', reason: 'Пройдитесь по Монмартру — самый романтичный район города', price: 'от 28 000 ₽' },
    atmosphere: ['Поставь маленький цветок в вазу', 'Открой окно — пусть будет немного свежего воздуха', 'Выключи телефон на 2 часа — только вы и фильм'],
  },
  'Sci-Fi': {
    playlist: { name: 'Hans Zimmer: Interstellar OST', tracks: ['Cornfield Chase', 'Stay', 'Do Not Go Gentle Into That Good Night'], link: '#vk-music', icon: '🎻' },
    cocktail: { name: 'Космический Неграони', ingredients: ['30 мл джина', '30 мл Campari', '30 мл сладкого вермута', 'Апельсин'], steps: ['Смешать всё со льдом в стакане', 'Помешать ложкой 30 сек', 'Украсить долькой апельсина'] },
    food: { name: 'Пицца и попкорн', description: 'Длинный фильм — нужна еда. Закажи большую пиццу и лавандовый попкорн', promo: 'SPACE20', service: 'Яндекс Еда', icon: '🍕' },
    atmosphere: ['Выключи все источники света', 'Накрой окна — максимальная темнота', 'Фильм лучше смотреть на большом экране с хорошим звуком'],
  },
  'Crime': {
    playlist: { name: 'K-Drama Chill', tracks: ['Bts — Spring Day', 'IU — Blueming', 'Epik High — Born Hater'], link: '#vk-music', icon: '🎤' },
    cocktail: { name: 'Соджу Слаш', ingredients: ['50 мл соджу (или водки)', '100 мл персикового сока', 'Лёд', 'Mint'], steps: ['Заполнить стакан льдом', 'Налить соджу и сок', 'Перемешать', 'Украсить мятой'] },
    food: { name: 'Чикен и рамен', description: 'Острая кухня: заказать острую курицу или рамен с яйцом', promo: 'CRIME10', service: 'Delivery Club', icon: '🍜' },
    atmosphere: ['Фильм очень напряжённый — готовь плед', 'Не читай спойлеры', 'Можно посмотреть с кем-то — реакции будут смешнее'],
  },
  'Thriller': {
    playlist: { name: 'K-Drama Chill', tracks: ['Bts — Spring Day', 'IU — Blueming', 'Epik High — Born Hater'], link: '#vk-music', icon: '🎤' },
    cocktail: { name: 'Соджу Слаш', ingredients: ['50 мл соджу (или водки)', '100 мл персикового сока', 'Лёд', 'Mint'], steps: ['Заполнить стакан льдом', 'Налить соджу и сок', 'Перемешать', 'Украсить мятой'] },
    food: { name: 'Чикен и рамен', description: 'Корейская кухня: заказать острую курицу или рамен с яйцом', promo: 'THRILLER10', service: 'Delivery Club', icon: '🍜' },
    atmosphere: ['Фильм очень напряжённый — готовь плед', 'Не читай спойлеры', 'Можно посмотреть с кем-то — реакции будут смешнее'],
  },
  'Fantasy': {
    playlist: { name: 'John Williams — Star Wars', tracks: ['Main Theme', 'The Imperial March', 'Duel of the Fates'], link: '#vk-music', icon: '🎻' },
    cocktail: { name: 'Синий Молок', ingredients: ['60 мл молока', '20 мл черничного сиропа', '10 мл мятного сиропа', 'Лёд'], steps: ['Смешать сиропы', 'Добавить молоко', 'Хорошо перемешать до синего цвета'] },
    food: { name: 'Ролы и поке', description: 'Межгалактическая кухня: заказать суши-ролы или боул с лососем', promo: 'FANTASY10', service: 'Яндекс Еда', icon: '🍱' },
    atmosphere: ['Выключи все огни, включи гирлянды', 'Сагу лучше смотреть с самого начала', 'Скажи заклинание перед стартом'],
  },
  'Action': {
    playlist: { name: 'Matrix / Cyberpunk', tracks: ['Rob Zombie — Dragula', 'Marilyn Manson — Rock is Dead', 'Rage Against the Machine — Wake Up'], link: '#vk-music', icon: '💿' },
    cocktail: { name: 'Красная Таблетка', ingredients: ['30 мл водки', '60 мл томатного сока', '5 мл Табаско', 'Лёд', 'Соль/перец'], steps: ['Смешать всё в шейкере', 'Хорошо встряхнуть', 'Процедить в стакан со льдом', 'Украсить стеблем сельдерея'] },
    food: { name: 'Бургер и чипсы', description: 'Максимально крутой бургер с беконом и картошкой фри', promo: 'ACTION25', service: 'Delivery Club', icon: '🍔' },
    atmosphere: ['Приглуши свет до минимума', 'Хорошая звуковая система — обязательна', 'Можно надеть чёрное, войти в образ'],
  },
  'Animation': {
    playlist: { name: 'Studio Ghibli — Best OSTs', tracks: ['Joe Hisaishi — One Summer\'s Day', 'Joe Hisaishi — Merry-Go-Round of Life', 'Spirited Away Theme'], link: '#vk-music', icon: '🎨' },
    cocktail: { name: 'Радужный Лимонад', ingredients: ['200 мл лимонада', '30 мл малинового сиропа', '30 мл мятного сиропа', 'Лёд'], steps: ['Наполнить стакан льдом', 'Добавить сиропы послойно', 'Аккуратно залить лимонадом'] },
    food: { name: 'Попкорн и мармелад', description: 'Классика анимации: сладкий попкорн, мармелад и горячий шоколад', promo: 'ANIME15', service: 'Самокат', icon: '🍿' },
    atmosphere: ['Укройся пледом', 'Позволь себе почувствовать себя ребёнком', 'Приготовь горячий чай с мёдом'],
  },
  'Comedy': {
    playlist: { name: 'La La Land OST', tracks: ['City of Stars', 'Another Day of Sun', "Mia & Sebastian's Theme"], link: '#vk-music', icon: '🎺' },
    cocktail: { name: 'Sunset Boulevard', ingredients: ['45 мл текилы', '60 мл апельсинового сока', '15 мл гренадина', 'Лёд'], steps: ['Наполнить стакан льдом', 'Налить сок и текилу', 'Аккуратно добавить гренадин', 'Не мешать — это даст красивый закат'] },
    food: { name: 'Тапас и брускетта', description: 'Лёгкий ужин: брускетта с томатами, авокадо-тост, капрезе', promo: 'COMEDY20', service: 'Яндекс Еда', icon: '🥑' },
    atmosphere: ['Одеться нарядно — даже если дома', 'Включи фильм на час позже заката', 'Позволь себе смеяться в голос'],
  },
  'Horror': {
    playlist: { name: 'Dark Ambient Horrors', tracks: ['Akira Yamaoka — Promise', 'Jóhann Jóhannsson — The Sun\'s Gone Dim', 'Cliff Martinez — Wanna Fight'], link: '#vk-music', icon: '🎵' },
    cocktail: { name: 'Кровавая Мэри', ingredients: ['45 мл водки', '90 мл томатного сока', '15 мл лимонного сока', 'Соус Ворчестер', 'Табаско'], steps: ['Смешать все ингредиенты', 'Перелить через лёд', 'Украсить палочкой сельдерея'] },
    food: { name: 'Начос с соусом', description: 'Чипсы начос, острый соус и гуакамоле — идеально для ужасов', promo: 'HORROR15', service: 'Delivery Club', icon: '🌮' },
    atmosphere: ['Выключи весь свет', 'Не смотри один — или наоборот, смотри один для максимального страха', 'Подготовь плед, чтобы прятаться'],
  },
  'War': {
    playlist: { name: '60s-80s Classics', tracks: ['Elvis — Suspicious Minds', 'Bob Dylan — Like a Rolling Stone', 'The Beatles — Let It Be'], link: '#vk-music', icon: '🎸' },
    cocktail: { name: 'Шоколадная Мечта', ingredients: ['30 мл шоколадного ликёра', '30 мл сливок', '15 мл ирландского виски', 'Тёртый шоколад'], steps: ['Смешать ликёр и виски', 'Добавить сливки', 'Украсить тёртым шоколадом сверху'] },
    food: { name: 'Сытный ужин', description: 'Картофель, мясо и хлеб — питательный ужин для серьёзного кино', promo: 'WAR15', service: 'Самокат', icon: '🍖' },
    atmosphere: ['Позвони близким до начала фильма', 'Приготовь носовые платки — фильм очень трогательный', 'Выключи уведомления телефона'],
  },
  'History': {
    playlist: { name: '60s-80s Classics', tracks: ['Elvis — Suspicious Minds', 'Bob Dylan — Like a Rolling Stone', 'The Beatles — Let It Be'], link: '#vk-music', icon: '🎸' },
    cocktail: { name: 'Шоколадная Мечта', ingredients: ['30 мл шоколадного ликёра', '30 мл сливок', '15 мл ирландского виски', 'Тёртый шоколад'], steps: ['Смешать ликёр и виски', 'Добавить сливки', 'Украсить тёртым шоколадом сверху'] },
    food: { name: 'Коробка шоколадных конфет', description: 'Ассорти шоколада и мороженого для приятного исторического вечера', promo: 'HISTORY15', service: 'Самокат', icon: '🍫' },
    atmosphere: ['Позвони бабушке до начала фильма', 'Приготовь носовые платки — фильм очень трогательный', 'Выключи уведомления телефона'],
  },
  'default': {
    playlist: { name: 'Кино-вечер: лучшие OST', tracks: ['Hans Zimmer — Time', 'Ennio Morricone — The Good the Bad and the Ugly', 'John Williams — Hedwig\'s Theme'], link: '#vk-music', icon: '🎵' },
    cocktail: { name: 'Классический Мохито', ingredients: ['50 мл белого рома', '25 мл лимонного сока', '10 мл сахарного сиропа', 'Мята', 'Содовая'], steps: ['Смять мяту в бокале', 'Добавить лёд', 'Влить ром, сок и сироп', 'Долить содовой'] },
    food: { name: 'Пицца и попкорн', description: 'Классика кинопросмотра — закажи пиццу и приготовь попкорн', promo: 'MOVIE20', service: 'Яндекс Еда', icon: '🍕' },
    atmosphere: ['Удобно расположись', 'Приглуши свет', 'Выключи уведомления телефона'],
  },
};

function getRecipeForMovie(movie: Movie): Recipe {
  let genres: string[] = [];
  try {
    genres = JSON.parse(movie.genre);
  } catch {
    genres = [movie.genre];
  }
  for (const g of genres) {
    const normalized = g.trim();
    if (RECIPES_BY_GENRE[normalized]) return RECIPES_BY_GENRE[normalized];
    // Case-insensitive lookup
    const key = Object.keys(RECIPES_BY_GENRE).find(
      k => k.toLowerCase() === normalized.toLowerCase()
    );
    if (key) return RECIPES_BY_GENRE[key];
  }
  return RECIPES_BY_GENRE['default'];
}

function getFirstGenre(movie: Movie): string {
  try {
    const genres: string[] = JSON.parse(movie.genre);
    return genres[0] || '';
  } catch {
    return movie.genre;
  }
}

const EveningRecipePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedDbMovie, setSelectedDbMovie] = useState<Movie | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [tab, setTab] = useState<'select' | 'playlist' | 'cocktail' | 'food' | 'atmosphere'>('select');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [dbMovies, setDbMovies] = useState<Movie[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setDbLoading(true);
      try {
        const all = await apiService.getAllMovies();
        const filtered = all
          .filter(m => m.comic_poster_url || m.poster_url)
          .sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0))
          .slice(0, 20);
        setDbMovies(filtered);
      } catch {
        setDbMovies([]);
      } finally {
        setDbLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectDbMovie = (movie: Movie) => {
    setSelectedDbMovie(movie);
    setGenerating(true);
    setRecipe(null);
    setTimeout(() => {
      setRecipe(getRecipeForMovie(movie));
      setGenerating(false);
      setTab('playlist');
    }, 1600);
  };

  const copyPromo = (promo: string) => {
    navigator.clipboard.writeText(promo).catch(() => {});
    setCopied(promo);
    setTimeout(() => setCopied(''), 2000);
  };

  const tabs = [
    { id: 'playlist', label: 'Плейлист', icon: '🎵' },
    { id: 'cocktail', label: 'Коктейль', icon: '🍹' },
    { id: 'food', label: 'Еда', icon: '🍕' },
    { id: 'atmosphere', label: 'Атмосфера', icon: '🕯️' },
  ] as { id: typeof tab; label: string; icon: string }[];

  if (dbLoading) {
    return (
      <div className="recipe-page">
        <div className="recipe-header">
          <button className="recipe-back-btn" onClick={onBack}>← Назад</button>
          <div className="recipe-header-title">
            <h1>🌆 Рецепт Вечера</h1>
            <p>Планируем идеальный вечер под фильм</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#fff', fontSize: 18 }}>
          Загрузка фильмов...
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-page">
      <div className="recipe-header">
        <button className="recipe-back-btn" onClick={onBack}>← Назад</button>
        <div className="recipe-header-title">
          <h1>🌆 Рецепт Вечера</h1>
          <p>Планируем идеальный вечер под фильм</p>
        </div>
        {selectedDbMovie && (
          <button
            className="recipe-change-btn"
            onClick={() => { setSelectedDbMovie(null); setRecipe(null); setTab('select'); }}
          >
            ↺ Сменить
          </button>
        )}
      </div>

      {/* Выбор фильма */}
      {tab === 'select' && (
        <div className="recipe-content">
          {!generating ? (
            <>
              <div className="recipe-select-header">
                <h2>Выберите фильм для вечера</h2>
                <p>AI составит плейлист, рецепт коктейля, закажет еду и создаст атмосферу</p>
              </div>
              <div className="recipe-movies-grid">
                {dbMovies.map(movie => (
                  <div key={movie.id} className="recipe-movie-card" onClick={() => handleSelectDbMovie(movie)}>
                    {(movie.comic_poster_url || movie.poster_url) && (
                      <img
                        src={movie.comic_poster_url || movie.poster_url}
                        alt={getMovieDisplayTitle(movie)}
                        style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      />
                    )}
                    <div className="recipe-movie-info">
                      <strong>{getMovieDisplayTitle(movie)}</strong>
                      <span>{getFirstGenre(movie)} · {movie.year}</span>
                      {movie.imdb_rating && (
                        <span className="recipe-movie-mood">IMDb {movie.imdb_rating.toFixed(1)}</span>
                      )}
                    </div>
                    <span className="recipe-movie-arrow">→</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="recipe-generating">
              <div className="recipe-generating-icon">🤖</div>
              <h2>Составляем рецепт вечера...</h2>
              <p>Для «{selectedDbMovie ? getMovieDisplayTitle(selectedDbMovie) : ''}»</p>
              <div className="recipe-gen-steps">
                <span>🎵 Подбираем плейлист</span>
                <span>🍹 Придумываем коктейль</span>
                <span>🍕 Выбираем еду</span>
              </div>
              <div className="recipe-gen-bar"><div className="recipe-gen-fill" /></div>
            </div>
          )}
        </div>
      )}

      {/* Результат */}
      {recipe && selectedDbMovie && tab !== 'select' && (
        <>
          {/* Шапка с фильмом */}
          <div className="recipe-film-banner">
            {(selectedDbMovie.comic_poster_url || selectedDbMovie.poster_url) ? (
              <img
                src={selectedDbMovie.comic_poster_url || selectedDbMovie.poster_url}
                alt={getMovieDisplayTitle(selectedDbMovie)}
                style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
            ) : (
              <span className="recipe-film-emoji">🎬</span>
            )}
            <div>
              <strong>{getMovieDisplayTitle(selectedDbMovie)}</strong>
              <span>{getFirstGenre(selectedDbMovie)} · {selectedDbMovie.year} · {Math.floor(selectedDbMovie.duration / 60)}ч {selectedDbMovie.duration % 60}м</span>
            </div>
          </div>

          {/* Табы */}
          <div className="recipe-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`recipe-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="recipe-content">
            {/* Плейлист */}
            {tab === 'playlist' && (
              <div className="recipe-section">
                <div className="recipe-section-icon">{recipe.playlist.icon}</div>
                <h2>{recipe.playlist.name}</h2>
                <p className="recipe-section-sub">Включи до начала фильма — создаст нужную атмосферу</p>
                <div className="recipe-tracks">
                  {recipe.playlist.tracks.map((track, i) => (
                    <div key={i} className="recipe-track-card">
                      <span className="recipe-track-num">{i + 1}</span>
                      <span className="recipe-track-name">{track}</span>
                      <span className="recipe-track-play">▶</span>
                    </div>
                  ))}
                </div>
                <button
                  className="recipe-action-btn"
                  onClick={() => window.open('https://vk.com/music', '_blank')}
                >
                  Открыть в VK Музыке →
                </button>
              </div>
            )}

            {/* Коктейль */}
            {tab === 'cocktail' && (
              <div className="recipe-section">
                <div className="recipe-section-icon">🍹</div>
                <h2>{recipe.cocktail.name}</h2>
                <p className="recipe-section-sub">Приготовь до начала фильма — займёт 5 минут</p>
                <div className="recipe-ingredients">
                  <h3>Ингредиенты:</h3>
                  {recipe.cocktail.ingredients.map((ing, i) => (
                    <div key={i} className="recipe-ingredient">
                      <span className="recipe-ingredient-dot">•</span>
                      {ing}
                    </div>
                  ))}
                </div>
                <div className="recipe-steps">
                  <h3>Приготовление:</h3>
                  {recipe.cocktail.steps.map((step, i) => (
                    <div key={i} className="recipe-step">
                      <span className="recipe-step-num">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Еда */}
            {tab === 'food' && (
              <div className="recipe-section">
                <div className="recipe-section-icon">{recipe.food.icon}</div>
                <h2>{recipe.food.name}</h2>
                <p className="recipe-section-sub">{recipe.food.description}</p>
                <div className="recipe-promo-card">
                  <span className="recipe-promo-service">{recipe.food.icon} {recipe.food.service}</span>
                  <div className="recipe-promo-code-row">
                    <span className="recipe-promo-label">Промокод на первый заказ:</span>
                    <div className="recipe-promo-chip">
                      <strong>{recipe.food.promo}</strong>
                      <button
                        className="recipe-copy-btn"
                        onClick={() => copyPromo(recipe.food.promo)}
                      >
                        {copied === recipe.food.promo ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                  <p className="recipe-promo-hint">Закажи сейчас — доставят как раз к началу фильма!</p>
                </div>
              </div>
            )}

            {/* Атмосфера */}
            {tab === 'atmosphere' && (
              <div className="recipe-section">
                <div className="recipe-section-icon">🕯️</div>
                <h2>Создай атмосферу</h2>
                <p className="recipe-section-sub">Маленькие детали делают вечер незабываемым</p>
                <div className="recipe-atmosphere-list">
                  {recipe.atmosphere.map((tip, i) => (
                    <div key={i} className="recipe-atmosphere-card">
                      <span className="recipe-atmosphere-icon">{['💡', '🕯️', '📵'][i % 3]}</span>
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
                <div className="recipe-ready-card">
                  <h3>Готов к просмотру? ✅</h3>
                  <div className="recipe-checklist">
                    <label><input type="checkbox" /> Плейлист включён</label>
                    <label><input type="checkbox" /> Коктейль готов</label>
                    <label><input type="checkbox" /> Еда заказана</label>
                    <label><input type="checkbox" /> Телефон на беззвучном</label>
                    <label><input type="checkbox" /> Свет настроен</label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EveningRecipePage;
