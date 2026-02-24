import React, { useState } from 'react';
import './MovieRoulettePage.css';

interface Player {
  id: string;
  name: string;
  avatar: string;
  vetos: number;
  superLike: boolean;
  vetoed: string[];
  superLiked: string | null;
}

interface RouletteMovie {
  id: string;
  title: string;
  emoji: string;
  genre: string;
  year: number;
  duration: string;
  score: number;
  banned: boolean;
  superLiked: boolean;
}

const MOVIE_POOL: RouletteMovie[] = [
  { id: '1', title: 'Интерстеллар', emoji: '🚀', genre: 'Фантастика', year: 2014, duration: '2ч 49м', score: 0, banned: false, superLiked: false },
  { id: '2', title: 'Джокер', emoji: '🃏', genre: 'Драма', year: 2019, duration: '2ч 2м', score: 0, banned: false, superLiked: false },
  { id: '3', title: 'Паразиты', emoji: '🏠', genre: 'Триллер', year: 2019, duration: '2ч 12м', score: 0, banned: false, superLiked: false },
  { id: '4', title: 'Матрица', emoji: '💊', genre: 'Боевик', year: 1999, duration: '2ч 16м', score: 0, banned: false, superLiked: false },
  { id: '5', title: 'Начало', emoji: '🌀', genre: 'Триллер', year: 2010, duration: '2ч 28м', score: 0, banned: false, superLiked: false },
  { id: '6', title: 'Бойцовский клуб', emoji: '👊', genre: 'Драма', year: 1999, duration: '2ч 19м', score: 0, banned: false, superLiked: false },
  { id: '7', title: 'Форрест Гамп', emoji: '🏃', genre: 'Драма', year: 1994, duration: '2ч 22м', score: 0, banned: false, superLiked: false },
  { id: '8', title: 'Зеленая миля', emoji: '🌿', genre: 'Драма', year: 1999, duration: '3ч 9м', score: 0, banned: false, superLiked: false },
];

const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: 'Вы', avatar: '😎', vetos: 3, superLike: true, vetoed: [], superLiked: null },
  { id: '2', name: 'Андрей', avatar: '🧑', vetos: 3, superLike: true, vetoed: [], superLiked: null },
  { id: '3', name: 'Маша', avatar: '👩', vetos: 3, superLike: true, vetoed: [], superLiked: null },
];

const MovieRoulettePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [phase, setPhase] = useState<'lobby' | 'vote' | 'result'>('lobby');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [movies, setMovies] = useState<RouletteMovie[]>(MOVIE_POOL);
  const [activePlayer, setActivePlayer] = useState('1');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteMovie | null>(null);
  const [challenge, setChallenge] = useState(false);
  const [notification, setNotification] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');

  const pushNotif = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  const activeP = players.find(p => p.id === activePlayer)!;

  const handleVeto = (movieId: string) => {
    if (!activeP || activeP.vetos <= 0) {
      pushNotif('Нет вето-жетонов!');
      return;
    }
    const movie = movies.find(m => m.id === movieId);
    if (!movie || movie.banned) return;
    setMovies(ms => ms.map(m => m.id === movieId ? { ...m, banned: true, score: m.score - 3 } : m));
    setPlayers(ps => ps.map(p => p.id === activePlayer
      ? { ...p, vetos: p.vetos - 1, vetoed: [...p.vetoed, movieId] }
      : p
    ));
    pushNotif(`${activeP.name} забанил "${movie.title}"! Осталось вето: ${activeP.vetos - 1}`);
  };

  const handleSuperLike = (movieId: string) => {
    if (!activeP || !activeP.superLike) {
      pushNotif('Суперлайк уже использован!');
      return;
    }
    const movie = movies.find(m => m.id === movieId);
    if (!movie || movie.banned) return;
    setMovies(ms => ms.map(m => m.id === movieId ? { ...m, superLiked: true, score: m.score + 5 } : m));
    setPlayers(ps => ps.map(p => p.id === activePlayer
      ? { ...p, superLike: false, superLiked: movieId }
      : p
    ));
    pushNotif(`⭐ ${activeP.name} поставил суперлайк "${movie.title}"!`);
  };

  const handleSpin = () => {
    setSpinning(true);
    setTimeout(() => {
      const available = movies.filter(m => !m.banned);
      if (available.length === 0) {
        pushNotif('Все фильмы забанены! Добавьте больше или снимите баны.');
        setSpinning(false);
        return;
      }
      const weights = available.map(m => Math.max(1, 10 + m.score));
      const total = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      let picked = available[available.length - 1];
      for (let i = 0; i < available.length; i++) {
        rand -= weights[i];
        if (rand <= 0) { picked = available[i]; break; }
      }
      setWinner(picked);
      setSpinning(false);
      setPhase('result');
      // Если у фильма низкий score — включаем "challenge"
      if (picked.score < 0) setChallenge(true);
    }, 2000);
  };

  const addPlayer = () => {
    if (!newPlayerName.trim() || players.length >= 6) return;
    const AVTS = ['👨', '👧', '🧔', '👱', '🧒', '👩‍🦰'];
    setPlayers([...players, {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      avatar: AVTS[players.length % AVTS.length],
      vetos: 3,
      superLike: true,
      vetoed: [],
      superLiked: null,
    }]);
    setNewPlayerName('');
  };

  const reset = () => {
    setPhase('lobby');
    setPlayers(INITIAL_PLAYERS);
    setMovies(MOVIE_POOL);
    setWinner(null);
    setChallenge(false);
    setActivePlayer('1');
  };

  return (
    <div className="roulette-page">
      {notification && <div className="roulette-notification">{notification}</div>}

      <div className="roulette-header">
        <button className="roulette-back-btn" onClick={onBack}>← Назад</button>
        <div className="roulette-header-title">
          <h1>🎰 Кино-Рулетка</h1>
          <p>Социальная игра для выбора фильма</p>
        </div>
        {phase !== 'lobby' && (
          <button className="roulette-reset-btn" onClick={reset}>↺ Заново</button>
        )}
      </div>

      {/* ЛОББИ */}
      {phase === 'lobby' && (
        <div className="roulette-content">
          <div className="roulette-rules-card">
            <h2>📜 Правила игры</h2>
            <div className="roulette-rules-grid">
              <div className="roulette-rule">
                <span className="roulette-rule-icon">🚫</span>
                <div>
                  <strong>3 вето</strong>
                  <p>Каждый может навсегда убрать 3 фильма</p>
                </div>
              </div>
              <div className="roulette-rule">
                <span className="roulette-rule-icon">⭐</span>
                <div>
                  <strong>1 суперлайк</strong>
                  <p>Увеличивает шанс выпадения фильма</p>
                </div>
              </div>
              <div className="roulette-rule">
                <span className="roulette-rule-icon">🎲</span>
                <div>
                  <strong>Рулетка</strong>
                  <p>Система выбирает с учётом всех голосов</p>
                </div>
              </div>
              <div className="roulette-rule">
                <span className="roulette-rule-icon">🍕</span>
                <div>
                  <strong>Ставка</strong>
                  <p>Недовольный заказывает пиццу всем</p>
                </div>
              </div>
            </div>
          </div>

          <div className="roulette-players-section">
            <div className="roulette-section-header">
              <h2>👥 Игроки ({players.length}/6)</h2>
              {players.length < 6 && (
                <div className="roulette-add-player">
                  <input
                    className="roulette-input"
                    placeholder="Имя игрока"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addPlayer()}
                    maxLength={12}
                  />
                  <button className="roulette-add-btn" onClick={addPlayer}>+</button>
                </div>
              )}
            </div>
            <div className="roulette-players-grid">
              {players.map(p => (
                <div key={p.id} className="roulette-player-card">
                  <span className="roulette-player-avatar">{p.avatar}</span>
                  <span className="roulette-player-name">{p.name}</span>
                  <div className="roulette-player-tokens">
                    {Array.from({ length: p.vetos }).map((_, i) => (
                      <span key={i} className="roulette-veto-token">🚫</span>
                    ))}
                    {p.superLike && <span className="roulette-super-token">⭐</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="roulette-start-btn" onClick={() => setPhase('vote')}>
            🎬 Начать голосование
          </button>
        </div>
      )}

      {/* ГОЛОСОВАНИЕ */}
      {phase === 'vote' && (
        <div className="roulette-content">
          {/* Переключатель игрока */}
          <div className="roulette-player-switcher">
            <span className="roulette-turn-label">Ход:</span>
            <div className="roulette-player-tabs">
              {players.map(p => (
                <button
                  key={p.id}
                  className={`roulette-player-tab ${activePlayer === p.id ? 'active' : ''}`}
                  onClick={() => setActivePlayer(p.id)}
                >
                  {p.avatar} {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Токены активного игрока */}
          <div className="roulette-tokens-row">
            <div className="roulette-token-info">
              <span className="roulette-token-icon">🚫</span>
              <span>Вето: <strong>{activeP?.vetos || 0}</strong>/3</span>
            </div>
            <div className="roulette-token-info">
              <span className="roulette-token-icon">⭐</span>
              <span>Суперлайк: <strong>{activeP?.superLike ? '1' : '0'}</strong>/1</span>
            </div>
          </div>

          {/* Список фильмов */}
          <div className="roulette-movies-list">
            {movies.map(movie => (
              <div key={movie.id} className={`roulette-movie-card ${movie.banned ? 'banned' : ''} ${movie.superLiked ? 'super-liked' : ''}`}>
                {movie.banned && <div className="roulette-banned-overlay">🚫 ЗАБАНЕН</div>}
                {movie.superLiked && <div className="roulette-super-badge">⭐ СУПЕРЛАЙК</div>}
                <div className="roulette-movie-main">
                  <span className="roulette-movie-emoji">{movie.emoji}</span>
                  <div className="roulette-movie-info">
                    <strong>{movie.title}</strong>
                    <span>{movie.genre} · {movie.year} · {movie.duration}</span>
                    {movie.score !== 0 && (
                      <span className={`roulette-movie-score ${movie.score > 0 ? 'pos' : 'neg'}`}>
                        {movie.score > 0 ? `+${movie.score}` : movie.score} к шансу
                      </span>
                    )}
                  </div>
                </div>
                {!movie.banned && (
                  <div className="roulette-movie-actions">
                    <button
                      className="roulette-veto-btn"
                      disabled={!activeP?.vetos || activeP?.vetoed.includes(movie.id)}
                      onClick={() => handleVeto(movie.id)}
                    >
                      🚫 Вето
                    </button>
                    <button
                      className="roulette-super-btn"
                      disabled={!activeP?.superLike || activeP?.superLiked === movie.id}
                      onClick={() => handleSuperLike(movie.id)}
                    >
                      ⭐
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className="roulette-spin-btn"
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? (
              <span className="roulette-spinning">🎰 Крутим рулетку...</span>
            ) : (
              '🎲 Запустить рулетку!'
            )}
          </button>
        </div>
      )}

      {/* РЕЗУЛЬТАТ */}
      {phase === 'result' && winner && (
        <div className="roulette-content">
          <div className="roulette-winner-card">
            <div className="roulette-winner-glow" />
            <div className="roulette-winner-emoji">{winner.emoji}</div>
            <div className="roulette-winner-label">🎉 Рулетка выбрала!</div>
            <h1 className="roulette-winner-title">{winner.title}</h1>
            <div className="roulette-winner-meta">
              {winner.genre} · {winner.year} · {winner.duration}
            </div>
            {winner.superLiked && (
              <div className="roulette-winner-boost">⭐ Суперлайк дал +5 к шансу</div>
            )}
          </div>

          {challenge && (
            <div className="roulette-challenge-card">
              <h2>⚠️ Есть недовольный!</h2>
              <p>Этот фильм набрал низкий рейтинг среди команды. По правилам игры:</p>
              <div className="roulette-challenge-options">
                <div className="roulette-challenge-opt accept">
                  <span>✅ Принять вызов</span>
                  <p>Смотрим выбранный фильм. Недовольный <strong>заказывает пиццу</strong> всей команде.</p>
                  <button className="roulette-accept-btn" onClick={() => setChallenge(false)}>
                    🍕 Принимаю, заказываю пиццу
                  </button>
                </div>
                <div className="roulette-challenge-opt alternative">
                  <span>🔄 Предложить альтернативу</span>
                  <p>Недовольный может предложить другой фильм. Команда голосует.</p>
                  <button className="roulette-alt-btn" onClick={() => { setChallenge(false); setPhase('vote'); }}>
                    ↩ Вернуться к голосованию
                  </button>
                </div>
              </div>
            </div>
          )}

          {!challenge && (
            <div className="roulette-final-actions">
              <div className="roulette-pizza-reminder">
                🍕 Не забудьте заказать пиццу перед просмотром!
              </div>
              <button className="roulette-spin-btn" onClick={reset}>
                🔄 Новая игра
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MovieRoulettePage;
