import React, { useState, useEffect } from 'react';
import { apiService, Movie } from '../api/api';
import { getMovieDisplayTitle } from '../utils/movieRussian';

interface VibeCard {
  id: string;
  title: string;
  description: string;
  gradient: string;
  emoji: string;
  tags: string[];
  film: string;
  filmEmoji: string;
  filmGenre: string;
}

const VIBE_CARDS: VibeCard[] = [
  {
    id: '1',
    title: 'Дождь за окном',
    description: 'Серый вечер, горячий чай, плед и звук капель по стеклу. Хочется чего-то тихого и глубокого.',
    gradient: 'linear-gradient(135deg, #2c3e50, #4a6fa5)',
    emoji: '🌧️',
    tags: ['Уютно', 'Тихо', 'Глубоко'],
    film: 'Форрест Гамп',
    filmEmoji: '🏃',
    filmGenre: 'Драма • 1994',
  },
  {
    id: '2',
    title: 'Ночной город',
    description: 'Неоновые огни, пустые улицы, острые ощущения. Ты хочешь что-то дерзкое и захватывающее.',
    gradient: 'linear-gradient(135deg, #1a001e, #6d1a9c)',
    emoji: '🌃',
    tags: ['Дерзко', 'Энергично', 'Ночь'],
    film: 'Джокер',
    filmEmoji: '🃏',
    filmGenre: 'Триллер • 2019',
  },
  {
    id: '3',
    title: 'Космос внутри',
    description: 'Звёзды бесконечны. Ты думаешь о большом: о смысле, о времени, о своём месте во вселенной.',
    gradient: 'linear-gradient(135deg, #000428, #004e92)',
    emoji: '🌌',
    tags: ['Философски', 'Масштабно', 'Глубоко'],
    film: 'Интерстеллар',
    filmEmoji: '🚀',
    filmGenre: 'Фантастика • 2014',
  },
  {
    id: '4',
    title: 'Летнее утро',
    description: 'Солнце, кофе, хорошее настроение. Хочется лёгкого, смешного и немного безумного.',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    emoji: '☀️',
    tags: ['Весело', 'Легко', 'Позитивно'],
    film: 'Зеленая книга',
    filmEmoji: '🚗',
    filmGenre: 'Комедия/Драма • 2018',
  },
  {
    id: '5',
    title: 'Тёмный лес',
    description: 'Что-то хрустит в темноте. Адреналин, напряжение, сердце бьётся чуть быстрее обычного.',
    gradient: 'linear-gradient(135deg, #0d0d0d, #1a2a1a)',
    emoji: '🌲',
    tags: ['Страшно', 'Напряженно', 'Адреналин'],
    film: 'Паразиты',
    filmEmoji: '🏠',
    filmGenre: 'Триллер • 2019',
  },
  {
    id: '6',
    title: 'Ретро вечер',
    description: 'Кассеты, старые фото, тёплая ностальгия. Хочется чего-то классического и проверенного временем.',
    gradient: 'linear-gradient(135deg, #8B6914, #c49a2a)',
    emoji: '📼',
    tags: ['Ностальгия', 'Классика', 'Душевно'],
    film: 'Матрица',
    filmEmoji: '💊',
    filmGenre: 'Боевик/Фантастика • 1999',
  },
  {
    id: '7',
    title: 'Мозговой штурм',
    description: 'Голова работает на полную. Хочется загадок, головоломок и фильма, который заставит думать.',
    gradient: 'linear-gradient(135deg, #134e5e, #71b280)',
    emoji: '🧩',
    tags: ['Умно', 'Запутанно', 'Загадочно'],
    film: 'Начало',
    filmEmoji: '🌀',
    filmGenre: 'Триллер/Фантастика • 2010',
  },
  {
    id: '8',
    title: 'Боевой настрой',
    description: 'Энергия через край. Хочется экшена, скорости и мощного саундтрека на весь экран.',
    gradient: 'linear-gradient(135deg, #c0392b, #e74c3c)',
    emoji: '⚡',
    tags: ['Экшен', 'Мощно', 'Бодро'],
    film: 'Бойцовский клуб',
    filmEmoji: '👊',
    filmGenre: 'Боевик/Драма • 1999',
  },
];

