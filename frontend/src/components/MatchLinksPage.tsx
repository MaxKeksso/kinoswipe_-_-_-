import React, { useEffect, useState } from 'react';
import { apiService, MatchLink, Match } from '../api/api';
import { getMovieDisplayTitle } from '../utils/movieRussian';
import './MatchLinksPage.css';

interface MatchLinksPageProps {
  match: Match | null | undefined;
  onClose: () => void;
}

export const MatchLinksPage: React.FC<MatchLinksPageProps> = ({ match, onClose }) => {
  const [links, setLinks] = useState<MatchLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailedMatch, setDetailedMatch] = useState<Match | null>(null);

  const baseMatch = match && typeof match === 'object' && (match as Match).id ? (match as Match) : null;
  const safeMatch = detailedMatch || baseMatch;
  const safeUsers = (safeMatch && Array.isArray(safeMatch.users)) ? safeMatch.users : [];
  const safeMovie = safeMatch?.movie && typeof safeMatch.movie === 'object' ? safeMatch.movie : null;

  useEffect(() => {
    if (!baseMatch?.id) return;
    if (baseMatch.movie && typeof baseMatch.movie === 'object' && Array.isArray(baseMatch.users)) {
      setDetailedMatch(null);
      return;
    }
    apiService.getMatch(baseMatch.id).then((full) => {
      setDetailedMatch(full);
    }).catch(() => setDetailedMatch(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- достаточно отслеживать id, movie/users для раннего выхода
  }, [baseMatch?.id]);

  useEffect(() => {
    if (safeMatch?.id) loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMatch?.id]);

  const loadLinks = async () => {
    if (!safeMatch?.id) return;
    try {
      const matchLinks = await apiService.getMatchLinks(safeMatch.id);
      setLinks(Array.isArray(matchLinks) ? matchLinks : []);
    } catch (err) {
      console.error('Error loading match links:', err);
      setLinks([]);
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

  if (!safeMatch) {
    return (
      <div className="match-links-page">
        <div className="match-links-content">
          <button className="close-button" onClick={onClose}>×</button>
          <p>Данные о матче недоступны.</p>
          <button onClick={onClose} className="primary-button">Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-links-page">
      <div className="match-links-content">
        <button className="close-button" onClick={onClose}>×</button>
        
        {/* Заголовок с анимацией */}
        <div className="match-celebration">
          <div className="match-title-animation">
            <h1 className="match-title">У вас мэтч</h1>
            <div className="match-sparkles">✨ ✨ ✨</div>
          </div>
          <p className="match-subtitle">Все выбрали этот фильм — ниже ссылки, где его посмотреть</p>
        </div>

        {/* Информация о людях */}
        {safeUsers.length > 0 ? (
          <div className="match-users">
            <div className="users-avatars">
              {safeUsers.slice(0, 2).map((user, index) => (
                <div key={user?.id || index} className="user-avatar" style={{ zIndex: safeUsers.length - index }}>
                  <div className="avatar-circle">
                    {(user?.username && String(user.username).length > 0) ? String(user.username).charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="username">{user?.username || 'Пользователь'}</span>
                </div>
              ))}
              {safeUsers.length > 2 && (
                <div className="user-avatar more-users">
                  <div className="avatar-circle">+{safeUsers.length - 2}</div>
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
        {safeMovie && (
          <div className="match-movie-info">
            <img
              src={safeMovie.comic_poster_url || safeMovie.poster_url || ''}
              alt={getMovieDisplayTitle(safeMovie)}
              className="match-movie-poster"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (safeMovie.comic_poster_url && target.src === safeMovie.comic_poster_url) {
                  target.src = safeMovie.poster_url || '';
                }
              }}
            />
            <div className="movie-details">
              <h3>{getMovieDisplayTitle(safeMovie)}</h3>
              {safeMovie.year && (
                <p className="movie-year">📅 {safeMovie.year} год</p>
              )}
              {safeMovie.kp_rating != null && !Number.isNaN(Number(safeMovie.kp_rating)) && (
                <div className="movie-rating">
                  <span className="rating-label">Кинопоиск:</span>
                  <span className="rating-value">{Number(safeMovie.kp_rating).toFixed(1)}</span>
                </div>
              )}
              {safeMovie.description != null && String(safeMovie.description).trim() !== '' && (
                <p className="movie-description">{String(safeMovie.description).substring(0, 150)}{String(safeMovie.description).length > 150 ? '...' : ''}</p>
              )}
            </div>
          </div>
        )}
        <h3 className="watch-section-title">Где посмотреть</h3>
        {loading ? (
          <div className="loading">Загрузка ссылок...</div>
        ) : (Array.isArray(links) && links.length > 0) ? (
          <div className="links-grid">
            {(links || []).map((link) => (
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
                <a href={`https://www.kinopoisk.ru/film/${safeMovie?.id || safeMatch?.movie_id || ''}`} target="_blank" rel="noopener noreferrer" className="default-link">
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
