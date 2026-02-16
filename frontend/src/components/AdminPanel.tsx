import React, { useState, useEffect } from 'react';
import { apiService, Premiere } from '../api/api';
import { getMovieDisplayTitle } from '../utils/movieRussian';
import './AdminPanel.css';

interface AdminPanelProps {
  onLogout: () => void;
}

interface MovieForm {
  title: string;
  title_en: string;
  description: string;
  poster_url: string;
  year: number;
  duration: number;
  kp_rating: number;
  imdb_rating: number;
  genre: string;
  trailer_url: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'premieres' | 'movies' | 'links'>('premieres');
  const [premieres, setPremieres] = useState<Premiere[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Форма для премьеры
  const [premiereForm, setPremiereForm] = useState({
    title: '',
    description: '',
    poster_url: '',
    release_date: '',
    position: 'left' as 'left' | 'right',
    is_active: true,
  });

  // Форма для фильма
  const [movieForm, setMovieForm] = useState<MovieForm>({
    title: '',
    title_en: '',
    description: '',
    poster_url: '',
    year: new Date().getFullYear(),
    duration: 120,
    kp_rating: 0,
    imdb_rating: 0,
    genre: '',
    trailer_url: '',
  });

  useEffect(() => {
    loadPremieres();
  }, []);

  useEffect(() => {
    if (activeTab === 'movies') {
      loadMovies();
    }
  }, [activeTab]);

  const loadPremieres = async () => {
    try {
      const data = await apiService.getPremieres();
      setPremieres(data || []);
    } catch (err) {
      console.error('Error loading premieres:', err);
    }
  };

  const loadMovies = async () => {
    try {
      const data = await apiService.getAllMovies();
      setMovies(data || []);
    } catch (err) {
      console.error('Error loading movies:', err);
      setMovies([]);
    }
  };

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Валидация обязательных полей
    if (!movieForm.title.trim()) {
      setError('Название фильма обязательно');
      setLoading(false);
      return;
    }
    if (!movieForm.poster_url.trim()) {
      setError('URL постера обязателен');
      setLoading(false);
      return;
    }
    if (!movieForm.year || movieForm.year < 1900 || movieForm.year > new Date().getFullYear() + 1) {
      setError('Год должен быть корректным');
      setLoading(false);
      return;
    }
    if (!movieForm.duration || movieForm.duration < 1) {
      setError('Длительность должна быть больше 0');
      setLoading(false);
      return;
    }
    if (!movieForm.genre.trim()) {
      setError('Жанры обязательны');
      setLoading(false);
      return;
    }

    try {
      const genreArray = movieForm.genre.split(',').map(g => g.trim()).filter(g => g);
      if (genreArray.length === 0) {
        setError('Укажите хотя бы один жанр');
        setLoading(false);
        return;
      }
      
      // Формируем данные фильма в правильном формате для API
      const movieData: any = {
        title: movieForm.title.trim(),
        title_en: movieForm.title_en.trim() || undefined,
        description: movieForm.description.trim() || undefined,
        poster_url: movieForm.poster_url.trim(),
        year: movieForm.year,
        duration: movieForm.duration,
        kp_rating: movieForm.kp_rating > 0 ? movieForm.kp_rating : undefined,
        imdb_rating: movieForm.imdb_rating > 0 ? movieForm.imdb_rating : undefined,
        genre: JSON.stringify(genreArray),
        trailer_url: movieForm.trailer_url.trim() || undefined,
      };
      
      // Удаляем undefined поля
      Object.keys(movieData).forEach(key => {
        if (movieData[key] === undefined) {
          delete movieData[key];
        }
      });
      
      console.log('Creating movie with data:', movieData);
      const createdMovie = await apiService.createMovie(movieData);
      console.log('Movie created successfully:', createdMovie);
      
      // Показываем сообщение об успехе
      setSuccessMessage(`Фильм "${createdMovie.title}" успешно добавлен!`);
      setError('');
      
      // Сбрасываем форму
      setMovieForm({
        title: '',
        title_en: '',
        description: '',
        poster_url: '',
        year: new Date().getFullYear(),
        duration: 120,
        kp_rating: 0,
        imdb_rating: 0,
        genre: '',
        trailer_url: '',
      });
      
      // Перезагружаем список фильмов
      await loadMovies();
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Error creating movie:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Ошибка создания фильма';
      setError(`Ошибка: ${errorMessage}`);
      console.error('Full error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePremiere = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiService.createPremiere(premiereForm);
      setPremiereForm({
        title: '',
        description: '',
        poster_url: '',
        release_date: '',
        position: 'left',
        is_active: true,
      });
      await loadPremieres();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания премьеры');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePremiere = async (id: string) => {
    if (!window.confirm('Удалить премьеру?')) return;

    try {
      await apiService.deletePremiere(id);
      await loadPremieres();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления премьеры');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🔐 Админ-панель</h1>
        <button onClick={onLogout} className="secondary-button">Выйти</button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'premieres' ? 'active' : ''}`}
          onClick={() => setActiveTab('premieres')}
        >
          Премьеры
        </button>
        <button
          className={`admin-tab ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          Фильмы
        </button>
        <button
          className={`admin-tab ${activeTab === 'links' ? 'active' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          Ссылки для матчей
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message" style={{ color: 'green', padding: '10px', marginBottom: '20px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{successMessage}</div>}

      {activeTab === 'premieres' && (
        <div className="admin-content">
          <div className="admin-form-section">
            <h2>➕ Добавить новую премьеру</h2>
            <form onSubmit={handleCreatePremiere} className="admin-form">
              <div className="form-group">
                <label className="form-label">Название фильма *</label>
                <input
                  type="text"
                  placeholder="Например: Дюна: Часть вторая"
                  value={premiereForm.title}
                  onChange={(e) => setPremiereForm({ ...premiereForm, title: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  placeholder="Краткое описание фильма..."
                  value={premiereForm.description}
                  onChange={(e) => setPremiereForm({ ...premiereForm, description: e.target.value })}
                  className="input-field"
                  rows={4}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">URL постера *</label>
                <input
                  type="url"
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  value={premiereForm.poster_url}
                  onChange={(e) => setPremiereForm({ ...premiereForm, poster_url: e.target.value })}
                  required
                  className="input-field"
                />
                <small className="form-hint">Можно использовать постеры с TMDb или других источников</small>
              </div>
              
              <div className="form-group">
                <label className="form-label">Дата релиза</label>
                <input
                  type="date"
                  value={premiereForm.release_date}
                  onChange={(e) => setPremiereForm({ ...premiereForm, release_date: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Позиция на странице</label>
                <select
                  value={premiereForm.position}
                  onChange={(e) => setPremiereForm({ ...premiereForm, position: e.target.value as 'left' | 'right' })}
                  className="input-field"
                >
                  <option value="left">⬅️ Слева</option>
                  <option value="right">➡️ Справа</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={premiereForm.is_active}
                    onChange={(e) => setPremiereForm({ ...premiereForm, is_active: e.target.checked })}
                  />
                  <span>Активна (будет отображаться на сайте)</span>
                </label>
              </div>
              
              <button type="submit" disabled={loading} className="primary-button admin-submit-button">
                {loading ? '⏳ Создание...' : '✅ Создать премьеру'}
              </button>
            </form>
          </div>

          <div className="admin-list-section">
            <h2>📋 Существующие премьеры ({premieres.length})</h2>
            {premieres.length === 0 ? (
              <div className="empty-state">
                <p>Премьер пока нет. Добавьте первую премьеру!</p>
              </div>
            ) : (
              <div className="premieres-list">
                {premieres.map((premiere) => (
                  <div key={premiere.id} className="premiere-item">
                    {premiere.poster_url && (
                      <img 
                        src={premiere.poster_url} 
                        alt={premiere.title} 
                        className="premiere-item-poster"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/80x120?text=No+Image';
                        }}
                      />
                    )}
                    <div className="premiere-item-info">
                      <h3>{premiere.title}</h3>
                      {premiere.description && (
                        <p className="premiere-description">{premiere.description}</p>
                      )}
                      {premiere.release_date && (
                        <p className="premiere-date">📅 {new Date(premiere.release_date).toLocaleDateString('ru-RU')}</p>
                      )}
                      <div className="premiere-meta">
                        <span className="premiere-item-position">
                          {premiere.position === 'left' ? '⬅️ Слева' : '➡️ Справа'}
                        </span>
                        <span className={`premiere-item-status ${premiere.is_active ? 'active' : 'inactive'}`}>
                          {premiere.is_active ? '✅ Активна' : '❌ Неактивна'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePremiere(premiere.id)}
                      className="delete-button"
                      title="Удалить премьеру"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'movies' && (
        <div className="admin-content">
          <div className="admin-form-section">
            <h2>➕ Добавить новый фильм</h2>
            <form onSubmit={handleCreateMovie} className="admin-form">
              <div className="form-group">
                <label className="form-label">Название (рус.) *</label>
                <input
                  type="text"
                  placeholder="Например: Матрица"
                  value={movieForm.title}
                  onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Название (англ.)</label>
                <input
                  type="text"
                  placeholder="Например: The Matrix"
                  value={movieForm.title_en}
                  onChange={(e) => setMovieForm({ ...movieForm, title_en: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Описание *</label>
                <textarea
                  placeholder="Краткое описание фильма..."
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  className="input-field"
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">URL постера *</label>
                <input
                  type="url"
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  value={movieForm.poster_url}
                  onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Год *</label>
                  <input
                    type="number"
                    value={movieForm.year}
                    onChange={(e) => setMovieForm({ ...movieForm, year: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Длительность (мин) *</label>
                  <input
                    type="number"
                    value={movieForm.duration}
                    onChange={(e) => setMovieForm({ ...movieForm, duration: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    required
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Рейтинг Кинопоиск</label>
                  <input
                    type="number"
                    step="0.1"
                    value={movieForm.kp_rating}
                    onChange={(e) => setMovieForm({ ...movieForm, kp_rating: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    max="10"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Рейтинг IMDb</label>
                  <input
                    type="number"
                    step="0.1"
                    value={movieForm.imdb_rating}
                    onChange={(e) => setMovieForm({ ...movieForm, imdb_rating: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Жанры (через запятую) *</label>
                <input
                  type="text"
                  placeholder="боевик, фантастика, триллер"
                  value={movieForm.genre}
                  onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                  required
                  className="input-field"
                />
                <small className="form-hint">Например: боевик, фантастика, триллер</small>
              </div>
              
              <div className="form-group">
                <label className="form-label">URL трейлера</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={movieForm.trailer_url}
                  onChange={(e) => setMovieForm({ ...movieForm, trailer_url: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <button type="submit" disabled={loading} className="primary-button admin-submit-button">
                {loading ? '⏳ Создание...' : '✅ Создать фильм'}
              </button>
            </form>
          </div>

          <div className="admin-list-section">
            <h2>📋 Все фильмы ({movies.length})</h2>
            {loading && movies.length === 0 ? (
              <div className="empty-state">
                <p>Загрузка фильмов...</p>
              </div>
            ) : movies.length === 0 ? (
              <div className="empty-state">
                <p>Фильмов пока нет. Добавьте первый фильм!</p>
              </div>
            ) : (
              <div className="movies-list">
                {movies.map((movie) => (
                  <div key={movie.id} className="movie-item">
                    {movie.poster_url && (
                      <img 
                        src={movie.poster_url} 
                        alt={getMovieDisplayTitle(movie)} 
                        className="movie-item-poster"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/80x120?text=No+Image';
                        }}
                      />
                    )}
                    <div className="movie-item-info">
                      <h3>{getMovieDisplayTitle(movie)}</h3>
                      {movie.title_en && movie.title !== movie.title_en && <p className="movie-title-en">{movie.title_en}</p>}
                      {movie.description && (
                        <p className="movie-description">{movie.description.substring(0, 100)}...</p>
                      )}
                      <div className="movie-meta">
                        {movie.year && <span>📅 {movie.year}</span>}
                        {movie.duration && <span>⏱ {movie.duration} мин</span>}
                        {movie.kp_rating && <span>⭐ КП: {movie.kp_rating}</span>}
                        {movie.imdb_rating && <span>⭐ IMDb: {movie.imdb_rating}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="admin-content">
          <p>Функция управления ссылками для матчей будет добавлена позже.</p>
        </div>
      )}
    </div>
  );
};
