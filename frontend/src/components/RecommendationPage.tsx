import React, { useEffect, useState } from 'react';
import { apiService, Movie } from '../api/api';
import './RecommendationPage.css';

interface RecommendationPageProps {
  userGenres: string[];
  roomId: string;
  userId: string;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

const GENRE_MAP: Record<string, string[]> = {
  'action': ['боевик', 'экшн', 'action'],
  'comedy': ['комедия', 'comedy'],
  'drama': ['драма', 'drama'],
  'horror': ['ужасы', 'horror'],
  'thriller': ['триллер', 'thriller'],
  'romance': ['романтика', 'romance', 'мелодрама'],
  'sci-fi': ['фантастика', 'sci-fi', 'научная фантастика'],
  'fantasy': ['фэнтези', 'fantasy'],
  'adventure': ['приключения', 'adventure'],
  'crime': ['криминал', 'crime'],
  'mystery': ['детектив', 'mystery', 'детективный'],
  'animation': ['анимация', 'мультфильм', 'animation'],
  'documentary': ['документалистика', 'документальный', 'documentary'],
  'family': ['семейное', 'семейный', 'family'],
  'war': ['военное', 'военный', 'war'],
};

export const RecommendationPage: React.FC<RecommendationPageProps> = ({
  userGenres,
  roomId,
  userId,
  onClose,
  onSelectMovie,
}) => {
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [userSwipes, setUserSwipes] = useState<Set<string>>(new Set()); // ID фильмов, которые пользователь уже свайпнул

  useEffect(() => {
    if (userId && roomId) {
      loadUserSwipes().then(() => {
        loadRecommendations();
      });
    }
  }, [userGenres, roomId, userId]);

  const loadUserSwipes = async () => {
    try {
      const swipes = await apiService.getUserSwipes(roomId);
      // Создаем Set из ID фильмов, которые пользователь уже свайпнул
      const swipedMovieIds = new Set(swipes.map(swipe => swipe.movie_id));
      setUserSwipes(swipedMovieIds);
      return swipedMovieIds;
    } catch (err) {
      console.error('Error loading user swipes:', err);
      setUserSwipes(new Set());
      return new Set<string>();
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // Сначала загружаем свайпы пользователя
      const swipedIds = await loadUserSwipes();
      
      // Получаем ВСЕ фильмы из библиотеки
      let allMovies: Movie[] = [];
      try {
        allMovies = await apiService.getAllMovies();
      } catch (err) {
        console.error('Error loading all movies:', err);
        allMovies = [];
      }
      if (!Array.isArray(allMovies)) allMovies = [];

      // Если фильмов нет, возвращаем пустой список
      if (allMovies.length === 0) {
        setRecommendedMovies([]);
        setLoading(false);
        return;
      }

      // Убираем дубликаты по ID (более надежный способ)
      const movieMap = new Map<string, Movie>();
      allMovies.forEach(movie => {
        if (!movieMap.has(movie.id)) {
          movieMap.set(movie.id, movie);
        }
      });
      const uniqueMovies = Array.from(movieMap.values());

      // Фильтруем: исключаем уже свайпнутые фильмы
      const notSwipedMovies = uniqueMovies.filter(movie => 
        !swipedIds.has(movie.id)
      );

      // Фильтруем по жанрам пользователя
      const filteredByGenre = notSwipedMovies.filter(movie => {
        if (!movie.genre || (userGenres || []).length === 0) return false;
        
        try {
          let movieGenres: any = movie.genre;
          if (typeof movie.genre === 'string') {
            try {
              movieGenres = JSON.parse(movie.genre);
            } catch {
              movieGenres = movie.genre.split(',').map((g: string) => g.trim());
            }
          }
          
          const movieGenresArray = Array.isArray(movieGenres) 
            ? movieGenres.map((g: any) => String(g).toLowerCase())
            : [String(movieGenres).toLowerCase()];
          
          // Проверяем совпадение жанров
          return userGenres.some(userGenre => {
            const genreKeywords = GENRE_MAP[userGenre] || [userGenre];
            return movieGenresArray.some((mg: string) => 
              genreKeywords.some(keyword => mg.includes(keyword.toLowerCase()))
            );
          });
        } catch {
          return false;
        }
      });
      
      // Сортируем по рейтингу (сначала КП, потом IMDb) и берем топ-5
      const sorted = filteredByGenre
        .sort((a, b) => {
          const ratingA = a.kp_rating || a.imdb_rating || 0;
          const ratingB = b.kp_rating || b.imdb_rating || 0;
          return ratingB - ratingA;
        })
        .slice(0, 5);
      
      setRecommendedMovies(sorted);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const getStreamingLinks = (movie: Movie) => {
    // Пытаемся найти фильм по названию для Кинопоиска
    const searchQuery = encodeURIComponent(movie.title);
    const links = [
      {
        platform: 'kinopoisk',
        name: 'Кинопоиск',
        icon: '🎬',
        url: `https://www.kinopoisk.ru/index.php?kp_query=${searchQuery}`,
      },
      {
        platform: 'start',
        name: 'Старт',
        icon: '⭐',
        url: `https://start.ru/search?q=${searchQuery}`,
      },
      {
        platform: 'okko',
        name: 'Окко',
        icon: '🎥',
        url: `https://okko.tv/search?q=${searchQuery}`,
      },
      {
        platform: 'ivi',
        name: 'Иви',
        icon: '📺',
        url: `https://www.ivi.ru/search/?q=${searchQuery}`,
      },
    ];
    return links;
  };

  return (
    <div className="recommendation-page">
      <div className="recommendation-content">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="recommendation-header">
          <h2>🎯 Рекомендации для вас</h2>
          <p>Фильмы на основе ваших предпочтений по жанрам</p>
          {(userGenres || []).length > 0 && (
            <div className="selected-genres">
              {(userGenres || []).map(genre => (
                <span key={genre} className="genre-badge">
                  {GENRE_MAP[genre]?.[0] || genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">Загрузка рекомендаций...</div>
        ) : (recommendedMovies || []).length === 0 ? (
          <div className="no-recommendations">
            <p>К сожалению, не найдено фильмов по вашим предпочтениям.</p>
            <button onClick={onClose} className="primary-button">
              Вернуться к свайпам
            </button>
          </div>
        ) : (
          <div className="recommendations-grid">
            {(recommendedMovies || []).map((movie) => (
              <div 
                key={movie.id} 
                className={`recommendation-card ${selectedMovie?.id === movie.id ? 'selected' : ''}`}
                onClick={() => handleMovieSelect(movie)}
              >
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="recommendation-poster"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://via.placeholder.com/200x300?text=${encodeURIComponent(movie.title)}`;
                  }}
                />
                <div className="recommendation-info">
                  <h3>{movie.title}</h3>
                  {movie.year && <p className="movie-year">📅 {movie.year}</p>}
                  {movie.kp_rating && (
                    <div className="movie-rating">
                      <span>Кинопоиск: {movie.kp_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedMovie && (
          <div className="streaming-links-section">
            <h3>Где посмотреть "{selectedMovie.title}":</h3>
            <div className="streaming-links">
              {getStreamingLinks(selectedMovie).map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="streaming-link"
                >
                  <span className="link-icon">{link.icon}</span>
                  <span className="link-name">{link.name}</span>
                </a>
              ))}
            </div>
            <div className="recommendation-actions">
              <button 
                onClick={() => {
                  onSelectMovie(selectedMovie);
                  onClose();
                }} 
                className="primary-button"
              >
                ✅ Выбрать этот фильм
              </button>
              <button 
                onClick={onClose} 
                className="secondary-button"
              >
                Продолжить просмотр
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
