import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiService } from '../api/api';
import './SpaceShooterGame.css';

// ─────────────────────────────────────────────
//  Константы игры
// ─────────────────────────────────────────────
const CANVAS_W = 480;
const CANVAS_H = 700;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_BULLET_SPEED = 4;
const FIRE_RATE = 280;       // мс между выстрелами (обычный)
const FIRE_RATE_RAPID = 100; // мс при rapid fire
const POWERUP_DURATION = 8000; // мс

// Очки за типы врагов
const SCORE_SCOUT   = 10;
const SCORE_CRUISER = 30;
const SCORE_BOSS    = 100;

// ─────────────────────────────────────────────
//  Типы
// ─────────────────────────────────────────────
interface Vec2 { x: number; y: number; }
interface Entity extends Vec2 { w: number; h: number; alive: boolean; }

interface Player extends Entity {
  speed: number;
  lives: number;
  invincible: number;   // осталось мс неуязвимости
  shield: boolean;
  rapidFire: boolean;
  rapidFireTimer: number;
  shieldTimer: number;
  lastShot: number;
}

type EnemyType = 'scout' | 'cruiser' | 'boss';
interface Enemy extends Entity {
  kind: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  dir: number;         // для зигзага / осциляции (-1 / +1)
  angle: number;       // для зигзага (отклонение)
  lastShot: number;
  scoreValue: number;
  color: string;
  flashTimer: number;  // мс белой вспышки при попадании
}

interface Bullet extends Entity {
  vx: number;
  vy: number;
  fromEnemy: boolean;
  color: string;
}

interface Particle extends Vec2 {
  vx: number; vy: number;
  life: number; maxLife: number;
  r: number;
  color: string;
  alive: boolean;
}

interface PowerUp extends Entity {
  kind: 'rapid' | 'shield' | 'life';
  vy: number;
}

interface LeaderboardEntry {
  ID: string;
  PlayerName: string;
  Score: number;
  Wave: number;
  EnemiesKilled: string;
  CreatedAt: string;
}

interface Star { x: number; y: number; r: number; speed: number; alpha: number; }

// ─────────────────────────────────────────────
//  Вспомогательные функции
// ─────────────────────────────────────────────
function rectsOverlap(a: Entity, b: Entity): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnParticles(
  list: Particle[],
  x: number, y: number,
  color: string,
  count = 12
) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 4);
    list.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(400, 800),
      maxLife: 800,
      r: rand(2, 5),
      color,
      alive: true,
    });
  }
}

// ─────────────────────────────────────────────
//  Компонент
// ─────────────────────────────────────────────
interface Props { onBack: () => void; }

type GamePhase = 'menu' | 'playing' | 'paused' | 'waveClear' | 'gameOver' | 'leaderboard';

