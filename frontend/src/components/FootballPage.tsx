import React, { useState, useEffect } from 'react';
import './FootballPage.css';

interface Match {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  tournament: string;
  status: 'upcoming' | 'live' | 'finished';
}

export const FootballPage: React.FC = () => {
  const [upcomingMatches] = useState<Match[]>([
    {
      id: '1',
      date: '2026-02-20',
      time: '20:00',
      homeTeam: 'Спартак',
      awayTeam: 'Зенит',
      tournament: 'РПЛ',
      status: 'upcoming',
    },
    {
      id: '2',
      date: '2026-02-22',
      time: '19:00',
      homeTeam: 'ЦСКА',
      awayTeam: 'Краснодар',
      tournament: 'РПЛ',
      status: 'upcoming',
    },
    {
      id: '3',
      date: '2026-02-25',
      time: '18:30',
      homeTeam: 'Локомотив',
      awayTeam: 'Динамо',
      tournament: 'РПЛ',
      status: 'upcoming',
    },
    {
      id: '4',
      date: '2026-03-01',
      time: '20:00',
      homeTeam: 'Рубин',
      awayTeam: 'Ростов',
      tournament: 'РПЛ',
      status: 'upcoming',
    },
    {
      id: '5',
      date: '2026-03-05',
      time: '19:30',
      homeTeam: 'Сочи',
      awayTeam: 'Урал',
      tournament: 'РПЛ',
      status: 'upcoming',
    },
  ]);

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

        {/* Ближайшие матчи */}
        <div className="matches-section">
          <h2>📅 Ближайшие матчи</h2>
          <div className="matches-list">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-header">
                  <span className="match-tournament">{match.tournament}</span>
                  <span className="match-status">{match.status === 'upcoming' ? 'Предстоящий' : match.status === 'live' ? 'В прямом эфире' : 'Завершен'}</span>
                </div>
                <div className="match-teams">
                  <div className="team home-team">
                    <span className="team-name">{match.homeTeam}</span>
                  </div>
                  <div className="match-vs">VS</div>
                  <div className="team away-team">
                    <span className="team-name">{match.awayTeam}</span>
                  </div>
                </div>
                <div className="match-date">
                  <span className="date-icon">📅</span>
                  <span>{formatDate(match.date)}</span>
                  <span className="time-separator">•</span>
                  <span className="match-time">{match.time}</span>
                </div>
              </div>
            ))}
          </div>
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
