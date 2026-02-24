import React, { useState, useEffect } from 'react';
import './FootballPage.css';
import { apiService, FootballMatch } from '../api/api';

const STATUS_LABEL: Record<FootballMatch['status'], string> = {
  upcoming: 'Предстоящий',
  live:     'В прямом эфире',
  finished: 'Завершён',
};

export const FootballPage: React.FC = () => {
  const [rplMatches, setRplMatches] = useState<FootballMatch[]>([]);
  const [europeanMatches, setEuropeanMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getFootballMatches();
      setRplMatches(response.rpl ?? []);
      setEuropeanMatches(response.european ?? []);
    } catch {
      setError('Не удалось загрузить расписание матчей.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
    });
  };

  const renderMatch = (match: FootballMatch) => (
    <div key={match.id} className="match-item">
      <div className="match-item-header">
        <span className="match-tournament-badge">{match.tournament}</span>
        <span className={`match-status-badge match-status-badge--${match.status}`}>
          {STATUS_LABEL[match.status]}
        </span>
      </div>

      <div className="match-teams-row">
        <span className="match-team">{match.homeTeam}</span>
        {match.status === 'finished' || match.status === 'live'
          ? <span className="match-score">
              {match.homeScore ?? 0} : {match.awayScore ?? 0}
            </span>
          : <span className="match-vs-label">VS</span>
        }
        <span className="match-team match-team--away">{match.awayTeam}</span>
      </div>

      <div className="match-datetime">
        <span className="match-datetime-icon">📅</span>
        <span>{formatDate(match.date)}</span>
        <span>·</span>
        <span className="match-datetime-time">{match.time} МСК</span>
      </div>
    </div>
  );

  return (
    <div className="football-page">
      <div className="football-container">

        {/* Заголовок */}
        <div className="football-header">
          <h1>⚽ Футбол</h1>
          <p className="football-subtitle">Трансляции на Okko и Кинопоиск</p>
        </div>

        {/* Где смотреть */}
        <div className="streaming-section">
          <h2>📺 Где смотреть</h2>
          <div className="streaming-cards">
            <a
              href="https://okko.tv/sport"
              target="_blank"
              rel="noopener noreferrer"
              className="streaming-card okko-card"
            >
              <div className="streaming-logo">🎬</div>
              <h3>Okko Спорт</h3>
              <p>Прямые трансляции РПЛ, Лиги Чемпионов и других турниров</p>
              <div className="streaming-link">Перейти на Okko →</div>
            </a>

            <a
              href="https://www.kinopoisk.ru/sport/"
              target="_blank"
              rel="noopener noreferrer"
              className="streaming-card kinopoisk-card"
            >
              <div className="streaming-logo">🎥</div>
              <h3>Кинопоиск</h3>
              <p>Футбольные трансляции и спортивные передачи</p>
              <div className="streaming-link">Перейти на Кинопоиск →</div>
            </a>
          </div>
        </div>

        {/* Матчи */}
        <div className="matches-section">
          <h2>📅 Ближайшие матчи</h2>

          {loading && (
            <div className="matches-loading">Загрузка расписания...</div>
          )}
          {error && (
            <div className="matches-error">{error}</div>
          )}

          {!loading && !error && (
            <div className="matches-pools">
              <div className="matches-pool">
                <h3 className="pool-title">🇷🇺 РПЛ и российский футбол</h3>
                <div className="matches-list">
                  {rplMatches.length === 0
                    ? <p className="matches-empty">Нет предстоящих матчей</p>
                    : rplMatches.map(renderMatch)
                  }
                </div>
              </div>

              <div className="matches-pool">
                <h3 className="pool-title">🇪🇺 Европейские турниры</h3>
                <div className="matches-list">
                  {europeanMatches.length === 0
                    ? <p className="matches-empty">Нет предстоящих матчей</p>
                    : europeanMatches.map(renderMatch)
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Инфо */}
        <div className="info-section">
          <h3>ℹ️ О разделе</h3>
          <p>
            Прямые трансляции матчей доступны на Okko и Кинопоиск. Расписание обновляется каждые 5 минут.
          </p>
          <p>
            💡 Это дополнительная функция для любителей футбола. Основная цель KinoSwipe — совместный выбор фильмов.
          </p>
        </div>

      </div>
    </div>
  );
};
