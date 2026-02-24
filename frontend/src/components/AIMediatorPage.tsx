import React, { useState } from 'react';

interface GenreChip {
  id: string;
  label: string;
  emoji: string;
}

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  genres: string[];
}

interface CompromiseFilm {
  title: string;
  emoji: string;
  genre: string;
  year: number;
  duration: string;
  scoreA: number;
  scoreB: number;
  reason: string;
}

const ALL_GENRES: GenreChip[] = [
  { id: 'action', label: 'Боевик', emoji: '💥' },
  { id: 'comedy', label: 'Комедия', emoji: '😂' },
  { id: 'drama', label: 'Драма', emoji: '😢' },
  { id: 'horror', label: 'Ужасы', emoji: '👻' },
  { id: 'sci-fi', label: 'Фантастика', emoji: '🚀' },
  { id: 'romance', label: 'Мелодрама', emoji: '❤️' },
  { id: 'thriller', label: 'Триллер', emoji: '🔪' },
  { id: 'animation', label: 'Анимация', emoji: '🎨' },
  { id: 'documentary', label: 'Документалка', emoji: '📹' },
  { id: 'adventure', label: 'Приключения', emoji: '🗺️' },
];

const COMPROMISE_FILMS: CompromiseFilm[] = [
  { title: 'Начало', emoji: '🌀', genre: 'Триллер/Фантастика', year: 2010, duration: '2ч 28м', scoreA: 91, scoreB: 87, reason: 'Умный триллер с элементами фантастики — идеальный компромисс' },
  { title: 'Интерстеллар', emoji: '🚀', genre: 'Фантастика/Драма', year: 2014, duration: '2ч 49м', scoreA: 88, scoreB: 84, reason: 'Эпическая драма в космосе с мощной эмоциональной историей' },
  { title: 'Паразиты', emoji: '🏠', genre: 'Триллер/Комедия', year: 2019, duration: '2ч 12м', scoreA: 85, scoreB: 89, reason: 'Острая социальная сатира — и смешно, и страшно' },
  { title: 'Зеленая книга', emoji: '🚗', genre: 'Драма/Комедия', year: 2018, duration: '2ч 10м', scoreA: 82, scoreB: 90, reason: 'Душевная история дружбы — трогает и развлекает' },
  { title: 'Джокер', emoji: '🃏', genre: 'Драма/Триллер', year: 2019, duration: '2ч 2м', scoreA: 86, scoreB: 83, reason: 'Психологически насыщенная история с эпичным финалом' },
];

const ANALYZING_STEPS = [
  '🔍 Анализирую жанровые предпочтения...',
  '🧠 Нахожу точки пересечения...',
  '🎬 Подбираю фильмы-компромиссы...',
  '✨ Формирую рекомендацию...',
];

const AIMediatorPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [phase, setPhase] = useState<'setup' | 'analyzing' | 'result'>('setup');
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<UserProfile[]>([
    { id: '1', name: 'Андрей', avatar: '🧑', color: '#a855f7', genres: ['action', 'sci-fi', 'thriller'] },
    { id: '2', name: 'Маша', avatar: '👩', color: '#f43f5e', genres: ['romance', 'comedy', 'drama'] },
  ]);
  const [film, setFilm] = useState<CompromiseFilm | null>(null);

  const toggleGenre = (profileId: string, genreId: string) => {
    setProfiles(ps => ps.map(p => {
      if (p.id !== profileId) return p;
      const has = p.genres.includes(genreId);
      if (has) return { ...p, genres: p.genres.filter(g => g !== genreId) };
      if (p.genres.length >= 5) return p;
      return { ...p, genres: [...p.genres, genreId] };
    }));
  };

  const compatibility = () => {
    const a = new Set(profiles[0].genres);
    const b = new Set(profiles[1].genres);
    const shared = Array.from(a).filter(g => b.has(g)).length;
    const total = new Set(Array.from(a).concat(Array.from(b))).size;
    return total === 0 ? 0 : Math.round((shared / total) * 100);
  };

  const handleAnalyze = () => {
    setPhase('analyzing');
    setStep(0);
    let s = 0;
    const interval = setInterval(() => {
      s++;
      setStep(s);
      if (s >= ANALYZING_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          const picked = COMPROMISE_FILMS[Math.floor(Math.random() * COMPROMISE_FILMS.length)];
          setFilm(picked);
          setPhase('result');
        }, 600);
      }
    }, 700);
  };

  const compat = compatibility();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0015, #1a0535, #0d1a2e)',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
          padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 14,
        }}>← Назад</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🤝 AI-Медиатор</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.6 }}>Найдём компромисс для двоих</p>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 680, margin: '0 auto' }}>

        {/* SETUP */}
        {phase === 'setup' && (
          <>
            {/* Compatibility meter */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              padding: 18,
              marginBottom: 20,
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>Совместимость вкусов</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: compat > 60 ? '#1db954' : compat > 30 ? '#ffd200' : '#f43f5e' }}>
                {compat}%
              </div>
              <div style={{
                height: 8, background: 'rgba(255,255,255,0.1)',
                borderRadius: 10, margin: '10px 0 4px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${compat}%`,
                  background: compat > 60 ? 'linear-gradient(90deg,#1db954,#06d6a0)' : compat > 30 ? 'linear-gradient(90deg,#ffd200,#ff9500)' : 'linear-gradient(90deg,#f43f5e,#ff6b6b)',
                  borderRadius: 10,
                  transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>
                {compat > 60 ? 'Отличная совместимость!' : compat > 30 ? 'Есть точки соприкосновения' : 'Нужен крепкий компромисс 😅'}
              </div>
            </div>

            {/* User profiles */}
            {profiles.map(p => (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                border: `1px solid ${p.color}30`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>{p.avatar}</span>
                  <div>
                    <strong style={{ fontSize: 16 }}>{p.name}</strong>
                    <div style={{ fontSize: 12, opacity: 0.55 }}>Выбрано: {p.genres.length}/5 жанров</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_GENRES.map(g => {
                    const selected = p.genres.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGenre(p.id, g.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: selected ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.15)',
                          background: selected ? `${p.color}25` : 'transparent',
                          color: selected ? '#fff' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: selected ? 600 : 400,
                          transition: 'all 0.2s',
                        }}
                      >
                        {g.emoji} {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleAnalyze}
              disabled={profiles[0].genres.length === 0 || profiles[1].genres.length === 0}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: profiles[0].genres.length > 0 && profiles[1].genres.length > 0
                  ? 'linear-gradient(90deg, #a855f7, #06b6d4)'
                  : 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                cursor: profiles[0].genres.length > 0 && profiles[1].genres.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              🤝 Найти компромисс
            </button>
          </>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              fontSize: 64,
              marginBottom: 16,
              animation: 'spin 1s linear infinite',
              display: 'inline-block',
            }}>🤖</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>Анализирую предпочтения...</h2>
            <p style={{ margin: '0 0 24px', opacity: 0.55, fontSize: 14 }}>AI находит идеальный фильм для вас обоих</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
              {ANALYZING_STEPS.map((s, i) => (
                <div key={i} style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: i < step ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i < step ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  fontSize: 13,
                  color: i < step ? '#c084fc' : 'rgba(255,255,255,0.4)',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                }}>
                  {i < step ? '✅' : '⏳'} {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && film && (
          <>
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.1))',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: 20,
              padding: 24,
              textAlign: 'center',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 60, marginBottom: 12 }}>{film.emoji}</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>🤖 AI рекомендует</div>
              <h2 style={{ margin: '0 0 6px', fontSize: 24 }}>{film.title}</h2>
              <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 16 }}>{film.genre} · {film.year} · {film.duration}</div>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 14,
                lineHeight: 1.5,
                textAlign: 'left',
              }}>
                💡 {film.reason}
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              padding: 18,
              marginBottom: 16,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Насколько подходит каждому:</h3>
              {[
                { name: profiles[0].name, avatar: profiles[0].avatar, score: film.scoreA, color: profiles[0].color },
                { name: profiles[1].name, avatar: profiles[1].avatar, score: film.scoreB, color: profiles[1].color },
              ].map(u => (
                <div key={u.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{u.avatar} {u.name}</span>
                    <span style={{ color: u.color, fontWeight: 700 }}>{u.score}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${u.score}%`,
                      background: `linear-gradient(90deg, ${u.color}, ${u.color}99)`,
                      borderRadius: 10,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setPhase('setup'); setFilm(null); }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                🔄 Подобрать снова
              </button>
              <button
                onClick={() => {
                  const idx = COMPROMISE_FILMS.indexOf(film);
                  const next = COMPROMISE_FILMS[(idx + 1) % COMPROMISE_FILMS.length];
                  setFilm(next);
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ➡️ Другой вариант
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIMediatorPage;
