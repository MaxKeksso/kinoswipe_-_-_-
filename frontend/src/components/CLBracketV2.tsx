import React, { useState } from 'react';
import './CLBracketV2.css';
import { BracketV2Stage, BracketV2Matchup } from '../api/api';

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_W    = 196;  // card width
const CARD_H    = 62;   // card height (2 × 31px team rows)
const GAP_H     = 22;   // vertical gap between cards in the same column
const SLOT_H    = CARD_H + GAP_H;   // 84 — height per bracket slot
const STAGE_W   = 250;  // horizontal space per stage (card + connector)
const HEADER_H  = 36;   // stage label height above the bracket

// ─── Stage metadata ──────────────────────────────────────────────────────────
const STAGE_ORDER = ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

const STAGE_LABELS: Record<string, string> = {
  LAST_16:        '1/8 финала',
  QUARTER_FINALS: '1/4 финала',
  SEMI_FINALS:    '1/2 финала',
  FINAL:          'Финал',
};

// ─── Y-coordinate for a card (top edge) ─────────────────────────────────────
// Stage 0 (R16, 8 slots): y = pos * 84
// Stage 1 (QF, 4 slots):  y = pos * 168 + 42   (midpoint of two R16 slots)
// Stage 2 (SF, 2 slots):  y = pos * 336 + 126
// Stage 3 (F,  1 slot):   y = 294
// General formula: y = pos * SLOT_H * 2^s + (2^s − 1) * SLOT_H / 2 + HEADER_H
function cardY(stageIdx: number, position: number): number {
  const mult = Math.pow(2, stageIdx);
  return position * SLOT_H * mult + (mult - 1) * SLOT_H / 2 + HEADER_H;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  stages: BracketV2Stage[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const CLBracketV2: React.FC<Props> = ({ stages }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  // Sort stages in canonical playoff order
  const sorted = [...stages].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
  );

  const nStages    = sorted.length;
  const totalW     = (nStages - 1) * STAGE_W + CARD_W;
  const totalH     = 8 * SLOT_H + HEADER_H + 4;

  // ── Build SVG connector lines ──────────────────────────────────────────────
  const lines: React.ReactNode[] = [];

  sorted.forEach((stage, si) => {
    if (si === nStages - 1) return; // final stage has no outgoing lines

    const nextStage    = sorted[si + 1];
    const cardRightX   = si * STAGE_W + CARD_W;
    const nextCardLeft = (si + 1) * STAGE_W;
    const midX         = (cardRightX + nextCardLeft) / 2;

    // Draw lines for each parent matchup in the next stage
    nextStage.matchups.forEach(parent => {
      const p   = parent.position;
      const c0  = stage.matchups.find(m => m.position === p * 2);
      const c1  = stage.matchups.find(m => m.position === p * 2 + 1);
      const pCY = cardY(si + 1, p) + CARD_H / 2;

      if (c0) {
        const c0CY = cardY(si, c0.position) + CARD_H / 2;
        lines.push(<line key={`lh0-${si}-${p}`} x1={cardRightX} y1={c0CY} x2={midX}        y2={c0CY} />);

        if (c1) {
          const c1CY = cardY(si, c1.position) + CARD_H / 2;
          lines.push(<line key={`lh1-${si}-${p}`} x1={cardRightX} y1={c1CY} x2={midX}        y2={c1CY} />);
          lines.push(<line key={`lv-${si}-${p}`}  x1={midX}       y1={c0CY} x2={midX}        y2={c1CY} />);
        }

        lines.push(<line key={`lhp-${si}-${p}`} x1={midX} y1={pCY} x2={nextCardLeft} y2={pCY} />);
      }
    });

    // Dashed stub for children whose parent doesn't exist yet
    stage.matchups.forEach(m => {
      const parentExists = nextStage.matchups.some(p => p.position === Math.floor(m.position / 2));
      if (parentExists) return;
      const cCY = cardY(si, m.position) + CARD_H / 2;
      lines.push(
        <line
          key={`stub-${si}-${m.position}`}
          x1={cardRightX} y1={cCY} x2={midX} y2={cCY}
          strokeDasharray="5 4"
        />,
      );
    });
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="clv2-scroll">
      <div className="clv2-wrap" style={{ width: totalW, height: totalH }}>

        {/* SVG connector lines */}
        <svg className="clv2-svg" width={totalW} height={totalH}>
          <g className="clv2-lines">{lines}</g>
        </svg>

        {/* Column headers */}
        {sorted.map((s, si) => (
          <div
            key={`hdr-${s.stage}`}
            className="clv2-header"
            style={{ left: si * STAGE_W, width: CARD_W }}
          >
            {STAGE_LABELS[s.stage] || s.stage}
          </div>
        ))}

        {/* Matchup cards */}
        {sorted.map((stage, si) =>
          stage.matchups.map(m => (
            <MatchupCard
              key={m.matchupId}
              matchup={m}
              x={si * STAGE_W}
              y={cardY(si, m.position)}
              isFinal={si === nStages - 1}
              isOpen={openId === m.matchupId}
              onToggle={() =>
                m.games.length > 0
                  ? setOpenId(openId === m.matchupId ? null : m.matchupId)
                  : undefined
              }
            />
          )),
        )}
      </div>
    </div>
  );
};

// ─── MatchupCard ─────────────────────────────────────────────────────────────
interface CardProps {
  matchup:  BracketV2Matchup;
  x:        number;
  y:        number;
  isFinal:  boolean;
  isOpen:   boolean;
  onToggle: () => void;
}

const MatchupCard: React.FC<CardProps> = ({ matchup, x, y, isFinal, isOpen, onToggle }) => {
  const played   = matchup.games.length > 0;
  const decided  = played && matchup.teams.some(t => t.isWinner);
  const teams    = matchup.teams.length >= 2
    ? matchup.teams
    : [{ name: '—', isWinner: false }, { name: '—', isWinner: false }];

  return (
    <div
      className={[
        'clv2-card',
        isFinal  ? 'clv2-card--final'   : '',
        isOpen   ? 'clv2-card--open'    : '',
        played   ? 'clv2-card--played'  : '',
      ].join(' ')}
      style={{ left: x, top: y, width: CARD_W }}
      onClick={onToggle}
      title={played ? 'Нажмите чтобы посмотреть матчи' : undefined}
    >
      {/* Team rows */}
      {teams.map((team, ti) => (
        <div
          key={ti}
          className={[
            'clv2-team',
            decided && team.isWinner  ? 'clv2-team--winner' : '',
            decided && !team.isWinner ? 'clv2-team--loser'  : '',
          ].join(' ')}
        >
          <span className="clv2-team-name">{team.name || '—'}</span>
          {played && (
            <span className={`clv2-score ${team.isWinner ? 'clv2-score--win' : ''}`}>
              {matchup.totalScore[ti]}
            </span>
          )}
        </div>
      ))}

      {/* Expandable game detail */}
      {isOpen && matchup.games.length > 0 && (
        <div className="clv2-detail">
          {matchup.games.map(g => (
            <div key={g.id} className="clv2-game">
              <span className="clv2-game-date">{g.date}{g.time ? ` · ${g.time} МСК` : ''}</span>
              <span className="clv2-game-line">
                {g.homeTeam}&nbsp;
                <strong>{g.homeScore}:{g.awayScore}</strong>
                &nbsp;{g.awayTeam}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
