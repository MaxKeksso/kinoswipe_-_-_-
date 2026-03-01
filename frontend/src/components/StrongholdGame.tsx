import React, { useEffect, useRef, useState, useCallback } from 'react';
import './StrongholdGame.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const CELL = 42;
const COLS = 16;
const ROWS = 12;
const CW = COLS * CELL;   // 672
const CH = ROWS * CELL;   // 504

// Path waypoints [col, row]
const WP: [number, number][] = [
  [0, 3], [4, 3], [4, 7], [8, 7], [8, 3], [11, 3], [11, 9], [13, 9], [13, 5], [14, 5],
];

const wpXY = ([c, r]: [number, number]): [number, number] => [
  c * CELL + CELL / 2, r * CELL + CELL / 2,
];

// Precompute path cells
const PATH_SET = new Set<string>();
for (let i = 0; i + 1 < WP.length; i++) {
  const [c1, r1] = WP[i], [c2, r2] = WP[i + 1];
  if (c1 === c2) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) PATH_SET.add(`${c1},${r}`);
  } else {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) PATH_SET.add(`${c},${r1}`);
  }
}

// Castle region
const CASTLE_SET = new Set([
  '14,3','14,4','14,5','14,6','14,7',
  '15,3','15,4','15,5','15,6','15,7',
]);

function isBuildable(c: number, r: number): boolean {
  return (
    !PATH_SET.has(`${c},${r}`) &&
    !CASTLE_SET.has(`${c},${r}`) &&
    c >= 0 && c < COLS && r >= 0 && r < ROWS
  );
}

// ── Tower definitions ──────────────────────────────────────────────────────────
type TT = 'archer' | 'ballista' | 'catapult' | 'guard';

const TDEFS: Record<TT, {
  name: string; cost: number; range: number; dmg: number; cd: number;
  color: string; emoji: string; ptype: 'arrow' | 'bolt' | 'boulder'; splash: number; desc: string;
}> = {
  archer:   { name: 'Лучник',     cost: 60,  range: 130, dmg: 20, cd: 800,  color: '#A0784A', emoji: '🏹', ptype: 'arrow',   splash: 0,  desc: 'Быстрая стрельба' },
  ballista: { name: 'Баллиста',   cost: 150, range: 185, dmg: 75, cd: 2500, color: '#5C3D2E', emoji: '🎯', ptype: 'bolt',    splash: 0,  desc: 'Мощный удар' },
  catapult: { name: 'Катапульта', cost: 280, range: 200, dmg: 55, cd: 4000, color: '#555555', emoji: '💣', ptype: 'boulder', splash: 55, desc: 'Площадной урон' },
  guard:    { name: 'Стражник',   cost: 100, range: 70,  dmg: 32, cd: 1200, color: '#2E5E30', emoji: '⚔️', ptype: 'arrow',   splash: 0,  desc: 'Замедляет врагов' },
};

// ── Enemy definitions ──────────────────────────────────────────────────────────
type ET = 'goblin' | 'orc' | 'troll' | 'siege';

const EDEFS: Record<ET, { name: string; hp: number; spd: number; reward: number; dmg: number; color: string; sz: number }> = {
  goblin: { name: 'Гоблин', hp: 45,  spd: 1.3,  reward: 10,  dmg: 5,  color: '#4CAF50', sz: 13 },
  orc:    { name: 'Орк',    hp: 140, spd: 0.75, reward: 25,  dmg: 18, color: '#FF5722', sz: 18 },
  troll:  { name: 'Тролль', hp: 420, spd: 0.4,  reward: 55,  dmg: 35, color: '#9C27B0', sz: 24 },
  siege:  { name: 'Таран',  hp: 750, spd: 0.25, reward: 100, dmg: 55, color: '#607D8B', sz: 30 },
};

const TOTAL_WAVES = 10;
const BUILD_TIME  = 30000; // ms
const SPAWN_MS    = 1400;
const GOLD_TICK   = 2000;
const PASSIVE_GOLD = 12;

