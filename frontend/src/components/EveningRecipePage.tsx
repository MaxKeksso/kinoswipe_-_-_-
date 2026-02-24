import React, { useState } from 'react';
import './EveningRecipePage.css';

interface Movie {
  id: string;
  title: string;
  emoji: string;
  genre: string;
  year: number;
  duration: string;
  setting: string;
  mood: string;
  country: string;
  travelCity?: string;
}

interface Recipe {
  playlist: { name: string; tracks: string[]; link: string; icon: string };
  cocktail: { name: string; ingredients: string[]; steps: string[] };
  food: { name: string; description: string; promo: string; service: string; icon: string };
  aviasales?: { city: string; reason: string; price: string };
  atmosphere: string[];
}

const MOVIES: Movie[] = [
  { id: '1', title: 'Великий Гэтсби', emoji: '🥂', genre: 'Драма', year: 2013, duration: '2ч 23м', setting: '1920-е, США', mood: 'Роскошь и меланхолия', country: 'Нью-Йорк', travelCity: 'Нью-Йорк' },
  { id: '2', title: 'Амели', emoji: '🌸', genre: 'Романтика', year: 2001, duration: '2ч 2м', setting: 'Париж', mood: 'Нежность и мечта', country: 'Франция', travelCity: 'Париж' },
  { id: '3', title: 'Интерстеллар', emoji: '🚀', genre: 'Фантастика', year: 2014, duration: '2ч 49м', setting: 'Космос', mood: 'Эпос и тоска', country: 'Космос' },
  { id: '4', title: 'Паразиты', emoji: '🏠', genre: 'Триллер', year: 2019, duration: '2ч 12м', setting: 'Сеул', mood: 'Напряжение', country: 'Корея', travelCity: 'Сеул' },
  { id: '5', title: 'Ла-Ла Ленд', emoji: '🌆', genre: 'Мюзикл', year: 2016, duration: '2ч 8м', setting: 'Лос-Анджелес', mood: 'Мечты и грусть', country: 'Лос-Анджелес', travelCity: 'Лос-Анджелес' },
  { id: '6', title: 'Форрест Гамп', emoji: '🍫', genre: 'Драма', year: 1994, duration: '2ч 22м', setting: '1960-80е, США', mood: 'Ностальгия и тепло', country: 'США' },
  { id: '7', title: 'Матрица', emoji: '💊', genre: 'Боевик', year: 1999, duration: '2ч 16м', setting: 'Киберпанк', mood: 'Адреналин и паранойя', country: 'Мегаполис' },
  { id: '8', title: 'Звёздные войны', emoji: '⚔️', genre: 'Фантастика', year: 1977, duration: '2ч 1м', setting: 'Космическая опера', mood: 'Приключение', country: 'Галактика' },
];

