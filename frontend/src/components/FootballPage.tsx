import React, { useState, useEffect } from 'react';
import './FootballPage.css';
import { apiService, FootballMatch } from '../api/api';

export const FootballPage: React.FC = () => {
  const [rplMatches, setRplMatches] = useState<FootballMatch[]>([]);
  const [europeanMatches, setEuropeanMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
    
    // Автоматическое обновление каждые 5 минут
    const interval = setInterval(() => {
      loadMatches();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading football matches from API...');
      const response = await apiService.getFootballMatches();
      
      console.log('Received response:', response);
      
      if (response.rpl) {
        console.log(`Loaded ${response.rpl.length} RPL matches`);
        setRplMatches(response.rpl);
      } else {
        console.log('No RPL matches in response');
        setRplMatches([]);
      }
      
      if (response.european) {
        console.log(`Loaded ${response.european.length} European matches`);
        setEuropeanMatches(response.european);
      } else {
        console.log('No European matches in response');
        setEuropeanMatches([]);
      }
    } catch (err) {
      console.error('Error loading matches:', err);
      setError('Не удалось загрузить данные о матчах. Проверьте консоль для деталей.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <div className="football-page">
      <div className="football-container">
        <div className="football-header">
          <h1>⚽ Футбол</h1>
          <p className="football-subtitle">Смотри футбол на Okko и Кинопоиск</p>
        </div>

        {/* Ссылки на стриминговые сервисы */}
        <div className="streaming-section">
          <h2>📺 Где смотреть футбол</h2>
          <div className="streaming-cards">
            <a 
              href="https://okko.tv/sport" 
              target="_blank" 
              rel="noopener noreferrer"
              className="streaming-card okko-card"
            >
              <div className="streaming-logo">🎬</div>
              <h3>Okko Спорт</h3>
              <p>Прямые трансляции матчей РПЛ, Лиги Чемпионов и других турниров</p>
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

        {/* Ближайшие матчи - два пула */}
        <div className="matches-section">
          <h2>📅 Ближайшие матчи</h2>
          {loading && <p style={{ textAlign: 'center', opacity: 0.7 }}>Загрузка матчей...</p>}
          {error && <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>}
          {!loading && !error && (
            <div className="matches-pools">
              {/* Левый пул: РПЛ и важные матчи */}
              <div className="matches-pool">
                <h3 className="pool-title">🇷🇺 РПЛ и важные матчи</h3>
                <div className="matches-list">
                  {rplMatches.length === 0 ? (
                    <p style={{ textAlign: 'center', opacity: 0.7 }}>Нет предстоящих матчей</p>
                  ) : (
                    rplMatches.map((match) => (
                  <div key={match.id} className="match-card">
                    <div className="match-header">
                      <span className="match-tournament">{match.tournament}</span>
                      <span className="match-status">{match.status === 'upcoming' ? 'Предстоящий' : match.status === 'live' ? 'В прямом эфире' : 'Завершен'}</span>
                    </div>
                    <div className="match-teams">
                      <div className="team home-team">
                        <span className="team-name" title={match.homeTeam}>{match.homeTeam}</span>
                      </div>
                      <div className="match-vs">VS</div>
                      <div className="team away-team">
                        <span className="team-name" title={match.awayTeam}>{match.awayTeam}</span>
                      </div>
                    </div>
                    <div className="match-date">
                      <span className="date-icon">📅</span>
                      <span>{formatDate(match.date)}</span>
                      <span className="time-separator">•</span>
                      <span className="match-time">{match.time}</span>
                    </div>
                    </div>
                    ))
                  )}
                </div>
              </div>

              {/* Правый пул: Европейские турниры */}
              <div className="matches-pool">
                <h3 className="pool-title">🇪🇺 Европейские турниры</h3>
                <div className="matches-list">
                  {europeanMatches.length === 0 ? (
                    <p style={{ textAlign: 'center', opacity: 0.7 }}>Нет предстоящих матчей</p>
                  ) : (
                    europeanMatches.map((match) => (
                  <div key={match.id} className="match-card">
                    <div className="match-header">
                      <span className="match-tournament">{match.tournament}</span>
                      <span className="match-status">{match.status === 'upcoming' ? 'Предстоящий' : match.status === 'live' ? 'В прямом эфире' : 'Завершен'}</span>
                    </div>
                    <div className="match-teams">
                      <div className="team home-team">
                        <span className="team-name" title={match.homeTeam}>{match.homeTeam}</span>
                      </div>
                      <div className="match-vs">VS</div>
                      <div className="team away-team">
                        <span className="team-name" title={match.awayTeam}>{match.awayTeam}</span>
                      </div>
                    </div>
                    <div className="match-date">
                      <span className="date-icon">📅</span>
                      <span>{formatDate(match.date)}</span>
                      <span className="time-separator">•</span>
                      <span className="match-time">{match.time}</span>
                    </div>
                    </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Информационный блок */}
        <div className="info-section">
          <h3>ℹ️ Информация</h3>
          <p>
            Смотрите прямые трансляции футбольных матчей на платформах Okko и Кинопоиск. 
            Расписание обновляется регулярно. Проверяйте актуальное время матчей на официальных сайтах.
          </p>
          <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
            💡 Это дополнительная функция для любителей футбола. Основная функциональность приложения — выбор фильмов вместе с друзьями.
          </p>
        </div>
      </div>
    </div>
  );
};