// Maps each vibe card id to genre keywords (lowercase)
const VIBE_GENRE_MAP: Record<string, string[]> = {
  '1': ['drama', 'biography'],
  '2': ['crime', 'thriller', 'mystery'],
  '3': ['sci-fi', 'fantasy', 'adventure', 'science fiction'],
  '4': ['comedy', 'romance', 'animation'],
  '5': ['horror', 'thriller'],
  '6': ['history', 'western', 'war'],
  '7': ['mystery', 'crime'],
  '8': ['action', 'war', 'adventure'],
};

function getGenresFromMovie(movie: Movie): string[] {
  try {
    const parsed: string[] = JSON.parse(movie.genre);
    return parsed.map(g => g.toLowerCase());
  } catch {
    return [movie.genre.toLowerCase()];
  }
}

function findMatchingMovie(vibeId: string, dbMovies: Movie[]): Movie | null {
  const keywords = VIBE_GENRE_MAP[vibeId] || [];
  if (keywords.length === 0 || dbMovies.length === 0) return null;
  const matches = dbMovies.filter(movie => {
    const movieGenres = getGenresFromMovie(movie);
    return keywords.some(kw => movieGenres.some(mg => mg.includes(kw)));
  });
  if (matches.length === 0) return null;
  // Sort by imdb_rating descending
  matches.sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0));
  return matches[0];
}

const VibePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<'swipe' | 'result'>('swipe');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<VibeCard[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [skipped, setSkipped] = useState<VibeCard[]>([]);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [dbMovies, setDbMovies] = useState<Movie[]>([]);

  useEffect(() => {
    apiService.getAllMovies()
      .then(movies => setDbMovies(movies))
      .catch(() => setDbMovies([]));
  }, []);

  const current = VIBE_CARDS[currentIndex];
  const done = currentIndex >= VIBE_CARDS.length;

  const swipe = (direction: 'left' | 'right') => {
    setSwipeDir(direction);
    setTimeout(() => {
      if (direction === 'right') setLiked(l => [...l, current]);
      else setSkipped(s => [...s, current]);
      setCurrentIndex(i => i + 1);
      setSwipeDir(null);
    }, 300);
  };

  const reset = () => {
    setCurrentIndex(0);
    setLiked([]);
    setSkipped([]);
    setSwipeDir(null);
    setTab('swipe');
  };

  const bestMatch = liked.length > 0 ? liked[Math.floor(Math.random() * liked.length)] : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d0d, #1a0a2e, #0a1a1a)',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
          padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 14,
        }}>← Назад</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>✨ Свайп по Вайбу</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.6 }}>Выбирай настроение, получай фильм</p>
        </div>
        {(done || liked.length > 0) && (
          <button onClick={() => setTab(tab === 'swipe' ? 'result' : 'swipe')} style={{
            background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
            color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            {tab === 'swipe' ? '🎬 Результат' : '← Свайпать'}
          </button>
        )}
      </div>

      {tab === 'swipe' && (
        <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.6, marginBottom: 6 }}>
              <span>Карточка {Math.min(currentIndex + 1, VIBE_CARDS.length)} / {VIBE_CARDS.length}</span>
              <span>❤️ {liked.length} понравилось</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(currentIndex / VIBE_CARDS.length) * 100}%`,
                background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
                borderRadius: 10,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {!done ? (
            <>
              {/* Vibe Card */}
              <div style={{
                borderRadius: 24,
                overflow: 'hidden',
                marginBottom: 24,
                transform: swipeDir === 'left' ? 'translateX(-120%) rotate(-15deg)' : swipeDir === 'right' ? 'translateX(120%) rotate(15deg)' : 'none',
                transition: swipeDir ? 'transform 0.3s ease-in' : 'none',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}>
                <div style={{
                  background: current.gradient,
                  padding: '40px 28px 32px',
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>{current.emoji}</div>
                  <div>
                    <h2 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 800 }}>{current.title}</h2>
                    <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.6, opacity: 0.9 }}>{current.description}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {current.tags.map(t => (
                        <span key={t} style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          background: 'rgba(255,255,255,0.2)',
                          fontSize: 12,
                          fontWeight: 500,
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe buttons */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button onClick={() => swipe('left')} style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(255,59,48,0.15)',
                  border: '2px solid rgba(255,59,48,0.4)',
                  color: '#ff3b30',
                  fontSize: 24, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>✕</button>
                <button onClick={() => swipe('right')} style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(29,185,84,0.15)',
                  border: '2px solid rgba(29,185,84,0.4)',
                  color: '#1db954',
                  fontSize: 24, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>♥</button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, opacity: 0.4 }}>
                ✕ Не моё &nbsp;&nbsp;&nbsp; ♥ Мой вайб
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ margin: '0 0 8px' }}>Карточки закончились!</h2>
              <p style={{ opacity: 0.55, marginBottom: 24 }}>Понравилось {liked.length} из {VIBE_CARDS.length} вайбов</p>
              <button onClick={() => setTab('result')} style={{
                padding: '14px 32px',
                background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
                color: '#fff', border: 'none', borderRadius: 14,
                cursor: 'pointer', fontSize: 16, fontWeight: 700, width: '100%',
              }}>🎬 Смотреть подборку</button>
            </div>
          )}
        </div>
      )}

      {tab === 'result' && (
        <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
          {liked.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>😅</div>
              <h2 style={{ margin: '0 0 8px' }}>Ни один вайб не зашёл</h2>
              <p style={{ opacity: 0.55, marginBottom: 24 }}>Попробуем ещё раз?</p>
              <button onClick={reset} style={{
                padding: '14px 32px',
                background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
                color: '#fff', border: 'none', borderRadius: 14,
                cursor: 'pointer', fontSize: 16, fontWeight: 700, width: '100%',
              }}>🔄 Начать заново</button>
            </div>
          ) : (
            <>
              {/* Best match */}
              {bestMatch && (() => {
                const matchedMovie = findMatchingMovie(bestMatch.id, dbMovies);
                return (
                  <div style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    marginBottom: 20,
                    boxShadow: '0 8px 40px rgba(168,85,247,0.3)',
                  }}>
                    <div style={{
                      background: bestMatch.gradient,
                      padding: '28px 24px 20px',
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>{bestMatch.emoji}</div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>{bestMatch.title}</h3>
                      <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Ваш главный вайб вечера</p>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.08)',
                      padding: '16px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      {matchedMovie ? (
                        <>
                          {(matchedMovie.comic_poster_url || matchedMovie.poster_url) && (
                            <img
                              src={matchedMovie.comic_poster_url || matchedMovie.poster_url}
                              alt={getMovieDisplayTitle(matchedMovie)}
                              style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                            />
                          )}
                          <div>
                            <strong style={{ display: 'block', fontSize: 15 }}>{getMovieDisplayTitle(matchedMovie)}</strong>
                            {matchedMovie.imdb_rating && (
                              <span style={{ fontSize: 12, opacity: 0.6 }}>IMDb {matchedMovie.imdb_rating.toFixed(1)}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 28 }}>{bestMatch.filmEmoji}</span>
                          <div>
                            <strong style={{ display: 'block', fontSize: 15 }}>{bestMatch.film}</strong>
                            <span style={{ fontSize: 12, opacity: 0.6 }}>{bestMatch.filmGenre}</span>
                          </div>
                        </>
                      )}
                      <div style={{
                        marginLeft: 'auto',
                        padding: '6px 12px',
                        background: 'linear-gradient(90deg,#a855f7,#06b6d4)',
                        borderRadius: 20, fontSize: 12, fontWeight: 600,
                      }}>🎬 Смотреть</div>
                    </div>
                  </div>
                );
              })()}

              {/* Liked vibes */}
              {liked.length > 1 && (
                <>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15, opacity: 0.7 }}>Все совпавшие вайбы:</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {liked.map(v => {
                      const vibeMovie = findMatchingMovie(v.id, dbMovies);
                      return (
                        <div key={v.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}>
                          <span style={{ fontSize: 24 }}>{v.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: 14 }}>{v.title}</strong>
                            <div style={{ fontSize: 12, opacity: 0.55 }}>
                              {vibeMovie ? (
                                <>{v.filmEmoji} {getMovieDisplayTitle(vibeMovie)}</>
                              ) : (
                                <>{v.filmEmoji} {v.film}</>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {v.tags.slice(0, 2).map(t => (
                              <span key={t} style={{
                                padding: '2px 8px', borderRadius: 20,
                                background: 'rgba(168,85,247,0.2)',
                                fontSize: 11, color: '#c084fc',
                              }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <button onClick={reset} style={{
                width: '100%',
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none', borderRadius: 14,
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}>🔄 Свайпнуть заново</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VibePage;