function getWaveList(wave: number): ET[] {
  const list: ET[] = [];
  for (let i = 0; i < 4 + wave * 2; i++) list.push('goblin');
  if (wave >= 3) for (let i = 0; i < wave - 2; i++) list.push('orc');
  if (wave >= 6) for (let i = 0; i < Math.floor((wave - 4) / 2); i++) list.push('troll');
  if (wave >= 8) for (let i = 0; i < wave - 7; i++) list.push('siege');
  return list.sort(() => Math.random() - 0.5);
}

// ── Entity types ───────────────────────────────────────────────────────────────
interface Tower  { id: number; type: TT; gc: number; gr: number; lastFired: number }
interface Enemy  { id: number; type: ET; x: number; y: number; hp: number; maxHp: number; spd: number; reward: number; dmg: number; pi: number; slowT: number }
interface Proj   { id: number; x: number; y: number; tx: number; ty: number; tid: number; spd: number; dmg: number; ptype: 'arrow' | 'bolt' | 'boulder'; splash: number }
interface Ptcl   { x: number; y: number; vx: number; vy: number; life: number; color: string; sz: number }
interface FText  { x: number; y: number; text: string; color: string; life: number }

type Phase = 'menu' | 'build' | 'wave' | 'victory' | 'defeat';

interface GS {
  phase: Phase; wave: number; gold: number; castleHp: number;
  towers: Tower[]; enemies: Enemy[]; projs: Proj[];
  ptcls: Ptcl[]; ftexts: FText[];
  spawnQ: ET[]; spawnT: number; buildT: number;
  nextId: number; goldT: number;
  sel: TT; hov: [number, number] | null;
}

const INIT_GS = (): GS => ({
  phase: 'menu', wave: 0, gold: 200, castleHp: 100,
  towers: [], enemies: [], projs: [], ptcls: [], ftexts: [],
  spawnQ: [], spawnT: 0, buildT: BUILD_TIME,
  nextId: 1, goldT: 0, sel: 'archer', hov: null,
});

// ── Drawing ────────────────────────────────────────────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#2D5016';
  ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = '#3A6B1F';
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!PATH_SET.has(`${c},${r}`) && !CASTLE_SET.has(`${c},${r}`) && (c + r) % 2 === 0) {
        ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
      }
    }
  }
  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CH); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(CW, r * CELL); ctx.stroke(); }
}

function drawPath(ctx: CanvasRenderingContext2D) {
  for (const key of PATH_SET) {
    const [cs, rs] = key.split(',').map(Number);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(cs * CELL, rs * CELL, CELL, CELL);
    ctx.fillStyle = '#7A5C10';
    ctx.fillRect(cs * CELL + 4, rs * CELL + 4, CELL - 8, CELL - 8);
  }
  // Spawn arrow
  const [sx, sy] = wpXY(WP[0]);
  ctx.fillStyle = '#FFD700';
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶', sx - CELL, sy);
}

