import React, { useState, useEffect, useCallback } from 'react';
import './FootballPage.css';
import { apiService, FootballMatch, FootballStanding, ChampionsLeagueBracket } from '../api/api';

type Tab = 'matches' | 'standings-cl' | 'standings-rpl';

const STATUS_LABEL: Record<FootballMatch['status'], string> = {
  upcoming: 'Предстоящий',
  live:     '🔴 Live',
  finished: 'Завершён',
};

// Зоны для разделителей в таблице ЛЧ (после позиции 8 и 24)
const CL_SEP_AFTER = new Set([8, 24]);
// Зоны для РПЛ (после позиции 5 и 15)
const RPL_SEP_AFTER = new Set([5, 15]);

const FormPills: React.FC<{ form?: string }> = ({ form }) => {
  if (!form) return null;
  return (
    <div className="form-pills">
      {form.slice(-5).split('').map((ch, i) => (
        <span key={i} className={`form-pill ${ch}`}>{ch}</span>
      ))}
    </div>
  );
};

const StandingsTable: React.FC<{
  standings: FootballStanding[];
  sepAfter: Set<number>;
  legendItems: { dot: string; label: string }[];
}> = ({ standings, sepAfter, legendItems }) => (
  <div className="standings-section">
    <div className="standings-legend">
      {legendItems.map(li => (
        <span key={li.dot} className="legend-item">
          <span className={`legend-dot legend-dot--${li.dot}`} />
          {li.label}
        </span>
      ))}
    </div>
    <div className="standings-table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Команда</th>
            <th title="Сыграно">И</th>
            <th title="Победы">В</th>
            <th title="Ничьи">Н</th>
            <th title="Поражения">П</th>
            <th className="col-goals" title="Голы">ГЗ:ГП</th>
            <th title="Разница">РГ</th>
            <th title="Очки">О</th>
            <th className="col-form" title="Форма">Форма</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(row => {
            const zoneClass = row.zone ? `zone-${row.zone}` : '';
            const sepClass  = sepAfter.has(row.position) ? 'zone-sep-below' : '';
            const gdClass   = row.goalDiff > 0 ? 'positive' : row.goalDiff < 0 ? 'negative' : '';
            return (
              <tr key={row.position} className={`${zoneClass} ${sepClass}`}>
                <td className="td-pos">{row.position}</td>
                <td className="td-team">{row.team}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.draw}</td>
                <td>{row.lost}</td>
                <td className="col-goals">{row.goalsFor}:{row.goalsAgainst}</td>
                <td className={`td-gd ${gdClass}`}>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                <td className="td-pts">{row.points}</td>
                <td className="col-form"><FormPills form={row.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export const FootballPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('matches');

  const [rplMatches, setRplMatches] = useState<FootballMatch[]>([]);
  const [europeanMatches, setEuropeanMatches] = useState<FootballMatch[]>([]);
  const [clStandings, setClStandings]   = useState<FootballStanding[]>([]);
  const [rplStandings, setRplStandings] = useState<FootballStanding[]>([]);
  const [loading, setLoading]     = useState(true);
  const [standLoad, setStandLoad] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [clBracket, setClBracket] = useState<ChampionsLeagueBracket | null>(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [bracketError, setBracketError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
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
  }, []);

  const loadStandings = useCallback(async () => {
    if (clStandings.length > 0 && rplStandings.length > 0) return;
    try {
      setStandLoad(true);
      const resp = await apiService.getFootballStandings();
      if (resp.cl)  setClStandings(resp.cl);
      if (resp.rpl) setRplStandings(resp.rpl);
    } catch {
      /* таблицы не критичны — просто пустые */
    } finally {
      setStandLoad(false);
    }
  }, [clStandings.length, rplStandings.length]);

  const loadClBracket = useCallback(async () => {
    if (clBracket) return;
    try {
      setBracketLoading(true);
      setBracketError(null);
      const data = await apiService.getChampionsLeagueBracket();
      setClBracket(data);
    } catch {
      setBracketError('Не удалось загрузить сетку Лиги чемпионов.');
    } finally {
      setBracketLoading(false);
    }
  }, [clBracket]);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  // Загружаем таблицы при переходе на вкладку
  useEffect(() => {
    if (activeTab === 'standings-cl' || activeTab === 'standings-rpl') {
      loadStandings();
    }
    if (activeTab === 'standings-cl') {
      loadClBracket();
    }
  }, [activeTab, loadStandings, loadClBracket]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', weekday: 'short',
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
        {match.status !== 'upcoming'
          ? <span className="match-score">{match.homeScore ?? 0} : {match.awayScore ?? 0}</span>
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
          <p className="football-subtitle">Матчи, таблицы и трансляции</p>
        </div>

        {/* Табы */}
        <div className="football-tabs">
          <button
            className={`football-tab ${activeTab === 'matches' ? 'football-tab--active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >📅 Матчи</button>
          <button
            className={`football-tab ${activeTab === 'standings-cl' ? 'football-tab--active' : ''}`}
            onClick={() => setActiveTab('standings-cl')}
          >🏆 Таблица ЛЧ</button>
          <button
            className={`football-tab ${activeTab === 'standings-rpl' ? 'football-tab--active' : ''}`}
            onClick={() => setActiveTab('standings-rpl')}
          >🇷🇺 Таблица РПЛ</button>
        </div>

        {/* === Матчи === */}
        {activeTab === 'matches' && (
          <>
            {/* Где смотреть */}
            <div className="streaming-section">
              <h2>📺 Где смотреть</h2>
              <div className="streaming-cards">
                <a href="https://okko.tv/sport" target="_blank" rel="noopener noreferrer" className="streaming-card okko-card">
                  <div className="streaming-logo">🎬</div>
                  <h3>Okko Спорт</h3>
                  <p>Прямые трансляции РПЛ, Лиги Чемпионов и других турниров</p>
                  <div className="streaming-link">Перейти на Okko →</div>
                </a>
                <a href="https://www.kinopoisk.ru/sport/" target="_blank" rel="noopener noreferrer" className="streaming-card kinopoisk-card">
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
              {loading && <div className="matches-loading">Загрузка расписания...</div>}
              {error   && <div className="matches-error">{error}</div>}
              {!loading && !error && (
                <div className="matches-pools">
                  <div className="matches-pool">
                    <h3 className="pool-title">🇷🇺 РПЛ и российский футбол</h3>
                    <div className="matches-list">
                      {rplMatches.length === 0
                        ? <p className="matches-empty">Нет предстоящих матчей</p>
                        : rplMatches.map(renderMatch)}
                    </div>
                  </div>
                  <div className="matches-pool">
                    <h3 className="pool-title">🇪🇺 Европейские турниры</h3>
                    <div className="matches-list">
                      {europeanMatches.length === 0
                        ? <p className="matches-empty">Нет предстоящих матчей</p>
                        : europeanMatches.map(renderMatch)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* === Таблица ЛЧ + сетка === */}
        {activeTab === 'standings-cl' && (
          <>
            {standLoad && <div className="matches-loading">Загрузка таблицы...</div>}
            {!standLoad && clStandings.length === 0 && (
              <div className="matches-loading">Данные недоступны</div>
            )}
            {!standLoad && clStandings.length > 0 && (
              <>
                <StandingsTable
                  standings={clStandings}
                  sepAfter={CL_SEP_AFTER}
                  legendItems={[
                    { dot: 'direct',   label: 'Выход в плей-офф (1/8)' },
                    { dot: 'playoff',  label: 'Раунд плей-офф' },
                    { dot: 'eliminated', label: 'Вылет' },
                  ]}
                />

                <div className="cl-bracket-section">
                  <h3>Сетка плей-офф Лиги чемпионов</h3>
                  {bracketLoading && <div className="matches-loading">Загрузка сетки...</div>}
                  {bracketError && <div className="matches-error">{bracketError}</div>}
                  {!bracketLoading && !bracketError && clBracket && (
                    <div className="cl-bracket">
                      <div className="cl-bracket-column">
                        <h4>1/8 финала</h4>
                        {clBracket.roundOf16.map(renderMatch)}
                      </div>
                      <div className="cl-bracket-column">
                        <h4>1/4 финала</h4>
                        {clBracket.quarterFinals.map(renderMatch)}
                      </div>
                      <div className="cl-bracket-column">
                        <h4>1/2 финала</h4>
                        {clBracket.semiFinals.map(renderMatch)}
                      </div>
                      <div className="cl-bracket-column">
                        <h4>Финал</h4>
                        {clBracket.final.map(renderMatch)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* === Таблица РПЛ === */}
        {activeTab === 'standings-rpl' && (
          <>
            {standLoad && <div className="matches-loading">Загрузка таблицы...</div>}
            {!standLoad && rplStandings.length === 0 && (
              <div className="matches-loading">Данные недоступны</div>
            )}
            {!standLoad && rplStandings.length > 0 && (
              <StandingsTable
                standings={rplStandings}
                sepAfter={RPL_SEP_AFTER}
                legendItems={[
                  { dot: 'europe',    label: 'Еврокубки' },
                  { dot: 'relegation', label: 'Вылет' },
                ]}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
};
