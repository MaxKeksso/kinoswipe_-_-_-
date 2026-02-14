import React, { useEffect, useState } from 'react';
import { apiService, MatchLink, Match } from '../api/api';
import './MatchLinksPage.css';

interface MatchLinksPageProps {
  match: Match;
  onClose: () => void;
}

export const MatchLinksPage: React.FC<MatchLinksPageProps> = ({ match, onClose }) => {
  const [links, setLinks] = useState<MatchLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  const loadLinks = async () => {
    try {
      const matchLinks = await apiService.getMatchLinks(match.id);
      setLinks(matchLinks);
    } catch (err) {
      console.error('Error loading match links:', err);
    } finally {
      setLoading(false);
    }
  };

  const platformIcons: Record<string, string> = {
    kinopoisk: '🎬',
    start: '⭐',
    okko: '🎥',
    ivi: '📺',
    other: '🔗',
  };

  const platformNames: Record<string, string> = {
    kinopoisk: 'Кинопоиск',
    start: 'Старт',
    okko: 'Окко',
    ivi: 'Иви',
    other: 'Другое',
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="match-links-page">
      <div className="match-links-content">
        <button className="close-button" onClick={onClose}>×</button>
        
        {/* Заголовок с анимацией */}
        <div className="match-celebration">
          <div className="match-title-animation">
            <h1 className="match-title">ЭТО МЭТЧ!</h1>
            <div className="match-sparkles">✨ ✨ ✨</div>
          </div>
          <p className="match-subtitle">Вы оба выбрали этот фильм!</p>
        </div>

        {/* Информация о людях */}
        {match.users && match.users.length > 0 ? (
          <div className="match-users">
            <div className="users-avatars">
              {match.users.slice(0, 2).map((user, index) => (
                <div key={user.id} className="user-avatar" style={{ zIndex: match.users!.length - index }}>
                  <div className="avatar-circle">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="username">{user.username || 'Пользователь'}</span>
                </div>
              ))}
              {match.users.length > 2 && (
                <div className="user-avatar more-users">
                  <div className="avatar-circle">+{match.users.length - 2}</div>
                </div>
              )}
            </div>
            <div className="match-divider">
              <span>❤️</span>
            </div>
          </div>
        ) : (
          <div className="match-users">
            <p className="match-subtitle">Все участники комнаты выбрали этот фильм!</p>
          </div>
        )}

        {/* Информация о фильме */}
        {match.movie && (
          <div className="match-movie-info">
            <img
              src={match.movie.poster_url}
              alt={match.movie.title}
              className="match-movie-poster"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/300x450?text=${encodeURIComponent(match.movie!.title)}`;
              }}
            />
            <div className="movie-details">
              <h3>{match.movie.title}</h3>
              {match.movie.year && (
                <p className="movie-year">📅 {match.movie.year} год</p>
              )}
              {match.movie.kp_rating && (
                <div className="movie-rating">
                  <span className="rating-label">Кинопоиск:</span>
                  <span className="rating-value">{match.movie.kp_rating.toFixed(1)}</span>
                </div>
              )}
              {match.movie.description && (
                <p className="movie-description">{match.movie.description.substring(0, 150)}...</p>
              )}
            </div>
          </div>
        )}
        <h3>Где посмотреть:</h3>
        {loading ? (
          <div className="loading">Загрузка ссылок...</div>
        ) : links.length > 0 ? (
          <div className="links-grid">
            {links.map((link) => (
              <div
                key={link.id}
                className="link-card"
                onClick={() => handleLinkClick(link.url)}
              >
                <div className="link-icon">{platformIcons[link.platform] || '🔗'}</div>
                <div className="link-info">
                  <h4>{link.title || platformNames[link.platform] || link.platform}</h4>
                  <span className="link-platform">{platformNames[link.platform] || link.platform}</span>
                </div>
                <div className="link-arrow">→</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-links">
            <p>Ссылки для просмотра пока не добавлены админом</p>
            <p className="no-links-hint">Администратор добавит ссылки на Кинопоиск, Старт, Окко и другие платформы</p>
            <div className="default-links-hint">
              <p>Вы можете найти этот фильм на:</p>
              <div className="default-links">
                <a href={`https://www.kinopoisk.ru/film/${match.movie?.id || ''}`} target="_blank" rel="noopener noreferrer" className="default-link">
                  🎬 Кинопоиск
                </a>
                <a href="https://start.ru" target="_blank" rel="noopener noreferrer" className="default-link">
                  ⭐ Старт
                </a>
                <a href="https://okko.tv" target="_blank" rel="noopener noreferrer" className="default-link">
                  🎥 Окко
                </a>
                <a href="https://www.ivi.ru" target="_blank" rel="noopener noreferrer" className="default-link">
                  📺 Иви
                </a>
              </div>
            </div>
            <button onClick={onClose} className="primary-button" style={{ marginTop: '20px' }}>
              Продолжить свайпить
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