function drawCastle(ctx: CanvasRenderingContext2D, hp: number) {
  const cx = 14 * CELL, cy = 3 * CELL;
  const cw = 2 * CELL, ch = 5 * CELL;
  const ratio = hp / 100;
  const wallCol = ratio > 0.6 ? '#9E8B78' : ratio > 0.3 ? '#A07860' : '#9E6050';

  // Body
  ctx.fillStyle = wallCol;
  ctx.fillRect(cx, cy, cw, ch);

  // Battlements top
  ctx.fillStyle = '#7A6A58';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx + i * (cw / 4) + 2, cy - 12, cw / 4 - 4, 12);
  }
  // Side towers
  ctx.fillStyle = '#888070';
  ctx.fillRect(cx - 8, cy - 4, 14, ch + 4);
  ctx.fillRect(cx + cw - 6, cy - 4, 14, ch + 4);
  // Tower tops
  ctx.fillStyle = '#6A5A4A';
  ctx.fillRect(cx - 10, cy - 16, 18, 12);
  ctx.fillRect(cx + cw - 8, cy - 16, 18, 12);

  // Gate (open arch)
  const gx = cx + cw / 2 - 10;
  const gy = cy + ch - 30;
  ctx.fillStyle = '#1A0E04';
  ctx.fillRect(gx, gy, 20, 30);
  ctx.beginPath();
  ctx.arc(gx + 10, gy, 10, Math.PI, 0);
  ctx.fill();

  // Flag
  ctx.fillStyle = '#CC2200';
  ctx.fillRect(cx + cw / 2 - 1, cy - 32, 2, 22);
  ctx.beginPath();
  ctx.moveTo(cx + cw / 2 + 1, cy - 32);
  ctx.lineTo(cx + cw / 2 + 18, cy - 23);
  ctx.lineTo(cx + cw / 2 + 1, cy - 14);
  ctx.closePath();
  ctx.fill();

  // Cracks when damaged
  if (ratio < 0.7) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy + 15);
    ctx.lineTo(cx + 18, cy + 32);
    ctx.lineTo(cx + 10, cy + 55);
    ctx.stroke();
  }
  if (ratio < 0.35) {
    ctx.beginPath();
    ctx.moveTo(cx + cw - 15, cy + 20);
    ctx.lineTo(cx + cw - 8, cy + 42);
    ctx.stroke();
  }

  // HP bar over castle
  const barW = cw + 16;
  const barX = cx - 8;
  const barY = cy - 22;
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barW, 6);
  ctx.fillStyle = ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FF9800' : '#F44336';
  ctx.fillRect(barX, barY, barW * ratio, 6);
}

