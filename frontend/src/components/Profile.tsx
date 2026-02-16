import React, { useEffect, useState } from 'react';
import { apiService, User, UserStatistics } from '../api/api';
import './Profile.css';

interface ProfileProps {
  user: User;
  onClose: () => void;
}

const GENRE_MAP: Record<string, string> = {
  'action': '💥 Боевик',
  'comedy': '😂 Комедия',
  'drama': '🎭 Драма',
  'horror': '👻 Ужасы',
  'thriller': '🔪 Триллер',
  'romance': '💕 Романтика',
  'sci-fi': '🚀 Фантастика',
  'fantasy': '🧙 Фэнтези',
  'adventure': '🗺️ Приключения',
  'crime': '🔫 Криминал',
  'mystery': '🔍 Детектив',
  'animation': '🎨 Анимация',
  'documentary': '📹 Документалистика',
  'family': '👨‍👩‍👧‍👦 Семейное',
  'war': '⚔️ Военное',
};

export const Profile: React.FC<ProfileProps> = ({ user, onClose }) => {
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Загружаем жанры пользователя
    const userGenresKey = `userGenres_${user.id}`;
    const savedGenres = localStorage.getItem(userGenresKey) || localStorage.getItem('userGenres');
    if (savedGenres) {
      try {
        setUserGenres(JSON.parse(savedGenres));
      } catch (e) {
        console.error('Error parsing genres:', e);
      }
    }

    // Загружаем статистику пользователя
    const loadStatistics = async () => {
      try {
        setLoadingStats(true);
        const stats = await apiService.getUserStatistics(user.id);
        setStatistics(stats);
      } catch (err) {
        console.error('Error loading statistics:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStatistics();
  }, [user.id]);

  return (
    <div className="profile-page">
      <div className="profile-content">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2>{user.username}</h2>
          {user.email && <p className="profile-email">{user.email}</p>}
        </div>

        <div className="profile-section">
          <h3>🎬 Мои предпочтения по жанрам</h3>
          {(userGenres || []).length > 0 ? (
            <div className="genres-grid">
              {(userGenres || []).map((genre) => (
                <div key={genre} className="genre-card">
                  <span className="genre-icon">{GENRE_MAP[genre]?.split(' ')[0] || '🎬'}</span>
                  <span className="genre-name">{GENRE_MAP[genre]?.split(' ').slice(1).join(' ') || genre}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-genres">
              <p>Вы еще не выбрали предпочтения по жанрам.</p>
              <p className="hint">Пройдите опросник при следующем входе!</p>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>📊 Статистика</h3>
          {loadingStats ? (
            <div className="stats-loading">Загрузка статистики...</div>
          ) : statistics ? (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{statistics.total_matches}</div>
                <div className="stat-label">Матчей</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.total_swipes}</div>
                <div className="stat-label">Просмотрено фильмов</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.liked_movies}</div>
                <div className="stat-label">Лайкнуто</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.disliked_movies}</div>
                <div className="stat-label">Дизлайкнуто</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.rooms_created}</div>
                <div className="stat-label">Создано комнат</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.rooms_joined}</div>
                <div className="stat-label">Присоединился к комнатам</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.active_rooms}</div>
                <div className="stat-label">Активных комнат</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statistics.completed_rooms}</div>
                <div className="stat-label">Завершенных комнат</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{(userGenres || []).length}</div>
                <div className="stat-label">Выбранных жанров</div>
              </div>
            </div>
          ) : (
            <div className="stats-error">Не удалось загрузить статистику</div>
          )}
        </div>

        <div className="profile-actions">
          <button onClick={onClose} className="primary-button">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
