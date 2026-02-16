/**
 * Перевод информации о фильмах на русский: жанры, приоритет названия.
 */

/** Соответствие английских (и др.) названий жанров русским */
const GENRE_TO_RUSSIAN: Record<string, string> = {
  action: 'Боевик',
  adventure: 'Приключения',
  animation: 'Анимация',
  anime: 'Аниме',
  biography: 'Биография',
  comedy: 'Комедия',
  crime: 'Криминал',
  documentary: 'Документалистика',
  drama: 'Драма',
  family: 'Семейное',
  fantasy: 'Фэнтези',
  'sci-fi': 'Фантастика',
  scifi: 'Фантастика',
  'science fiction': 'Фантастика',
  history: 'История',
  horror: 'Ужасы',
  mystery: 'Детектив',
  romance: 'Романтика',
  melodrama: 'Мелодрама',
  thriller: 'Триллер',
  war: 'Военное',
  western: 'Вестерн',
  musical: 'Мюзикл',
  sport: 'Спорт',
  short: 'Короткометражка',
  // Русские — с заглавной
  боевик: 'Боевик',
  приключения: 'Приключения',
  анимация: 'Анимация',
  комедия: 'Комедия',
  криминал: 'Криминал',
  документалистика: 'Документалистика',
  драма: 'Драма',
  семейное: 'Семейное',
  фэнтези: 'Фэнтези',
  фантастика: 'Фантастика',
  история: 'История',
  ужасы: 'Ужасы',
  детектив: 'Детектив',
  романтика: 'Романтика',
  мелодрама: 'Мелодрама',
  триллер: 'Триллер',
  военное: 'Военное',
};

/** Есть ли в строке кириллица */
function hasCyrillic(s: string): boolean {
  return /[а-яёА-ЯЁ]/.test(s);
}

/**
 * Возвращает жанр на русском для отображения.
 */
export function translateGenre(genre: string): string {
  if (!genre || typeof genre !== 'string') return genre;
  const trimmed = genre.trim().toLowerCase();
  if (!trimmed) return genre;
  const translated = GENRE_TO_RUSSIAN[trimmed];
  if (translated) return translated;
  if (hasCyrillic(genre)) return genre.trim();
  return genre.trim();
}

/**
 * Переводит массив жанров на русский (без дубликатов, сохраняя порядок).
 */
export function translateGenres(genres: string[] | string): string[] {
  const list = Array.isArray(genres)
    ? genres
    : (typeof genres === 'string' ? genres.split(',').map(g => g.trim()) : []);
  const seen = new Set<string>();
  return list
    .map(g => translateGenre(g))
    .filter(g => {
      if (seen.has(g)) return false;
      seen.add(g);
      return true;
    });
}

export interface MovieTitleLike {
  title?: string | null;
  title_en?: string | null;
}

/**
 * Возвращает название фильма для отображения: приоритет у русского (кириллица),
 * иначе английское или исходное.
 */
export function getMovieDisplayTitle(movie: MovieTitleLike): string {
  const title = (movie?.title || '').trim();
  const titleEn = (movie?.title_en || '').trim();
  if (title && hasCyrillic(title)) return title;
  if (titleEn && hasCyrillic(titleEn)) return titleEn;
  if (title) return title;
  if (titleEn) return titleEn;
  return 'Без названия';
}