function drawTower(ctx: CanvasRenderingContext2D, t: Tower) {
  const x = t.gc * CELL, y = t.gr * CELL;
  const def = TDEFS[t.type];
  // Stone base
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
  // Battlements
  ctx.fillStyle = '#7A7A7A';
  ctx.fillRect(x + 3, y + 3, CELL - 6, 7);
  // Color accent
  ctx.fillStyle = def.color;
  ctx.fillRect(x + 7, y + 10, CELL - 14, CELL - 17);
  // Border
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
  // Emoji
  ctx.font = `${CELL * 0.4}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.emoji, x + CELL / 2, y + CELL / 2 + 3);
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  const def = EDEFS[e.type];
  const sz = def.sz;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 3, sz, sz * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.fillStyle = def.color;
  ctx.beginPath(); ctx.arc(e.x, e.y, sz, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  // Slow aura
  if (e.slowT > 0) {
    ctx.strokeStyle = '#2196F3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, sz + 3, 0, Math.PI * 2); ctx.stroke();
  }
  // HP bar
  const bw = sz * 2.4, bh = 4;
  const bx = e.x - bw / 2, by = e.y - sz - 9;
  ctx.fillStyle = '#333'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#F44336'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#4CAF50'; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
}

function drawProj(ctx: CanvasRenderingContext2D, p: Proj) {
  const angle = Math.atan2(p.ty - p.y, p.tx - p.x);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
  if (p.ptype === 'arrow') {
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = '#AAA';
    ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(4,-3); ctx.lineTo(4,3); ctx.closePath(); ctx.fill();
  } else if (p.ptype === 'bolt') {
    ctx.strokeStyle = '#DDD'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
    ctx.fillStyle = '#AAA';
    ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(5,-4); ctx.lineTo(5,4); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHover(ctx: CanvasRenderingContext2D, hov: [number,number], sel: TT, gold: number) {
  const [hc, hr] = hov;
  if (!isBuildable(hc, hr)) return;
  const ok = gold >= TDEFS[sel].cost;
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)';
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,80,80,0.7)';
  ctx.lineWidth = 2;
  ctx.fillRect(hc * CELL, hr * CELL, CELL, CELL);
  ctx.strokeRect(hc * CELL, hr * CELL, CELL, CELL);
  // Range preview
  const def = TDEFS[sel];
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.25)' : 'rgba(255,100,100,0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(hc * CELL + CELL / 2, hr * CELL + CELL / 2, def.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHUD(ctx: CanvasRenderingContext2D, g: GS) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, CW, 36);
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'left';
  ctx.fillText(`💰 ${g.gold}`, 10, 18);

  ctx.fillStyle = '#FF7777';
  ctx.textAlign = 'center';
  ctx.fillText(`🏰 ${Math.max(0, g.castleHp)}/100`, CW / 2, 18);

  ctx.fillStyle = '#AACCFF';
  ctx.textAlign = 'right';
  ctx.fillText(`Волна ${g.wave}/${TOTAL_WAVES}`, CW - 10, 18);

  if (g.phase === 'build') {
    const sec = Math.ceil(g.buildT / 1000);
    ctx.fillStyle = sec <= 5 ? '#FF6644' : '#FFCC44';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(`⏱ Атака через ${sec}с`, CW / 2, 30);
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props { onBack: () => void }

const StrongholdGame: React.FC<Props> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs        = useRef<GS>(INIT_GS());
  const rafRef    = useRef<number>();
  const lastT     = useRef<number>(0);

  const [uiPhase,  setUiPhase]  = useState<Phase>('menu');
  const [uiGold,   setUiGold]   = useState(200);
  const [uiHp,     setUiHp]     = useState(100);
  const [uiWave,   setUiWave]   = useState(0);
  const [uiSel,    setUiSel]    = useState<TT>('archer');
  const [uiBuild,  setUiBuild]  = useState(BUILD_TIME / 1000);

  const syncUI = useCallback(() => {
    const g = gs.current;
    setUiPhase(g.phase);
    setUiGold(g.gold);
    setUiHp(Math.max(0, g.castleHp));
    setUiWave(g.wave);
    setUiBuild(Math.ceil(g.buildT / 1000));
  }, []);

  // ── Logic helpers ────────────────────────────────────────────────────────────
  function spawnPtcl(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      gs.current.ptcls.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, color, sz: 2 + Math.random()*3 });
    }
  }
  function addFloat(x: number, y: number, text: string, color: string) {
    gs.current.ftexts.push({ x, y, text, color, life: 1.8 });
  }
  function killEnemy(e: Enemy) {
    gs.current.gold += e.reward;
    spawnPtcl(e.x, e.y, EDEFS[e.type].color, 10);
    addFloat(e.x, e.y - 22, `+${e.reward}💰`, '#FFD700');
  }
  function startWave() {
    const g = gs.current;
    g.wave++;
    g.phase = 'wave';
    g.spawnQ = getWaveList(g.wave);
    g.spawnT = 600;
    g.goldT  = 0;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  function update(dt: number) {
    const g = gs.current;

    // ── Build phase
    if (g.phase === 'build') {
      g.buildT -= dt;
      g.goldT  += dt;
      if (g.goldT >= GOLD_TICK) { g.goldT -= GOLD_TICK; g.gold += PASSIVE_GOLD; }
      if (g.buildT <= 0) startWave();
      return;
    }
    if (g.phase !== 'wave') return;

    // ── Wave phase
    g.goldT += dt;
    if (g.goldT >= GOLD_TICK) { g.goldT -= GOLD_TICK; g.gold += 5; }

    // Spawn
    if (g.spawnQ.length > 0) {
      g.spawnT -= dt;
      if (g.spawnT <= 0) {
        g.spawnT = SPAWN_MS;
        const etype = g.spawnQ.shift()!;
        const def = EDEFS[etype];
        const [sx, sy] = wpXY(WP[0]);
        g.enemies.push({
          id: g.nextId++, type: etype, x: sx - CELL, y: sy,
          hp: def.hp, maxHp: def.hp, spd: def.spd, reward: def.reward,
          dmg: def.dmg, pi: 0, slowT: 0,
        });
      }
    }

    // Move enemies
    for (const e of g.enemies) {
      if (e.hp <= 0) continue;
      if (e.slowT > 0) e.slowT -= dt;
      const speed = (e.slowT > 0 ? e.spd * 0.5 : e.spd) * (dt / 16);
      const target = e.pi < WP.length ? WP[e.pi] : null;
      if (!target) {
        g.castleHp -= e.dmg;
        e.hp = 0;
        spawnPtcl(e.x, e.y, '#FF4444', 8);
        addFloat(e.x, e.y - 20, `-${e.dmg}`, '#FF5555');
        if (g.castleHp <= 0) { g.castleHp = 0; g.phase = 'defeat'; return; }
        continue;
      }
      const [tx, ty] = wpXY(target);
      const dx = tx - e.x, dy = ty - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 4) { e.pi++; } else { e.x += (dx/dist)*speed; e.y += (dy/dist)*speed; }
    }

    // Towers attack
    const now = Date.now();
    for (const t of g.towers) {
      const def = TDEFS[t.type];
      if (now - t.lastFired < def.cd) continue;
      const tx = t.gc * CELL + CELL / 2, ty = t.gr * CELL + CELL / 2;
      let closest: Enemy | null = null, minD = Infinity;
      for (const e of g.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - tx, dy = e.y - ty;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d <= def.range && d < minD) { closest = e; minD = d; }
      }
      if (!closest) continue;
      t.lastFired = now;
      if (t.type === 'guard') {
        closest.hp -= def.dmg;
        closest.slowT = 2000;
        spawnPtcl(closest.x, closest.y, '#FFFF88', 6);
        if (closest.hp <= 0) killEnemy(closest);
      } else {
        g.projs.push({
          id: g.nextId++, x: tx, y: ty, tx: closest.x, ty: closest.y, tid: closest.id,
          spd: def.ptype === 'arrow' ? 7 : def.ptype === 'bolt' ? 9 : 4,
          dmg: def.dmg, ptype: def.ptype, splash: def.splash,
        });
      }
    }

    // Move projectiles
    for (const p of g.projs) {
      const tgt = g.enemies.find(e => e.id === p.tid && e.hp > 0);
      if (tgt) { p.tx = tgt.x; p.ty = tgt.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= p.spd * 1.5) {
        if (p.splash > 0) {
          for (const e of g.enemies) {
            if (e.hp <= 0) continue;
            const ex = e.x - p.tx, ey = e.y - p.ty;
            if (Math.sqrt(ex*ex + ey*ey) <= p.splash) {
              e.hp -= p.dmg;
              if (e.hp <= 0) killEnemy(e);
            }
          }
          spawnPtcl(p.tx, p.ty, '#FF8C00', 14);
        } else if (tgt && tgt.hp > 0) {
          tgt.hp -= p.dmg;
          spawnPtcl(tgt.x, tgt.y, '#FFFFFF', 5);
          if (tgt.hp <= 0) killEnemy(tgt);
        }
        p.spd = -1; // mark dead
      } else {
        p.x += (dx/dist) * p.spd;
        p.y += (dy/dist) * p.spd;
      }
    }
    g.projs   = g.projs.filter(p => p.spd > 0);
    g.enemies = g.enemies.filter(e => e.hp > 0);

    // Check wave complete
    if (g.spawnQ.length === 0 && g.enemies.length === 0) {
      if (g.wave >= TOTAL_WAVES) {
        g.phase = 'victory';
      } else {
        g.phase  = 'build';
        g.buildT = BUILD_TIME;
        g.goldT  = 0;
        g.gold  += 50;
        addFloat(CW / 2, CH / 2, '+50💰 Волна пройдена!', '#FFD700');
      }
    }
  }

  // ── Render loop ───────────────────────────────────────────────────────────────
  const loop = useCallback((now: number) => {
    rafRef.current = requestAnimationFrame(loop);
    const dt = Math.min(now - lastT.current, 50);
    lastT.current = now;
    const g = gs.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (g.phase === 'build' || g.phase === 'wave') update(dt);

    // Particles & float texts
    for (const p of g.ptcls) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= dt / 700; }
    g.ptcls = g.ptcls.filter(p => p.life > 0);
    for (const f of g.ftexts) { f.y -= dt / 28; f.life -= dt / 1200; }
    g.ftexts = g.ftexts.filter(f => f.life > 0);

    // Draw
    drawBg(ctx);
    drawPath(ctx);
    drawCastle(ctx, g.castleHp);
    for (const t of g.towers) drawTower(ctx, t);
    if (g.phase === 'build' && g.hov) drawHover(ctx, g.hov, g.sel, g.gold);
    for (const e of g.enemies) drawEnemy(ctx, e);
    for (const p of g.projs) drawProj(ctx, p);

    // Particles
    for (const p of g.ptcls) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating texts
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of g.ftexts) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.font = 'bold 14px Georgia, serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    drawHUD(ctx, g);
    syncUI();
  }, [syncUI]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    lastT.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loop]);

  // ── Input ─────────────────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = gs.current;
    if (g.phase !== 'build') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top)  * (CH / rect.height);
    if (my < 36) return;
    const gc = Math.floor(mx / CELL), gr = Math.floor(my / CELL);
    if (!isBuildable(gc, gr)) return;
    if (g.towers.some(t => t.gc === gc && t.gr === gr)) return;
    const cost = TDEFS[g.sel].cost;
    if (g.gold < cost) return;
    g.gold -= cost;
    g.towers.push({ id: g.nextId++, type: g.sel, gc, gr, lastFired: 0 });
    syncUI();
  }, [syncUI]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top)  * (CH / rect.height);
    if (my < 36) { gs.current.hov = null; return; }
    gs.current.hov = [Math.floor(mx / CELL), Math.floor(my / CELL)];
  }, []);

  // ── UI actions ────────────────────────────────────────────────────────────────
  const startGame = () => {
    const g = INIT_GS();
    g.phase = 'build';
    g.sel = uiSel;
    gs.current = g;
    syncUI();
  };

  const selectTower = (t: TT) => {
    setUiSel(t);
    gs.current.sel = t;
  };

  const forceStartWave = () => {
    if (gs.current.phase === 'build') startWave();
  };

  // ── Screens ───────────────────────────────────────────────────────────────────
  if (uiPhase === 'menu') {
    return (
      <div className="sh-wrap">
        <div className="sh-screen">
          <div className="sh-screen-icon">⚔️</div>
          <h1 className="sh-screen-title">Крепость</h1>
          <p className="sh-screen-sub">Средневековая стратегия</p>
          <div className="sh-screen-rules">
            <p>🏰 Защити замок от волн врагов</p>
            <p>🏗️ Строй башни в фазу подготовки</p>
            <p>💰 Зарабатывай золото за убийства</p>
            <p>⚔️ Переживи {TOTAL_WAVES} волн нападений</p>
          </div>
          <div className="sh-screen-towers">
            {(Object.keys(TDEFS) as TT[]).map(t => (
              <div key={t} className="sh-tip-tower">
                <span>{TDEFS[t].emoji}</span>
                <span>{TDEFS[t].name} — {TDEFS[t].cost}💰</span>
              </div>
            ))}
          </div>
          <button className="sh-btn sh-btn-primary" onClick={startGame}>⚔️ Начать осаду</button>
          <button className="sh-btn sh-btn-secondary" onClick={onBack}>← Назад</button>
        </div>
      </div>
    );
  }

  if (uiPhase === 'victory') {
    return (
      <div className="sh-wrap">
        <div className="sh-screen sh-screen--victory">
          <div className="sh-screen-icon">🏆</div>
          <h1 className="sh-screen-title">Победа!</h1>
          <p>Крепость устояла! Враги разгромлены!</p>
          <p style={{ color: '#FFD700' }}>Здоровье замка: {uiHp}/100 🏰</p>
          <p style={{ color: '#FFD700' }}>Осталось золота: {uiGold} 💰</p>
          <button className="sh-btn sh-btn-primary" onClick={startGame}>🔄 Играть снова</button>
          <button className="sh-btn sh-btn-secondary" onClick={onBack}>← Назад</button>
        </div>
      </div>
    );
  }

  if (uiPhase === 'defeat') {
    return (
      <div className="sh-wrap">
        <div className="sh-screen sh-screen--defeat">
          <div className="sh-screen-icon">💀</div>
          <h1 className="sh-screen-title">Замок пал!</h1>
          <p>Враги прорвали оборону на волне {uiWave}</p>
          <button className="sh-btn sh-btn-primary" onClick={startGame}>🔄 Попробовать снова</button>
          <button className="sh-btn sh-btn-secondary" onClick={onBack}>← Назад</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-wrap">
      <div className="sh-layout">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="sh-canvas"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { gs.current.hov = null; }}
        />
        <div className="sh-panel">
          <div className="sh-panel-stats">
            <div className="sh-stat sh-stat--gold">💰 {uiGold}</div>
            <div className="sh-stat sh-stat--hp">🏰 {uiHp}/100</div>
            <div className="sh-stat sh-stat--wave">Волна {uiWave}/{TOTAL_WAVES}</div>
          </div>

          <div className="sh-panel-label">
            {uiPhase === 'build' ? '🏗️ Постройки' : '⚔️ Волна идёт...'}
          </div>

          {(Object.keys(TDEFS) as TT[]).map(type => {
            const def = TDEFS[type];
            const canAfford = uiGold >= def.cost;
            return (
              <button
                key={type}
                className={`sh-tower-btn${uiSel === type ? ' sh-tower-btn--sel' : ''}${!canAfford ? ' sh-tower-btn--cant' : ''}`}
                onClick={() => selectTower(type)}
                disabled={uiPhase !== 'build'}
              >
                <span className="sh-tower-emoji">{def.emoji}</span>
                <span className="sh-tower-info">
                  <span className="sh-tower-name">{def.name}</span>
                  <span className="sh-tower-desc">{def.desc}</span>
                  <span className="sh-tower-cost">{def.cost} 💰</span>
                </span>
              </button>
            );
          })}

          {uiPhase === 'build' && (
            <>
              <div className="sh-build-timer" style={{ color: uiBuild <= 5 ? '#FF6644' : '#FFCC44' }}>
                ⏱ До атаки: {uiBuild}с
              </div>
              <button className="sh-btn sh-btn-wave" onClick={forceStartWave}>
                ⚔️ Начать волну {uiWave + 1}
              </button>
            </>
          )}

          <div className="sh-divider" />

          <div className="sh-panel-label sh-panel-label--small">Враги</div>
          <div className="sh-enemy-list">
            <div className="sh-enemy-tip"><span style={{color:'#4CAF50'}}>●</span> Гоблин — быстрый</div>
            <div className="sh-enemy-tip"><span style={{color:'#FF5722'}}>●</span> Орк — танк</div>
            <div className="sh-enemy-tip"><span style={{color:'#9C27B0'}}>●</span> Тролль — очень живучий</div>
            <div className="sh-enemy-tip"><span style={{color:'#607D8B'}}>●</span> Таран — максимум хп</div>
          </div>

          <div className="sh-divider" />
          <button className="sh-btn sh-btn-secondary" onClick={onBack}>← Меню</button>
        </div>
      </div>
    </div>
  );
};

export default StrongholdGame;
