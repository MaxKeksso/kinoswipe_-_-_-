import React, { useState } from 'react';
import { apiService, Movie } from '../api/api';
import { getMovieDisplayTitle, translateGenres } from '../utils/movieRussian';
import './MovieDetails.css';

interface MovieDetailsProps {
  movie: Movie;
  isAdmin?: boolean;
  onClose: () => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({ movie, isAdmin = false, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editedMovie, setEditedMovie] = useState<Partial<Movie>>({
    title: movie.title,
    title_en: movie.title_en,
    description: movie.description,
    year: movie.year,
    duration: movie.duration,
    kp_rating: movie.kp_rating,
    imdb_rating: movie.imdb_rating,
    poster_url: movie.poster_url,
    trailer_url: movie.trailer_url,
  });

  const handleSave = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError('');
    
    try {
      await apiService.updateMovie(movie.id, editedMovie);
      setIsEditing(false);
      onClose(); // Закрываем и перезагружаем список
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const parseGenres = (genre: string | string[]): string[] => {
    if (Array.isArray(genre)) return genre;
    try {
      return JSON.parse(genre);
    } catch {
      return genre.split(',').map(g => g.trim());
    }
  };

  const genres = translateGenres(parseGenres(movie.genre || []));

  return (
    <div className="movie-details-overlay" onClick={onClose}>
      <div className="movie-details-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="movie-details-header">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="movie-details-poster"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`;
            }}
          />
          <div className="movie-details-info">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editedMovie.title || ''}
                  onChange={(e) => setEditedMovie({ ...editedMovie, title: e.target.value })}
                  className="edit-input"
                  placeholder="Название"
                />
                <input
                  type="text"
                  value={editedMovie.title_en || ''}
                  onChange={(e) => setEditedMovie({ ...editedMovie, title_en: e.target.value })}
                  className="edit-input"
                  placeholder="Название (англ.)"
                />
                <div className="edit-row">
                  <input
                    type="number"
                    value={editedMovie.year || ''}
                    onChange={(e) => setEditedMovie({ ...editedMovie, year: parseInt(e.target.value) || undefined })}
                    className="edit-input-small"
                    placeholder="Год"
                  />
                  <input
                    type="number"
                    value={editedMovie.duration || ''}
                    onChange={(e) => setEditedMovie({ ...editedMovie, duration: parseInt(e.target.value) || undefined })}
                    className="edit-input-small"
                    placeholder="Длительность (мин)"
                  />
                </div>
                <div className="edit-row">
                  <input
                    type="number"
                    step="0.1"
                    value={editedMovie.kp_rating || ''}
                    onChange={(e) => setEditedMovie({ ...editedMovie, kp_rating: parseFloat(e.target.value) || undefined })}
                    className="edit-input-small"
                    placeholder="Рейтинг КП"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={editedMovie.imdb_rating || ''}
                    onChange={(e) => setEditedMovie({ ...editedMovie, imdb_rating: parseFloat(e.target.value) || undefined })}
                    className="edit-input-small"
                    placeholder="Рейтинг IMDb"
                  />
                </div>
                <input
                  type="url"
                  value={editedMovie.poster_url || ''}
                  onChange={(e) => setEditedMovie({ ...editedMovie, poster_url: e.target.value })}
                  className="edit-input"
                  placeholder="URL постера"
                />
                <input
                  type="url"
                  value={editedMovie.trailer_url || ''}
                  onChange={(e) => setEditedMovie({ ...editedMovie, trailer_url: e.target.value })}
                  className="edit-input"
                  placeholder="URL трейлера"
                />
                <textarea
                  value={editedMovie.description || ''}
                  onChange={(e) => setEditedMovie({ ...editedMovie, description: e.target.value })}
                  className="edit-textarea"
                  placeholder="Описание"
                  rows={6}
                />
              </>
            ) : (
              <>
                <h2>{getMovieDisplayTitle(movie)}</h2>
                {movie.title_en && movie.title !== movie.title_en && (
                  <p className="movie-title-en">{movie.title_en}</p>
                )}
                <div className="movie-meta">
                  {movie.year && <span>📅 {movie.year} год</span>}
                  {movie.duration && <span>⏱ {movie.duration} мин</span>}
                </div>
                <div className="movie-ratings">
                  {movie.kp_rating && (
                    <div className="rating">
                      <span className="rating-label">Кинопоиск:</span>
                      <span className="rating-value">{movie.kp_rating.toFixed(1)}</span>
                    </div>
                  )}
                  {movie.imdb_rating && (
                    <div className="rating">
                      <span className="rating-label">IMDb:</span>
                      <span className="rating-value">{movie.imdb_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {genres.length > 0 && (
                  <div className="movie-genres">
                    {genres.map((g, index) => (
                      <span key={index} className="genre-tag">{g}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isEditing && movie.description && (
          <div className="movie-description-section">
            <h3>Описание</h3>
            <p>{movie.description}</p>
          </div>
        )}

        {movie.trailer_url && !isEditing && (
          <div className="movie-trailer">
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="trailer-link"
            >
              🎬 Смотреть трейлер
            </a>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="movie-details-actions">
          {isAdmin && (
            <>
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={loading} className="primary-button">
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setEditedMovie({
                      title: movie.title,
                      title_en: movie.title_en,
                      description: movie.description,
                      year: movie.year,
                      duration: movie.duration,
                      kp_rating: movie.kp_rating,
                      imdb_rating: movie.imdb_rating,
                      poster_url: movie.poster_url,
                      trailer_url: movie.trailer_url,
                    });
                  }} className="secondary-button">
                    Отмена
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="primary-button">
                  ✏️ Редактировать
                </button>
              )}
            </>
          )}
          <button onClick={onClose} className="secondary-button">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
