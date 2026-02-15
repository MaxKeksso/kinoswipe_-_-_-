import React, { useEffect, useState } from 'react';
import { apiService, Movie } from '../api/api';
import { MovieDetails } from './MovieDetails';
import './MovieLibrary.css';

interface MovieLibraryProps {
  onClose: () => void;
  isAdmin?: boolean;
}

export const MovieLibrary: React.FC<MovieLibraryProps> = ({ onClose, isAdmin = false }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMovies();
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
    }
  };

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (movie.title_en && movie.title_en.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          <div className="movies-grid">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="movie-library-card"
                onClick={() => setSelectedMovie(movie)}
              >
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="movie-library-poster"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://via.placeholder.com/200x300?text=${encodeURIComponent(movie.title)}`;
                  }}
                />
                <div className="movie-library-info">
                  <h4>{movie.title}</h4>
                  {movie.year && <p className="movie-year">📅 {movie.year}</p>}
                  {movie.kp_rating && (
                    <p className="movie-rating">⭐ {movie.kp_rating.toFixed(1)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
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