const RECIPES: Record<string, Recipe> = {
  '1': {
    playlist: { name: 'Jazz of the Roaring 20s', tracks: ['Rhapsody in Blue — Gershwin', 'Ain\'t Misbehavin\' — Fats Waller', 'Let\'s Misbehave — Cole Porter'], link: '#vk-music', icon: '🎷' },
    cocktail: { name: 'Gatsby Sidecar', ingredients: ['60 мл коньяка', '30 мл Cointreau', '30 мл лимонного сока', 'Сахарная кромка'], steps: ['Охладить бокал с сахарной кромкой', 'Смешать ингредиенты со льдом в шейкере', 'Процедить в бокал', 'Украсить долькой лимона'] },
    food: { name: 'Устрицы и канапе', description: 'Лёгкие закуски в стиле 20-х: мини-сэндвичи, оливки, канапе с икрой', promo: 'GATSBY10', service: 'Яндекс Еда', icon: '🦪' },
    aviasales: { city: 'Нью-Йорк', reason: 'Прогуляйтесь по Манхэттену — там жил Гэтсби', price: 'от 45 000 ₽' },
    atmosphere: ['Приглуши свет, включи настольную лампу', 'Добавь свечи на стол', 'Накрой стол как на вечеринку — красивые бокалы обязательны'],
  },
  '2': {
    playlist: { name: 'Café de Paris', tracks: ['La Valse d\'Amélie — Yann Tiersen', 'Le Moulin — Yann Tiersen', 'Comptine d\'un autre été'], link: '#vk-music', icon: '🎹' },
    cocktail: { name: 'Французский 75', ingredients: ['30 мл джина', '15 мл лимонного сока', '10 мл сахарного сиропа', 'Шампанское'], steps: ['Смешать джин, лимон и сироп со льдом', 'Процедить в флюте', 'Долить шампанским', 'Украсить цедрой лимона'] },
    food: { name: 'Круассаны и сыр', description: 'Французский вечер: круассаны, камамбер, виноград, багет', promo: 'AMELIE15', service: 'Delivery Club', icon: '🥐' },
    aviasales: { city: 'Париж', reason: 'Пройдитесь по Монмартру — именно там живёт Амели', price: 'от 28 000 ₽' },
    atmosphere: ['Поставь маленький цветок в вазу', 'Открой окно — пусть будет немного свежего воздуха', 'Выключи телефон на 2 часа — только вы и фильм'],
  },
  '3': {
    playlist: { name: 'Hans Zimmer: Interstellar OST', tracks: ['Cornfield Chase', 'Stay', 'Do Not Go Gentle Into That Good Night'], link: '#vk-music', icon: '🎻' },
    cocktail: { name: 'Космический Неграони', ingredients: ['30 мл джина', '30 мл Campari', '30 мл сладкого вермута', 'Апельсин'], steps: ['Смешать всё со льдом в стакане', 'Помешать ложкой 30 сек', 'Украсить долькой апельсина'] },
    food: { name: 'Пицца и попкорн', description: 'Длинный фильм — нужна еда. Закажи большую пиццу и лавандовый попкорн', promo: 'SPACE20', service: 'Яндекс Еда', icon: '🍕' },
    atmosphere: ['Выключи все источники света', 'Накрой окна — максимальная темнота', 'Фильм лучше смотреть на большом экране с хорошим звуком'],
  },
  '4': {
    playlist: { name: 'K-Drama Chill', tracks: ['Bts — Spring Day', 'IU — Blueming', 'Epik High — Born Hater'], link: '#vk-music', icon: '🎤' },
    cocktail: { name: 'Соджу Слаш', ingredients: ['50 мл соджу (или водки)', '100 мл персикового сока', 'Лёд', 'Mint'], steps: ['Заполнить стакан льдом', 'Налить соджу и сок', 'Перемешать', 'Украсить мятой'] },
    food: { name: 'Чикен и рамен', description: 'Корейская кухня: заказать острую курицу или рамен с яйцом', promo: 'KOREA10', service: 'Delivery Club', icon: '🍜' },
    aviasales: { city: 'Сеул', reason: 'Увидеть богатые районы Ганнама и бедные трущобы — контраст как в фильме', price: 'от 35 000 ₽' },
    atmosphere: ['Фильм очень напряжённый — готовь плед', 'Не читай спойлеры', 'Можно посмотреть с кем-то — реакции будут смешнее'],
  },
  '5': {
    playlist: { name: 'La La Land OST', tracks: ['City of Stars', 'Another Day of Sun', 'Mia & Sebastian\'s Theme'], link: '#vk-music', icon: '🎺' },
    cocktail: { name: 'Sunset Boulevard', ingredients: ['45 мл текилы', '60 мл апельсинового сока', '15 мл гренадина', 'Лёд'], steps: ['Наполнить стакан льдом', 'Налить сок и текилу', 'Аккуратно добавить гренадин', 'Не мешать — это даст красивый закат'] },
    food: { name: 'Тапас и брускетта', description: 'Лёгкий ужин под джаз: брускетта с томатами, авокадо-тост, капрезе', promo: 'LALA20', service: 'Яндекс Еда', icon: '🥑' },
    aviasales: { city: 'Лос-Анджелес', reason: 'Пройдитесь по Голливуд-Бульвару и увидьте звёзды мечтателей', price: 'от 52 000 ₽' },
    atmosphere: ['Одеться нарядно — даже если дома', 'Включи фильм на час позже заката', 'Потанцуйте под City of Stars перед началом'],
  },
  '6': {
    playlist: { name: '60s-80s Classics', tracks: ['Elvis — Suspicious Minds', 'Bob Dylan — Like a Rolling Stone', 'The Beatles — Let It Be'], link: '#vk-music', icon: '🎸' },
    cocktail: { name: 'Шоколадная Мечта', ingredients: ['30 мл шоколадного ликёра', '30 мл сливок', '15 мл ирландского виски', 'Тёртый шоколад'], steps: ['Смешать ликёр и виски', 'Добавить сливки', 'Украсить тёртым шоколадом сверху'] },
    food: { name: 'Коробка шоколадных конфет', description: '"Жизнь как коробка конфет" — заказать ассорти шоколада и мороженого', promo: 'FORREST15', service: 'Самокат', icon: '🍫' },
    atmosphere: ['Позвони бабушке до начала фильма', 'Приготовь носовые платки — фильм очень трогательный', 'Выключи уведомления телефона'],
  },
  '7': {
    playlist: { name: 'Matrix / Cyberpunk', tracks: ['Rob Zombie — Dragula', 'Marilyn Manson — Rock is Dead', 'Rage Against the Machine — Wake Up'], link: '#vk-music', icon: '💿' },
    cocktail: { name: 'Красная Таблетка', ingredients: ['30 мл водки', '60 мл томатного сока', '5 мл Табаско', 'Лёд', 'Соль/перец'], steps: ['Смешать всё в шейкере', 'Хорошо встряхнуть', 'Процедить в стакан со льдом', 'Украсить стеблем сельдерея'] },
    food: { name: 'Бургер и чипсы', description: 'Максимально крутой бургер с беконом и картошкой фри', promo: 'MATRIX25', service: 'Delivery Club', icon: '🍔' },
    atmosphere: ['Приглуши свет до минимума', 'Хорошая звуковая система — обязательна', 'Можно надеть чёрное, войти в образ'],
  },
  '8': {
    playlist: { name: 'John Williams — Star Wars', tracks: ['Main Theme', 'The Imperial March', 'Duel of the Fates'], link: '#vk-music', icon: '🎻' },
    cocktail: { name: 'Синий Молок', ingredients: ['60 мл молока', '20 мл черничного сиропа', '10 мл мятного сиропа', 'Лёд'], steps: ['Смешать сиропы', 'Добавить молоко', 'Хорошо перемешать до синего цвета'] },
    food: { name: 'Ролы и поке', description: 'Межгалактическая кухня: заказать суши-ролы или боул с лососем', promo: 'JEDI10', service: 'Яндекс Еда', icon: '🍱' },
    atmosphere: ['Выключи все огни, включи гирлянды', 'Сагу лучше смотреть с самого начала — эпизод 4', 'Скажи "Да пребудет с тобой сила" перед стартом'],
  },
};

const EveningRecipePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [tab, setTab] = useState<'select' | 'playlist' | 'cocktail' | 'food' | 'travel' | 'atmosphere'>('select');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setGenerating(true);
    setRecipe(null);
    setTimeout(() => {
      setRecipe(RECIPES[movie.id] || RECIPES['3']);
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
    ...(selectedMovie?.travelCity ? [{ id: 'travel', label: 'Поехать', icon: '✈️' }] : []),
    { id: 'atmosphere', label: 'Атмосфера', icon: '🕯️' },
  ] as { id: typeof tab; label: string; icon: string }[];

  return (
    <div className="recipe-page">
      <div className="recipe-header">
        <button className="recipe-back-btn" onClick={onBack}>← Назад</button>
        <div className="recipe-header-title">
          <h1>🌆 Рецепт Вечера</h1>
          <p>Планируем идеальный вечер под фильм</p>
        </div>
        {selectedMovie && (
          <button
            className="recipe-change-btn"
            onClick={() => { setSelectedMovie(null); setRecipe(null); setTab('select'); }}
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
                <p>AI составит плейлист, рецепт коктейля, закажет еду и предложит путешествие</p>
              </div>
              <div className="recipe-movies-grid">
                {MOVIES.map(movie => (
                  <div key={movie.id} className="recipe-movie-card" onClick={() => handleSelectMovie(movie)}>
                    <span className="recipe-movie-emoji">{movie.emoji}</span>
                    <div className="recipe-movie-info">
                      <strong>{movie.title}</strong>
                      <span>{movie.genre} · {movie.year}</span>
                      <span className="recipe-movie-mood">{movie.mood}</span>
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
              <p>Для «{selectedMovie?.title}»</p>
              <div className="recipe-gen-steps">
                <span>🎵 Подбираем плейлист</span>
                <span>🍹 Придумываем коктейль</span>
                <span>🍕 Выбираем еду</span>
                {selectedMovie?.travelCity && <span>✈️ Ищем рейсы в {selectedMovie.travelCity}</span>}
              </div>
              <div className="recipe-gen-bar"><div className="recipe-gen-fill" /></div>
            </div>
          )}
        </div>
      )}

      {/* Результат */}
      {recipe && selectedMovie && tab !== 'select' && (
        <>
          {/* Шапка с фильмом */}
          <div className="recipe-film-banner">
            <span className="recipe-film-emoji">{selectedMovie.emoji}</span>
            <div>
              <strong>{selectedMovie.title}</strong>
              <span>{selectedMovie.setting} · {selectedMovie.duration}</span>
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

            {/* Путешествие */}
            {tab === 'travel' && selectedMovie.travelCity && recipe.aviasales && (
              <div className="recipe-section">
                <div className="recipe-section-icon">✈️</div>
                <h2>Полетели в {recipe.aviasales.city}?</h2>
                <p className="recipe-section-sub">{recipe.aviasales.reason}</p>
                <div className="recipe-travel-card">
                  <div className="recipe-travel-price">
                    <span className="recipe-travel-from">Билеты</span>
                    <span className="recipe-travel-amount">{recipe.aviasales.price}</span>
                    <span className="recipe-travel-rt">в оба конца</span>
                  </div>
                  <button
                    className="recipe-action-btn aviasales"
                    onClick={() => window.open(`https://www.aviasales.ru/search/MOW${recipe.aviasales?.city?.substring(0,3).toUpperCase() || 'NYC'}`, '_blank')}
                  >
                    🛫 Найти билеты на Aviasales →
                  </button>
                </div>
                <div className="recipe-travel-tips">
                  <h3>Что посмотреть в {recipe.aviasales.city}:</h3>
                  <p>Места, вдохновлённые фильмом «{selectedMovie.title}» — лучший способ продолжить впечатления после просмотра.</p>
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