const SpaceShooterGame: React.FC<Props> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // React state только для оверлеев
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayWave, setDisplayWave]   = useState(1);
  const [displayLives, setDisplayLives] = useState(3);
  const [playerName, setPlayerName]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [leaderboard, setLeaderboard]   = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading]       = useState(false);
  const [waveClearCountdown, setWaveClearCountdown] = useState(3);
  const [comboText, setComboText]       = useState('');

  // ── Мутируемое состояние игры (не вызывает ре-рендер) ──
  const gRef = useRef({
    player: null as unknown as Player,
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    stars: [] as Star[],
    score: 0,
    wave: 1,
    kills: { scout: 0, cruiser: 0, boss: 0 },
    combo: 0,
    comboTimer: 0,
    waveClearTimer: 0,
    enemiesLeftToSpawn: 0,
    spawnTimer: 0,
    spawnInterval: 1800,
    bossActive: false,
    phase: 'menu' as GamePhase,
    keys: {} as Record<string, boolean>,
  });

  // ─────────────────────────────────────────
  //  Инициализация звёзд
  // ─────────────────────────────────────────
  function initStars() {
    const g = gRef.current;
    g.stars = [];
    for (let i = 0; i < 80; i++) {
      g.stars.push({
        x: rand(0, CANVAS_W),
        y: rand(0, CANVAS_H),
        r: rand(0.5, 2),
        speed: rand(0.3, 1.2),
        alpha: rand(0.3, 1),
      });
    }
  }

  // ─────────────────────────────────────────
  //  Инициализация игрока
  // ─────────────────────────────────────────
  function initPlayer(): Player {
    return {
      x: CANVAS_W / 2 - 18, y: CANVAS_H - 90,
      w: 36, h: 48,
      speed: PLAYER_SPEED,
      lives: 3,
      invincible: 0,
      shield: false,
      rapidFire: false,
      rapidFireTimer: 0,
      shieldTimer: 0,
      lastShot: 0,
      alive: true,
    };
  }

  // ─────────────────────────────────────────
  //  Старт волны
  // ─────────────────────────────────────────
  function startWave(wave: number) {
    const g = gRef.current;
    g.enemies = [];
    g.bullets = [];
    g.powerUps = [];
    g.bossActive = false;

    // С волны 3 появляется босс
    if (wave >= 3 && wave % 3 === 0) {
      spawnEnemy(g.enemies, 'boss', wave);
      g.bossActive = true;
    }

    const scoutCount   = 4 + wave * 2;
    const cruiserCount = wave >= 2 ? 1 + Math.floor(wave / 2) : 0;

    g.enemiesLeftToSpawn = scoutCount + cruiserCount;
    g.spawnTimer = 0;
    g.spawnInterval = Math.max(600, 1800 - wave * 100);

    // Кладём в очередь тип (shuffled)
    const queue: EnemyType[] = [
      ...Array(scoutCount).fill('scout' as EnemyType),
      ...Array(cruiserCount).fill('cruiser' as EnemyType),
    ].sort(() => Math.random() - 0.5);
    (g as unknown as Record<string, unknown>)['spawnQueue'] = queue;
  }

  // ─────────────────────────────────────────
  //  Создание врага
  // ─────────────────────────────────────────
  function spawnEnemy(list: Enemy[], kind: EnemyType, wave: number) {
    const configs: Record<EnemyType, { w: number; h: number; hp: number; speed: number; color: string; score: number }> = {
      scout:   { w: 28, h: 28, hp: 1, speed: 2.5 + wave * 0.2, color: '#ff4444', score: SCORE_SCOUT },
      cruiser: { w: 40, h: 36, hp: 3, speed: 1.5 + wave * 0.1, color: '#ff8800', score: SCORE_CRUISER },
      boss:    { w: 64, h: 56, hp: 10 + wave * 2, speed: 1.2, color: '#aa44ff', score: SCORE_BOSS },
    };
    const c = configs[kind];
    list.push({
      x: kind === 'boss' ? CANVAS_W / 2 - c.w / 2 : rand(10, CANVAS_W - c.w - 10),
      y: kind === 'boss' ? -c.h - 10 : -c.h - rand(10, 60),
      w: c.w, h: c.h,
      kind,
      hp: c.hp, maxHp: c.hp,
      speed: c.speed,
      dir: Math.random() > 0.5 ? 1 : -1,
      angle: 0,
      lastShot: 0,
      scoreValue: c.score,
      color: c.color,
      flashTimer: 0,
      alive: true,
    });
  }

  // ─────────────────────────────────────────
  //  Главный игровой цикл
  // ─────────────────────────────────────────
  const gameLoop = useCallback((ts: number) => {
    const dt = Math.min(ts - lastTimeRef.current, 50); // cap at 50ms
    lastTimeRef.current = ts;

    const g = gRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    if (g.phase !== 'playing') {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    update(dt, g);
    render(ctx, g, ts);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────
  //  Update
  // ─────────────────────────────────────────
  function update(dt: number, g: typeof gRef.current) {
    const now = performance.now();
    const p = g.player;

    // ── Таймеры игрока ──
    if (p.invincible > 0) p.invincible -= dt;
    if (p.rapidFire) {
      p.rapidFireTimer -= dt;
      if (p.rapidFireTimer <= 0) p.rapidFire = false;
    }
    if (p.shield) {
      p.shieldTimer -= dt;
      if (p.shieldTimer <= 0) p.shield = false;
    }

    // ── Combo таймер ──
    if (g.comboTimer > 0) {
      g.comboTimer -= dt;
      if (g.comboTimer <= 0) g.combo = 0;
    }

    // ── Движение игрока ──
    const spd = p.speed;
    if ((g.keys['ArrowLeft'] || g.keys['a'] || g.keys['A']) && p.x > 0) {
      p.x -= spd;
    }
    if ((g.keys['ArrowRight'] || g.keys['d'] || g.keys['D']) && p.x + p.w < CANVAS_W) {
      p.x += spd;
    }
    // Вертикальное движение
    if ((g.keys['ArrowUp'] || g.keys['w'] || g.keys['W']) && p.y > CANVAS_H * 0.5) {
      p.y -= spd;
    }
    if ((g.keys['ArrowDown'] || g.keys['s'] || g.keys['S']) && p.y + p.h < CANVAS_H - 10) {
      p.y += spd;
    }

    // ── Авто-стрельба ──
    const fireRate = p.rapidFire ? FIRE_RATE_RAPID : FIRE_RATE;
    if (now - p.lastShot >= fireRate) {
      p.lastShot = now;
      // Тройной выстрел при rapid fire
      if (p.rapidFire) {
        [-12, 0, 12].forEach(offset => {
          g.bullets.push({
            x: p.x + p.w / 2 - 3 + offset, y: p.y,
            w: 6, h: 14,
            vx: offset * 0.3, vy: -BULLET_SPEED,
            fromEnemy: false, alive: true,
            color: '#00ffff',
          });
        });
      } else {
        g.bullets.push({
          x: p.x + p.w / 2 - 3, y: p.y,
          w: 6, h: 14,
          vx: 0, vy: -BULLET_SPEED,
          fromEnemy: false, alive: true,
          color: '#00ffff',
        });
      }
    }

    // ── Спавн врагов ──
    const queue = (g as unknown as Record<string, unknown>)['spawnQueue'] as EnemyType[] | undefined;
    if (queue && queue.length > 0) {
      g.spawnTimer += dt;
      if (g.spawnTimer >= g.spawnInterval) {
        g.spawnTimer = 0;
        const kind = queue.shift()!;
        spawnEnemy(g.enemies, kind, g.wave);
      }
    }

    // ── Движение врагов + стрельба боссов/крейсеров ──
    for (const e of g.enemies) {
      if (!e.alive) continue;
      e.flashTimer = Math.max(0, e.flashTimer - dt);

      if (e.kind === 'scout') {
        // Зигзаг
        e.angle += 0.05;
        e.x += Math.sin(e.angle) * 2.5 * e.dir;
        e.y += e.speed;
      } else if (e.kind === 'cruiser') {
        e.y += e.speed;
        // Редко стреляет вниз
        if (now - e.lastShot > 2500) {
          e.lastShot = now;
          g.bullets.push({
            x: e.x + e.w / 2 - 3, y: e.y + e.h,
            w: 6, h: 12,
            vx: 0, vy: ENEMY_BULLET_SPEED,
            fromEnemy: true, alive: true,
            color: '#ffaa00',
          });
        }
      } else if (e.kind === 'boss') {
        // Осцилляция горизонтально
        e.x += e.speed * e.dir;
        if (e.x <= 10 || e.x + e.w >= CANVAS_W - 10) e.dir *= -1;
        // Медленно спускается
        if (e.y < 60) e.y += 0.8;
        // Стрельба веером
        if (now - e.lastShot > 1200) {
          e.lastShot = now;
          for (let i = -2; i <= 2; i++) {
            g.bullets.push({
              x: e.x + e.w / 2 - 3, y: e.y + e.h,
              w: 6, h: 12,
              vx: i * 1.5, vy: ENEMY_BULLET_SPEED,
              fromEnemy: true, alive: true,
              color: '#cc44ff',
            });
          }
        }
      }

      // Враг достиг низа экрана
      if (e.y > CANVAS_H + 40) {
        e.alive = false;
        if (e.kind !== 'boss') g.score = Math.max(0, g.score - 5);
      }
    }

    // ── Движение пуль ──
    for (const b of g.bullets) {
      if (!b.alive) continue;
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -20 || b.y > CANVAS_H + 20 || b.x < -20 || b.x > CANVAS_W + 20) {
        b.alive = false;
      }
    }

    // ── Движение powerup'ов ──
    for (const pu of g.powerUps) {
      if (!pu.alive) continue;
      pu.y += pu.vy;
      if (pu.y > CANVAS_H + 30) pu.alive = false;

      // Подбор игроком
      if (rectsOverlap(pu, p)) {
        pu.alive = false;
        if (pu.kind === 'rapid') {
          p.rapidFire = true;
          p.rapidFireTimer = POWERUP_DURATION;
        } else if (pu.kind === 'shield') {
          p.shield = true;
          p.shieldTimer = POWERUP_DURATION;
        } else if (pu.kind === 'life') {
          p.lives = Math.min(5, p.lives + 1);
          setDisplayLives(p.lives);
        }
      }
    }

    // ── Пули игрока → враги ──
    for (const b of g.bullets) {
      if (!b.alive || b.fromEnemy) continue;
      for (const e of g.enemies) {
        if (!e.alive || !rectsOverlap(b, e)) continue;
        b.alive = false;
        e.hp--;
        e.flashTimer = 120;

        if (e.hp <= 0) {
          e.alive = false;
          g.kills[e.kind]++;

          // Комбо
          g.combo++;
          g.comboTimer = 1500;
          const multiplier = Math.min(g.combo, 5);
          const earned = e.scoreValue * multiplier;
          g.score += earned;

          if (g.combo >= 3) {
            setComboText(`x${multiplier} COMBO!`);
            setTimeout(() => setComboText(''), 1000);
          }

          setDisplayScore(g.score);

          // Частицы взрыва
          spawnParticles(g.particles, e.x + e.w / 2, e.y + e.h / 2, e.color, 18);

          // Дроп бонуса (25% шанс)
          if (Math.random() < 0.25) {
            const kinds: PowerUp['kind'][] = ['rapid', 'shield', 'life'];
            const weights = [0.5, 0.35, 0.15];
            let r = Math.random(), chosen: PowerUp['kind'] = 'rapid';
            for (let i = 0; i < kinds.length; i++) {
              r -= weights[i];
              if (r <= 0) { chosen = kinds[i]; break; }
            }
            g.powerUps.push({
              x: e.x + e.w / 2 - 12, y: e.y + e.h / 2,
              w: 24, h: 24,
              kind: chosen, vy: 2,
              alive: true,
            });
          }
        }
        break;
      }
    }

    // ── Пули врагов → игрок ──
    if (p.invincible <= 0) {
      for (const b of g.bullets) {
        if (!b.alive || !b.fromEnemy) continue;
        if (!rectsOverlap(b, p)) continue;
        b.alive = false;

        if (p.shield) {
          // Щит поглощает удар
          spawnParticles(g.particles, p.x + p.w / 2, p.y, '#4488ff', 10);
        } else {
          p.lives--;
          p.invincible = 2000;
          spawnParticles(g.particles, p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 20);
          setDisplayLives(p.lives);
          if (p.lives <= 0) {
            p.alive = false;
            endGame(g);
            return;
          }
        }
        break;
      }
    }

    // ── Игрок задет врагом напрямую ──
    if (p.invincible <= 0) {
      for (const e of g.enemies) {
        if (!e.alive || !rectsOverlap(p, e)) continue;
        if (p.shield) {
          e.alive = false;
          spawnParticles(g.particles, e.x + e.w / 2, e.y + e.h / 2, e.color, 14);
        } else {
          p.lives--;
          p.invincible = 2000;
          setDisplayLives(p.lives);
          spawnParticles(g.particles, p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 16);
          if (p.lives <= 0) {
            p.alive = false;
            endGame(g);
            return;
          }
        }
        break;
      }
    }

    // ── Частицы ──
    for (const pt of g.particles) {
      if (!pt.alive) continue;
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.05; // слабая гравитация
      pt.life -= dt;
      if (pt.life <= 0) pt.alive = false;
    }

    // ── Звёзды ──
    for (const s of g.stars) {
      s.y += s.speed;
      if (s.y > CANVAS_H) { s.y = 0; s.x = rand(0, CANVAS_W); }
    }

    // ── Чистка мёртвых объектов ──
    g.enemies  = g.enemies.filter(e => e.alive);
    g.bullets  = g.bullets.filter(b => b.alive);
    g.particles= g.particles.filter(pt => pt.alive);
    g.powerUps = g.powerUps.filter(pu => pu.alive);

    // ── Проверка конца волны ──
    const spawnQueueDone = !queue || queue.length === 0;
    if (spawnQueueDone && g.enemies.length === 0) {
      // Волна пройдена
      g.wave++;
      g.phase = 'waveClear';
      setDisplayWave(g.wave);
      setPhase('waveClear');

      let count = 3;
      setWaveClearCountdown(count);
      const iv = setInterval(() => {
        count--;
        setWaveClearCountdown(count);
        if (count <= 0) {
          clearInterval(iv);
          startWave(g.wave);
          g.phase = 'playing';
          setPhase('playing');
        }
      }, 1000);
    }
  }

  // ─────────────────────────────────────────
  //  Конец игры
  // ─────────────────────────────────────────
  function endGame(g: typeof gRef.current) {
    g.phase = 'gameOver';
    setDisplayScore(g.score);
    setDisplayWave(g.wave);
    setPhase('gameOver');
  }

  // ─────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, g: typeof gRef.current, ts: number) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Фон ──
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Звёзды ──
    for (const s of g.stars) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Power-ups ──
    for (const pu of g.powerUps) {
      if (!pu.alive) continue;
      const icons: Record<string, string> = { rapid: '⚡', shield: '🛡', life: '❤️' };
      const colors: Record<string, string> = { rapid: '#ffdd00', shield: '#4488ff', life: '#ff4488' };

      ctx.save();
      // Пульсирующее свечение
      const pulse = 0.7 + 0.3 * Math.sin(ts / 200);
      ctx.shadowColor = colors[pu.kind];
      ctx.shadowBlur = 12 * pulse;
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[pu.kind], pu.x + pu.w / 2, pu.y + pu.h / 2);
      ctx.restore();
    }

    // ── Частицы ──
    for (const pt of g.particles) {
      if (!pt.alive) continue;
      const alpha = pt.life / pt.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Враги ──
    for (const e of g.enemies) {
      if (!e.alive) continue;
      ctx.save();

      const flash = e.flashTimer > 0;
      ctx.shadowColor = flash ? '#ffffff' : e.color;
      ctx.shadowBlur = flash ? 20 : 10;
      ctx.fillStyle = flash ? '#ffffff' : e.color;

      if (e.kind === 'scout') {
        // Ромб
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2, e.y);
        ctx.lineTo(e.x + e.w, e.y + e.h / 2);
        ctx.lineTo(e.x + e.w / 2, e.y + e.h);
        ctx.lineTo(e.x, e.y + e.h / 2);
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'cruiser') {
        // Шестиугольник
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          const r = Math.min(e.w, e.h) / 2;
          i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
                  : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'boss') {
        // Большой восьмиугольник с HP баром
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i;
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          const r = Math.min(e.w, e.h) / 2;
          i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
                  : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        // Враг внутри (глаз)
        ctx.fillStyle = flash ? '#ff4444' : '#1a001a';
        ctx.beginPath();
        ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // HP бар
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x, e.y - 10, e.w, 6);
        ctx.fillStyle = '#aa44ff';
        ctx.fillRect(e.x, e.y - 10, e.w * (e.hp / e.maxHp), 6);
      }
      ctx.restore();
    }

    // ── Пули ──
    for (const b of g.bullets) {
      if (!b.alive) continue;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();
      ctx.restore();
    }

    // ── Игрок ──
    const p = g.player;
    if (p.alive) {
      ctx.save();

      // Моргание при неуязвимости
      if (p.invincible > 0 && Math.floor(p.invincible / 150) % 2 === 0) {
        ctx.restore();
      } else {
        // Щит
        if (p.shield) {
          ctx.save();
          ctx.globalAlpha = 0.3 + 0.2 * Math.sin(ts / 150);
          ctx.strokeStyle = '#4488ff';
          ctx.shadowColor = '#4488ff';
          ctx.shadowBlur = 20;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Корпус корабля
        ctx.shadowColor = p.rapidFire ? '#ffdd00' : '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = p.rapidFire ? '#ffdd00' : '#00ffff';

        // Треугольный корпус
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2, p.y);        // нос
        ctx.lineTo(p.x + p.w, p.y + p.h * 0.8); // правый низ
        ctx.lineTo(p.x + p.w * 0.7, p.y + p.h * 0.65);
        ctx.lineTo(p.x + p.w / 2, p.y + p.h);   // хвост
        ctx.lineTo(p.x + p.w * 0.3, p.y + p.h * 0.65);
        ctx.lineTo(p.x, p.y + p.h * 0.8);
        ctx.closePath();
        ctx.fill();

        // Двигатель (огонь)
        const flameH = 8 + 6 * Math.sin(ts / 80);
        ctx.fillStyle = p.rapidFire ? '#ff8800' : '#ff6600';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w * 0.35, p.y + p.h);
        ctx.lineTo(p.x + p.w * 0.5, p.y + p.h + flameH);
        ctx.lineTo(p.x + p.w * 0.65, p.y + p.h);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // ── HUD (счёт / жизни / волна) ──
    ctx.save();
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#aaddff';
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 6;
    ctx.fillText(`SCORE: ${g.score}`, 10, 22);
    ctx.fillText(`WAVE: ${g.wave}`, CANVAS_W / 2 - 30, 22);

    // Жизни — маленькие корабли
    for (let i = 0; i < p.lives; i++) {
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      const lx = CANVAS_W - 22 - i * 22;
      ctx.beginPath();
      ctx.moveTo(lx + 7, 6);
      ctx.lineTo(lx + 14, 18);
      ctx.lineTo(lx, 18);
      ctx.closePath();
      ctx.fill();
    }

    // Полоска powerup
    if (p.rapidFire) {
      const frac = p.rapidFireTimer / POWERUP_DURATION;
      ctx.fillStyle = '#ffdd00';
      ctx.fillRect(10, CANVAS_H - 8, (CANVAS_W - 20) * frac, 4);
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 8;
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = '#ffdd00';
      ctx.fillText('⚡ RAPID FIRE', 10, CANVAS_H - 12);
    }
    if (p.shield) {
      const frac = p.shieldTimer / POWERUP_DURATION;
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(10, CANVAS_H - 8, (CANVAS_W - 20) * frac, 4);
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = '#4488ff';
      ctx.fillText('🛡 SHIELD', 10, CANVAS_H - 12);
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────
  //  Старт игры
  // ─────────────────────────────────────────
  const startGame = useCallback(() => {
    const g = gRef.current;
    g.score = 0;
    g.wave = 1;
    g.kills = { scout: 0, cruiser: 0, boss: 0 };
    g.combo = 0;
    g.comboTimer = 0;
    g.particles = [];
    g.player = initPlayer();

    initStars();
    startWave(1);

    setDisplayScore(0);
    setDisplayWave(1);
    setDisplayLives(3);
    setPlayerName('');
    setComboText('');

    g.phase = 'playing';
    setPhase('playing');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────
  //  Загрузка таблицы рекордов
  // ─────────────────────────────────────────
  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const data = await apiService.getGameLeaderboard();
      setLeaderboard(data);
    } catch {
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }, []);

  const showLeaderboard = useCallback(async () => {
    setPhase('leaderboard');
    await loadLeaderboard();
  }, [loadLeaderboard]);

  // ─────────────────────────────────────────
  //  Отправка рекорда
  // ─────────────────────────────────────────
  const submitScore = useCallback(async () => {
    const g = gRef.current;
    setSubmitting(true);
    try {
      await apiService.submitGameScore({
        player_name: playerName.trim() || 'Аноним',
        score: g.score,
        wave: g.wave,
        enemies_killed: g.kills,
      });
    } catch { /* игнорируем ошибки */ }
    setSubmitting(false);
    await showLeaderboard();
  }, [playerName, showLeaderboard]);

  // ─────────────────────────────────────────
  //  Клавиатура
  // ─────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      gRef.current.keys[e.key] = true;
      if (e.key === ' ') e.preventDefault(); // без прокрутки страницы
    };
    const up = (e: KeyboardEvent) => {
      gRef.current.keys[e.key] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ─────────────────────────────────────────
  //  RAF loop
  // ─────────────────────────────────────────
  useEffect(() => {
    initStars();
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    // Рендер фонового звёздного поля в меню
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;

      const bgLoop = (ts: number) => {
        if (gRef.current.phase !== 'menu' && gRef.current.phase !== 'paused') return;
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        for (const s of gRef.current.stars) {
          s.y += s.speed * 0.5;
          if (s.y > CANVAS_H) { s.y = 0; s.x = rand(0, CANVAS_W); }
          ctx.globalAlpha = s.alpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        requestAnimationFrame(bgLoop);
      };
      requestAnimationFrame(bgLoop);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  // ─────────────────────────────────────────
  //  Мобильные кнопки управления (touch)
  // ─────────────────────────────────────────
  const mobilePress  = (key: string) => { gRef.current.keys[key] = true; };
  const mobileRelease = (key: string) => { gRef.current.keys[key] = false; };

  return (
    <div className="shooter-page" ref={containerRef}>
      <div className="shooter-header">
        <button className="shooter-back-btn" onClick={onBack}>← Назад</button>
        <h2 className="shooter-title">🚀 Космический защитник</h2>
        <button className="shooter-lb-btn" onClick={showLeaderboard}>🏆 Рекорды</button>
      </div>

      <div className="shooter-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="shooter-canvas"
        />

        {/* ── Главное меню ── */}
        {phase === 'menu' && (
          <div className="shooter-overlay">
            <div className="shooter-menu">
              <div className="shooter-menu-icon">🚀</div>
              <h1 className="shooter-menu-title">Космический<br />Защитник</h1>
              <p className="shooter-menu-sub">Уничтожай волны врагов, собирай бонусы, устанавливай рекорды!</p>
              <div className="shooter-menu-controls">
                <span>← → ↑ ↓ / WASD — движение</span>
                <span>Авто-стрельба активна</span>
              </div>
              <button className="shooter-btn shooter-btn--primary" onClick={startGame}>
                Начать игру
              </button>
              <button className="shooter-btn shooter-btn--secondary" onClick={showLeaderboard}>
                🏆 Таблица рекордов
              </button>
            </div>
          </div>
        )}

        {/* ── Пауза между волнами ── */}
        {phase === 'waveClear' && (
          <div className="shooter-overlay">
            <div className="shooter-wave-clear">
              <div className="shooter-wave-icon">✅</div>
              <h2>Волна пройдена!</h2>
              <p className="shooter-wave-score">Счёт: {displayScore}</p>
              <p className="shooter-wave-next">Следующая волна: {displayWave}</p>
              <div className="shooter-wave-countdown">{waveClearCountdown}</div>
            </div>
          </div>
        )}

        {/* ── Комбо ── */}
        {comboText && (
          <div className="shooter-combo">{comboText}</div>
        )}

        {/* ── Game Over ── */}
        {phase === 'gameOver' && (
          <div className="shooter-overlay">
            <div className="shooter-gameover">
              <div className="shooter-gameover-icon">💀</div>
              <h2 className="shooter-gameover-title">GAME OVER</h2>
              <div className="shooter-gameover-stats">
                <div className="shooter-stat">
                  <span className="shooter-stat-label">Счёт</span>
                  <span className="shooter-stat-value">{displayScore}</span>
                </div>
                <div className="shooter-stat">
                  <span className="shooter-stat-label">Волна</span>
                  <span className="shooter-stat-value">{displayWave}</span>
                </div>
                <div className="shooter-stat">
                  <span className="shooter-stat-label">Разведчики</span>
                  <span className="shooter-stat-value">{gRef.current.kills.scout}</span>
                </div>
                <div className="shooter-stat">
                  <span className="shooter-stat-label">Крейсеры</span>
                  <span className="shooter-stat-value">{gRef.current.kills.cruiser}</span>
                </div>
                <div className="shooter-stat">
                  <span className="shooter-stat-label">Боссы</span>
                  <span className="shooter-stat-value">{gRef.current.kills.boss}</span>
                </div>
              </div>
              <div className="shooter-name-row">
                <input
                  className="shooter-name-input"
                  placeholder="Введи имя для рекорда"
                  value={playerName}
                  maxLength={30}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && submitScore()}
                />
              </div>
              <div className="shooter-gameover-btns">
                <button
                  className="shooter-btn shooter-btn--primary"
                  onClick={submitScore}
                  disabled={submitting}
                >
                  {submitting ? 'Сохраняю...' : '🏆 Сохранить рекорд'}
                </button>
                <button className="shooter-btn shooter-btn--secondary" onClick={startGame}>
                  🔄 Играть снова
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Таблица рекордов ── */}
        {phase === 'leaderboard' && (
          <div className="shooter-overlay">
            <div className="shooter-leaderboard">
              <h2 className="shooter-lb-title">🏆 Таблица рекордов</h2>
              {lbLoading ? (
                <p className="shooter-lb-loading">Загружаю...</p>
              ) : leaderboard.length === 0 ? (
                <p className="shooter-lb-empty">Рекордов пока нет. Будь первым!</p>
              ) : (
                <table className="shooter-lb-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Игрок</th>
                      <th>Счёт</th>
                      <th>Волна</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.ID} className={i === 0 ? 'shooter-lb-first' : ''}>
                        <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td>{entry.PlayerName}</td>
                        <td className="shooter-lb-score">{entry.Score.toLocaleString()}</td>
                        <td>{entry.Wave}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="shooter-lb-btns">
                <button className="shooter-btn shooter-btn--primary" onClick={startGame}>
                  🚀 Играть
                </button>
                <button className="shooter-btn shooter-btn--secondary" onClick={() => setPhase('menu')}>
                  ← Меню
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Мобильные кнопки ── */}
      {phase === 'playing' && (
        <div className="shooter-mobile-controls">
          <div className="shooter-mobile-row">
            <button
              className="shooter-mobile-btn"
              onPointerDown={() => mobilePress('ArrowLeft')}
              onPointerUp={() => mobileRelease('ArrowLeft')}
              onPointerLeave={() => mobileRelease('ArrowLeft')}
            >◀</button>
            <button
              className="shooter-mobile-btn"
              onPointerDown={() => mobilePress('ArrowUp')}
              onPointerUp={() => mobileRelease('ArrowUp')}
              onPointerLeave={() => mobileRelease('ArrowUp')}
            >▲</button>
            <button
              className="shooter-mobile-btn"
              onPointerDown={() => mobilePress('ArrowRight')}
              onPointerUp={() => mobileRelease('ArrowRight')}
              onPointerLeave={() => mobileRelease('ArrowRight')}
            >▶</button>
          </div>
          <div className="shooter-mobile-row">
            <button
              className="shooter-mobile-btn"
              onPointerDown={() => mobilePress('ArrowDown')}
              onPointerUp={() => mobileRelease('ArrowDown')}
              onPointerLeave={() => mobileRelease('ArrowDown')}
            >▼</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceShooterGame;
