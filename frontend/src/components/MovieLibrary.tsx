import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService, Movie } from '../api/api';
import { getMovieDisplayTitle } from '../utils/movieRussian';
import { MovieDetails } from './MovieDetails';
import './MovieLibrary.css';

const LAZY_PAGE_SIZE = 40;

interface MovieLibraryProps {
  onClose: () => void;
  isAdmin?: boolean;
}

export const MovieLibrary: React.FC<MovieLibraryProps> = ({ onClose, isAdmin = false }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(LAZY_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMovies();
  }, []);

  // Lazy loading: подгружаем следующую порцию при появлении sentinel в зоне видимости
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + LAZY_PAGE_SIZE);
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const loadMovies = async () => {
    try {
      setLoading(true);
      // Получаем все фильмы с большим лимитом
      const allMovies = await apiService.getAllMovies();
      console.log('Loaded movies from API:', allMovies?.length || 0, allMovies);
      setMovies(allMovies || []);
      if (!allMovies || allMovies.length === 0) {
        console.warn('No movies found in database. Make sure movies are added via admin panel or scripts.');
      }
    } catch (err) {
      console.error('Error loading movies:', err);
      setMovies([]);
    } finally {
      setLoading(false);
      setVisibleCount(LAZY_PAGE_SIZE);
    }
  };

  const filteredMovies = movies.filter(movie => {
    const displayTitle = getMovieDisplayTitle(movie);
    return displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movie.title && movie.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (movie.title_en && movie.title_en.toLowerCase().includes(searchQuery.toLowerCase()));
  });
  const visibleMovies = filteredMovies.slice(0, visibleCount);
  const hasMore = visibleMovies.length < filteredMovies.length;
  const resetVisibleCount = useCallback(() => setVisibleCount(LAZY_PAGE_SIZE), []);
  useEffect(() => {
    resetVisibleCount();
  }, [searchQuery, resetVisibleCount]);

  return (
    <div className="movie-library-page">
      <div className="movie-library-content">
        <div className="library-header">
          <h2>🎬 Библиотека фильмов</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="library-search">
          <input
            type="text"
            placeholder="Поиск фильма..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="movies-count">Всего: {movies.length}</span>
        </div>

        {loading ? (
          <div className="loading">Загрузка фильмов...</div>
        ) : filteredMovies.length === 0 ? (
          <div className="no-movies">
            <p><strong>Фильмы не найдены</strong></p>
            {movies.length === 0 ? (
              <p className="no-movies-hint">
                В базе пока нет фильмов — из-за этого нельзя свайпить и сделать мэтч. Загрузите их: в терминале из корня проекта выполните <code>./импорт_csv.sh</code> (скрипт скачает IMDB Top 1000 и импортирует в БД). После этого здесь появятся фильмы и они будут в подборке для комнаты.
              </p>
            ) : (
              <p>По вашему запросу ничего не найдено. Измените поиск.</p>
            )}
          </div>
        ) : (
          <>
            <div className="movies-grid">
              {visibleMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="movie-library-card"
                  onClick={() => setSelectedMovie(movie)}
                >
                  <img
                    src={movie.comic_poster_url || movie.poster_url}
                  alt={getMovieDisplayTitle(movie)}
                  className="movie-library-poster"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (movie.comic_poster_url && target.src === movie.comic_poster_url) {
                      target.src = movie.poster_url;
                    }
                  }}
                />
                <div className="movie-library-info">
                  <h4>{getMovieDisplayTitle(movie)}</h4>
                    {movie.year && <p className="movie-year">📅 {movie.year}</p>}
                    {movie.kp_rating && (
                      <p className="movie-rating">⭐ {movie.kp_rating.toFixed(1)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && <div ref={sentinelRef} className="lazy-sentinel" style={{ height: 20, gridColumn: '1 / -1' }} />}
            {hasMore && <p className="lazy-hint">Показано {visibleMovies.length} из {filteredMovies.length}</p>}
          </>
        )}
      </div>

      {selectedMovie && (
        <MovieDetails
          movie={selectedMovie}
          isAdmin={isAdmin}
          onClose={() => {
            setSelectedMovie(null);
            loadMovies(); // Перезагружаем фильмы после редактирования
          }}
        />
      )}
    </div>
  );
};
