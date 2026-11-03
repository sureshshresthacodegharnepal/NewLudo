import React, { useMemo, useState } from 'react';
import {
  COLOR_PALETTE,
  GridCoord,
  HOME_STRETCH_COORDS,
  MAIN_TRACK_COORDS,
  STAR_SAFE_INDICES,
  START_SAFE_INDICES,
  YARD_TOKEN_SLOTS,
  getProgressGridCoord,
  getTokenGridCoord,
} from '../engine/boardGeometry';
import {
  DiceRollState,
  GameState,
  LegalMove,
  PlayerColor,
  PlayerState,
  Token,
} from '../models/gameModels';
import { getEligibleShieldTokens } from '../engine/skillEngine';
import { BoardPhysicalDiceOverlay } from './DiceWidget';

interface AnimatingTokenOverride {
  tokenId: string;
  coord: GridCoord;
  hopScale: number;
}

export interface BoardParticleBurst {
  id: number;
  coord: GridCoord;
  colorHex: string;
  kind: 'capture' | 'home' | 'shield';
}

interface LudoBoardProps {
  gameState: GameState;
  animatingToken: AnimatingTokenOverride | null;
  particleBurst: BoardParticleBurst | null;
  shakeBoard: boolean;
  activeDiceRoll: DiceRollState | null;
  isDiceRolling: boolean;
  canRollDice: boolean;
  onTriggerDiceRoll: () => void;
  onDiceRollSettled: () => void;
  onSelectMove: (move: LegalMove) => void;
  onSelectShieldToken: (tokenId: string) => void;
}

const CELL = 100; // Symmetrical 15 * 100 = 1500x1500 SVG coordinate grid

function ClassicStar({
  cx,
  cy,
  r,
  fill,
  stroke = '#4A2C14',
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke?: string;
}) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return (
    <polygon
      points={points.join(' ')}
      fill={fill}
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  );
}

function computePlayerProgressPct(player: PlayerState | undefined): number {
  if (!player || player.tokens.length === 0) return 0;
  const maxSteps = player.tokens.length * 57;
  const currentSteps = player.tokens.reduce(
    (sum, t) => sum + (t.progress < 0 ? 0 : t.progress + 1),
    0
  );
  return Math.round((currentSteps / maxSteps) * 100);
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  animatingToken,
  particleBurst,
  shakeBoard,
  activeDiceRoll,
  isDiceRolling,
  canRollDice,
  onTriggerDiceRoll,
  onDiceRollSettled,
  onSelectMove,
  onSelectShieldToken,
}) => {
  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = activePlayer?.type === 'HUMAN';

  const legalMoveByTokenId = useMemo(() => {
    const map = new Map<string, LegalMove>();
    if (gameState.turnPhase === 'SELECTING_MOVE' && isHumanTurn) {
      for (const m of gameState.legalMoves) {
        map.set(m.tokenId, m);
      }
    }
    return map;
  }, [gameState.turnPhase, gameState.legalMoves, isHumanTurn]);

  const shieldEligibleSet = useMemo(() => {
    const set = new Set<string>();
    if (gameState.turnPhase === 'SELECTING_SHIELD_TOKEN' && isHumanTurn && activePlayer) {
      for (const t of getEligibleShieldTokens(activePlayer)) {
        set.add(t.id);
      }
    }
    return set;
  }, [gameState.turnPhase, isHumanTurn, activePlayer]);

  // Group overlapping tokens on shared track cells so they fan out cleanly
  const positionedTokens = useMemo(() => {
    const allTokens: Token[] = [];
    for (const p of gameState.players) {
      for (const t of p.tokens) {
        allTokens.push(t);
      }
    }

    const groups = new Map<string, Token[]>();
    for (const t of allTokens) {
      if (animatingToken && animatingToken.tokenId === t.id) {
        continue;
      }
      const c = getTokenGridCoord(t);
      const key =
        t.progress >= 0 && t.progress <= 55
          ? `${c.row.toFixed(1)}_${c.col.toFixed(1)}`
          : `unique_${t.id}`;
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }

    const result: Array<{
      token: Token;
      cx: number;
      cy: number;
      scale: number;
      isMovable: boolean;
      isShieldCandidate: boolean;
    }> = [];

    for (const [, list] of groups.entries()) {
      const count = list.length;
      list.forEach((t, idx) => {
        const baseCoord = getTokenGridCoord(t);
        let cx = (baseCoord.col + 0.5) * CELL;
        let cy = (baseCoord.row + 0.5) * CELL;
        let scale = 1;

        if (count > 1) {
          const radius = count === 2 ? 19 : 23;
          const angle = (2 * Math.PI * idx) / count - Math.PI / 4;
          cx += Math.cos(angle) * radius;
          cy += Math.sin(angle) * radius;
          scale = count >= 3 ? 0.78 : 0.85;
        } else if (t.progress === 56) {
          scale = 0.74;
        }

        result.push({
          token: t,
          cx,
          cy,
          scale,
          isMovable: legalMoveByTokenId.has(t.id),
          isShieldCandidate: shieldEligibleSet.has(t.id),
        });
      });
    }

    if (animatingToken) {
      const found = allTokens.find((t) => t.id === animatingToken.tokenId);
      if (found) {
        result.push({
          token: found,
          cx: (animatingToken.coord.col + 0.5) * CELL,
          cy: (animatingToken.coord.row + 0.5) * CELL,
          scale: animatingToken.hopScale,
          isMovable: false,
          isShieldCandidate: false,
        });
      }
    }

    return result.sort((a, b) => {
      const aInteractive = a.isMovable || a.isShieldCandidate ? 1 : 0;
      const bInteractive = b.isMovable || b.isShieldCandidate ? 1 : 0;
      if (aInteractive !== bInteractive) return aInteractive - bInteractive;
      return a.cy - b.cy;
    });
  }, [gameState.players, animatingToken, legalMoveByTokenId, shieldEligibleSet]);

  const previewMove = useMemo(() => {
    if (gameState.turnPhase !== 'SELECTING_MOVE' || !isHumanTurn) return null;
    if (hoveredTokenId && legalMoveByTokenId.has(hoveredTokenId)) {
      return legalMoveByTokenId.get(hoveredTokenId)!;
    }
    if (gameState.legalMoves.length === 1) {
      return gameState.legalMoves[0];
    }
    return null;
  }, [gameState.turnPhase, gameState.legalMoves, hoveredTokenId, legalMoveByTokenId, isHumanTurn]);

  const renderCornerHomeZone = (
    color: PlayerColor,
    startRow: number,
    startCol: number
  ) => {
    const pal = COLOR_PALETTE[color];
    const isActive = activePlayer?.color === color;
    const playerInGame = gameState.players.find((p) => p.color === color);
    const progressPct = computePlayerProgressPct(playerInGame);

    const x = startCol * CELL;
    const y = startRow * CELL;
    const size = 6 * CELL;

    return (
      <g key={`home-zone-${color}`}>
        {/* Colored Outer Home Zone */}
        <rect
          x={x}
          y={y}
          width={size}
          height={size}
          fill={`url(#zoneGrad-${color})`}
          stroke="#2F1B0C"
          strokeWidth="6"
        />

        {/* Subtle Inner Recessed Frame */}
        <rect
          x={x + 14}
          y={y + 14}
          width={size - 28}
          height={size - 28}
          rx="26"
          fill="none"
          stroke={isActive ? '#FFE58F' : 'rgba(255,248,230,0.28)'}
          strokeWidth={isActive ? '8' : '3'}
        />

        {/* Cream-Colored Rounded Square Interior */}
        <rect
          x={x + 74}
          y={y + 62}
          width={size - 148}
          height={size - 178}
          rx="44"
          fill="#FCF5E3"
          stroke="#3B2313"
          strokeWidth="5.5"
        />
        {/* Inner Soft Bevel Shadow inside Cream Court */}
        <rect
          x={x + 82}
          y={y + 70}
          width={size - 164}
          height={size - 194}
          rx="38"
          fill="none"
          stroke="rgba(92, 56, 24, 0.18)"
          strokeWidth="4"
        />

        {/* Four Circular Recessed Token Slots */}
        {YARD_TOKEN_SLOTS[color].map((slot, idx) => {
          const sx = (slot.col + 0.5) * CELL;
          const sy = (slot.row + 0.5) * CELL;
          const slotEnabled =
            playerInGame && idx < gameState.rules.tokensPerPlayer;

          return (
            <g key={`yard-slot-${color}-${idx}`}>
              {/* Recessed Socket Shadow */}
              <circle
                cx={sx}
                cy={sy + 3}
                r={41}
                fill="rgba(59, 35, 19, 0.18)"
              />
              <circle
                cx={sx}
                cy={sy}
                r={40}
                fill={slotEnabled ? '#F3E7CC' : '#E8DCC2'}
                stroke={slotEnabled ? pal.primary : '#C5B393'}
                strokeWidth="5.5"
              />
              <circle
                cx={sx}
                cy={sy}
                r={31}
                fill="none"
                stroke="rgba(59, 35, 19, 0.16)"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Symmetrical Player Name & Progress Percentage Plaque */}
        <rect
          x={x + 74}
          y={y + size - 92}
          width={size - 148}
          height={60}
          rx="18"
          fill="rgba(38, 20, 8, 0.34)"
          stroke="rgba(255, 245, 220, 0.38)"
          strokeWidth="2.5"
        />
        {playerInGame ? (
          <>
            <text
              x={x + 100}
              y={y + size - 54}
              textAnchor="start"
              fill="#FFFDF7"
              fontSize="26"
              fontWeight="700"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {playerInGame.name.slice(0, 11)}
            </text>
            <text
              x={x + size - 100}
              y={y + size - 54}
              textAnchor="end"
              fill="#FFE699"
              fontSize="25"
              fontWeight="700"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {progressPct}%
            </text>
          </>
        ) : (
          <text
            x={x + size / 2}
            y={y + size - 54}
            textAnchor="middle"
            fill="rgba(255,253,247,0.65)"
            fontSize="23"
            fontWeight="600"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Empty Seat
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      className={`relative w-full aspect-square max-w-[min(75dvh,650px)] mx-auto rounded-[22px] shadow-[0_18px_40px_rgba(42,22,7,0.42)] ${
        shakeBoard ? 'animate-board-shake' : ''
      }`}
    >
      <svg
        viewBox="-56 -56 1612 1612"
        className="w-full h-full rounded-[22px] overflow-hidden select-none touch-manipulation"
        role="img"
        aria-label="Neo Classic Wooden 15 by 15 Ludo Board"
      >
        <defs>
          {/* Rich Wooden Frame Gradients */}
          <linearGradient id="woodFrameHoriz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9A6735" />
            <stop offset="30%" stopColor="#7C4E23" />
            <stop offset="75%" stopColor="#633C19" />
            <stop offset="100%" stopColor="#4A2B10" />
          </linearGradient>
          <linearGradient id="woodFrameVert" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8E5D2E" />
            <stop offset="50%" stopColor="#6E441E" />
            <stop offset="100%" stopColor="#4D2D11" />
          </linearGradient>

          {/* Corner Zone Subtle Wood-Tinted Gradients & 3D Token Dome Gradients */}
          {(Object.keys(COLOR_PALETTE) as PlayerColor[]).map((color) => {
            const p = COLOR_PALETTE[color];
            return (
              <React.Fragment key={`defs-${color}`}>
                <linearGradient id={`zoneGrad-${color}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={p.highlight} stopOpacity="0.22" />
                  <stop offset="15%" stopColor={p.primary} />
                  <stop offset="100%" stopColor={p.dark} />
                </linearGradient>
                <radialGradient id={`pawnBody-${color}`} cx="34%" cy="30%" r="70%">
                  <stop offset="0%" stopColor={p.highlight} />
                  <stop offset="48%" stopColor={p.primary} />
                  <stop offset="100%" stopColor={p.dark} />
                </radialGradient>
              </React.Fragment>
            );
          })}
        </defs>

        {/* Outer Mitered Hardwood Frame (-56..1556) */}
        <g>
          {/* Top & Bottom Mitered Rails */}
          <polygon
            points="-56,-56 1556,-56 1500,0 0,0"
            fill="url(#woodFrameHoriz)"
            stroke="#2E1909"
            strokeWidth="3"
          />
          <polygon
            points="0,1500 1500,1500 1556,1556 -56,1556"
            fill="url(#woodFrameHoriz)"
            stroke="#2E1909"
            strokeWidth="3"
          />
          {/* Left & Right Mitered Stiles */}
          <polygon
            points="-56,-56 0,0 0,1500 -56,1556"
            fill="url(#woodFrameVert)"
            stroke="#2E1909"
            strokeWidth="3"
          />
          <polygon
            points="1556,-56 1556,1556 1500,1500 1500,0"
            fill="url(#woodFrameVert)"
            stroke="#2E1909"
            strokeWidth="3"
          />
          {/* Brass Corner Pins */}
          {[
            [-28, -28],
            [1528, -28],
            [-28, 1528],
            [1528, 1528],
          ].map(([bx, by], i) => (
            <circle
              key={`brass-${i}`}
              cx={bx}
              cy={by}
              r="9"
              fill="#E5B546"
              stroke="#4A2B10"
              strokeWidth="2.5"
            />
          ))}
          {/* Outer Specular Rim */}
          <rect
            x="-54"
            y="-54"
            width="1608"
            height="1608"
            rx="22"
            fill="none"
            stroke="rgba(255, 232, 190, 0.35)"
            strokeWidth="4"
          />
        </g>

        {/* Warm Cream & Beige Playing Surface (0..1500) */}
        <rect x="0" y="0" width="1500" height="1500" fill="#FAF2DF" />

        {/* 52-Cell Traditional Movement Track */}
        {MAIN_TRACK_COORDS.map((coord, idx) => {
          const startColor = START_SAFE_INDICES[idx];
          const isStarSafe = STAR_SAFE_INDICES.has(idx);
          const x = coord.col * CELL;
          const y = coord.row * CELL;
          const warmTone = (coord.row + coord.col) % 2 === 0 ? '#FDF7E7' : '#F4E8CD';
          const fill = startColor
            ? COLOR_PALETTE[startColor].primary
            : isStarSafe
              ? '#EAD7B3'
              : warmTone;

          return (
            <g key={`track-${idx}`}>
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                fill={fill}
                stroke="#3B2313"
                strokeWidth="4"
              />
              {startColor && (
                <ClassicStar
                  cx={x + 50}
                  cy={y + 50}
                  r={30}
                  fill="#FFF9EB"
                  stroke="rgba(45,25,10,0.45)"
                />
              )}
              {isStarSafe && (
                <ClassicStar
                  cx={x + 50}
                  cy={y + 50}
                  r={31}
                  fill="#C6933A"
                  stroke="#3B2313"
                />
              )}
            </g>
          );
        })}

        {/* Directional Home-Entry Arrows */}
        {/* Blue turns right at (7,0) */}
        <polygon points="30,732 70,750 30,768" fill={COLOR_PALETTE.BLUE.primary} />
        {/* Yellow turns down at (0,7) */}
        <polygon points="732,30 750,70 768,30" fill={COLOR_PALETTE.YELLOW.primary} />
        {/* Green turns left at (7,14) */}
        <polygon points="1470,732 1430,750 1470,768" fill={COLOR_PALETTE.GREEN.primary} />
        {/* Red turns up at (14,7) */}
        <polygon points="732,1470 750,1430 768,1470" fill={COLOR_PALETTE.RED.primary} />

        {/* Four Colored Home Paths (5 cells each) */}
        {(Object.keys(HOME_STRETCH_COORDS) as PlayerColor[]).map((color) =>
          HOME_STRETCH_COORDS[color].map((coord, stepIdx) => (
            <g key={`home-path-${color}-${stepIdx}`}>
              <rect
                x={coord.col * CELL}
                y={coord.row * CELL}
                width={CELL}
                height={CELL}
                fill={COLOR_PALETTE[color].primary}
                stroke="#3B2313"
                strokeWidth="4"
              />
              <rect
                x={coord.col * CELL + 8}
                y={coord.row * CELL + 8}
                width={CELL - 16}
                height={CELL - 16}
                rx="8"
                fill="none"
                stroke="rgba(255, 248, 228, 0.32)"
                strokeWidth="2.5"
              />
            </g>
          ))
        )}

        {/* Four Neo Classic Corner Home Areas:
            Blue: Top-left (0,0)
            Yellow: Top-right (0,9)
            Red: Bottom-left (9,0)
            Green: Bottom-right (9,9)
        */}
        {renderCornerHomeZone(PlayerColor.BLUE, 0, 0)}
        {renderCornerHomeZone(PlayerColor.YELLOW, 0, 9)}
        {renderCornerHomeZone(PlayerColor.RED, 9, 0)}
        {renderCornerHomeZone(PlayerColor.GREEN, 9, 9)}

        {/* Four-Color Central Finishing & Dice Area (600..900) */}
        <g>
          {/* Left Triangle: BLUE */}
          <polygon
            points="600,600 750,750 600,900"
            fill={COLOR_PALETTE.BLUE.primary}
            stroke="#3B2313"
            strokeWidth="5"
          />
          {/* Top Triangle: YELLOW */}
          <polygon
            points="600,600 900,600 750,750"
            fill={COLOR_PALETTE.YELLOW.primary}
            stroke="#3B2313"
            strokeWidth="5"
          />
          {/* Right Triangle: GREEN */}
          <polygon
            points="900,600 900,900 750,750"
            fill={COLOR_PALETTE.GREEN.primary}
            stroke="#3B2313"
            strokeWidth="5"
          />
          {/* Bottom Triangle: RED */}
          <polygon
            points="600,900 900,900 750,750"
            fill={COLOR_PALETTE.RED.primary}
            stroke="#3B2313"
            strokeWidth="5"
          />

          {/* Subtle Recessed Wooden Dice Plinth in the Center */}
          <circle
            cx="750"
            cy="750"
            r="84"
            fill="#F6E9CE"
            fillOpacity="0.92"
            stroke="#5C3818"
            strokeWidth="5"
          />
          <circle
            cx="750"
            cy="750"
            r="74"
            fill="none"
            stroke="#C89B43"
            strokeWidth="2.5"
            strokeDasharray="10 6"
          />
          <rect
            x="600"
            y="600"
            width="300"
            height="300"
            fill="none"
            stroke="#2F1B0C"
            strokeWidth="7"
          />
        </g>

        {/* Destination Trajectory Preview for Movable Tokens */}
        {previewMove && activePlayer && (
          <g pointerEvents="none">
            {(() => {
              const token = activePlayer.tokens.find(
                (t) => t.id === previewMove.tokenId
              );
              if (!token) return null;
              const fromCoord = getTokenGridCoord(token);
              const toCoord = getProgressGridCoord(
                activePlayer.color,
                previewMove.toProgress,
                token.tokenIndex
              );
              const fx = (fromCoord.col + 0.5) * CELL;
              const fy = (fromCoord.row + 0.5) * CELL;
              const tx = (toCoord.col + 0.5) * CELL;
              const ty = (toCoord.row + 0.5) * CELL;
              const isCapture = previewMove.willCaptureTokenIds.length > 0;

              return (
                <>
                  <line
                    x1={fx}
                    y1={fy}
                    x2={tx}
                    y2={ty}
                    stroke={isCapture ? '#B82520' : '#4A2C14'}
                    strokeWidth="6"
                    strokeDasharray="14 10"
                    opacity="0.72"
                  />
                  <circle
                    cx={tx}
                    cy={ty}
                    r={37}
                    fill={
                      isCapture
                        ? 'rgba(200, 46, 41, 0.24)'
                        : 'rgba(217, 155, 38, 0.25)'
                    }
                    stroke={isCapture ? '#B82520' : '#8C5B08'}
                    strokeWidth="5"
                    strokeDasharray="10 6"
                  />
                </>
              );
            })()}
          </g>
        )}

        {/* Realistic 3D-Style Circular Ludo Pieces */}
        {positionedTokens.map(
          ({ token, cx, cy, scale, isMovable, isShieldCandidate }) => {
            const pal = COLOR_PALETTE[token.ownerColor];
            const isShielded = token.shieldTurnsRemaining > 0;
            const interactive = isMovable || isShieldCandidate;

            return (
              <g
                key={token.id}
                transform={`translate(${cx}, ${cy}) scale(${scale})`}
                onClick={() => {
                  if (isShieldCandidate) {
                    onSelectShieldToken(token.id);
                  } else if (isMovable) {
                    const move = legalMoveByTokenId.get(token.id);
                    if (move) onSelectMove(move);
                  }
                }}
                onMouseEnter={() => {
                  if (interactive) setHoveredTokenId(token.id);
                }}
                onMouseLeave={() => {
                  if (hoveredTokenId === token.id) setHoveredTokenId(null);
                }}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
              >
                {/* Generous Mobile Touch Hitbox */}
                {interactive && (
                  <circle cx="0" cy="0" r="56" fill="transparent" />
                )}

                {/* Highlight Ring for Movable Tokens */}
                {isMovable && (
                  <g className="animate-token-ring">
                    <circle
                      cx="0"
                      cy="2"
                      r="47"
                      fill="rgba(245, 190, 56, 0.34)"
                      stroke="#C98A14"
                      strokeWidth="5.5"
                    />
                    <circle
                      cx="0"
                      cy="2"
                      r="53"
                      fill="none"
                      stroke="#FFF7D6"
                      strokeWidth="3"
                      strokeDasharray="12 8"
                    />
                  </g>
                )}

                {isShieldCandidate && (
                  <circle
                    cx="0"
                    cy="2"
                    r="48"
                    fill="rgba(56, 189, 248, 0.28)"
                    stroke="#0369A1"
                    strokeWidth="6"
                    strokeDasharray="10 6"
                  />
                )}

                {/* Soft Ground Contact & Cast Shadow */}
                <ellipse
                  cx="3"
                  cy="14"
                  rx="34"
                  ry="25"
                  fill="rgba(36, 18, 5, 0.42)"
                />

                {/* Raised 3D Cylindrical Skirt / Base */}
                <circle
                  cx="0"
                  cy="6"
                  r="34"
                  fill={pal.dark}
                  stroke="#2A1608"
                  strokeWidth="3.5"
                />

                {/* Upper Raised 3D Colored Body */}
                <circle
                  cx="0"
                  cy="-2"
                  r="33.5"
                  fill={`url(#pawnBody-${token.ownerColor})`}
                  stroke="#FFF9EB"
                  strokeWidth="3.5"
                />

                {/* Recessed Inner Brass/Cream Concentric Ring */}
                <circle
                  cx="0"
                  cy="-3"
                  r="22"
                  fill={pal.primary}
                  stroke="#FDF4DC"
                  strokeWidth="3"
                />

                {/* Inner Raised Button Cap */}
                <circle
                  cx="0"
                  cy="-4"
                  r="15"
                  fill={`url(#pawnBody-${token.ownerColor})`}
                />

                {/* Glossy Top-Left Specular Finish Arc */}
                <path
                  d="M -19 -16 A 24 24 0 0 1 14 -21"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.68)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="-8"
                  cy="-11"
                  rx="6"
                  ry="3.5"
                  transform="rotate(-28 -8 -11)"
                  fill="rgba(255, 255, 255, 0.52)"
                />

                {/* Subtle Token Identifier for Multi-Token Clarity */}
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#FFFDF7"
                  fontSize="17"
                  fontWeight="800"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {token.tokenIndex + 1}
                </text>

                {/* Active Shield Visual Dome */}
                {isShielded && (
                  <g pointerEvents="none">
                    <circle
                      cx="0"
                      cy="-1"
                      r="41"
                      fill="rgba(125, 211, 252, 0.22)"
                      stroke="#0284C7"
                      strokeWidth="4.5"
                    />
                    <circle
                      cx="26"
                      cy="-26"
                      r="13"
                      fill="#FDF8EC"
                      stroke="#0284C7"
                      strokeWidth="3"
                    />
                    <text
                      x="26"
                      y="-21"
                      textAnchor="middle"
                      fill="#0C4A6E"
                      fontSize="15"
                      fontWeight="800"
                    >
                      {token.shieldTurnsRemaining}
                    </text>
                  </g>
                )}
              </g>
            );
          }
        )}

        {/* Capture / Home Completion Burst */}
        {particleBurst && (
          <g
            transform={`translate(${(particleBurst.coord.col + 0.5) * CELL}, ${
              (particleBurst.coord.row + 0.5) * CELL
            })`}
            pointerEvents="none"
          >
            <circle
              cx="0"
              cy="0"
              r="56"
              fill="none"
              stroke={particleBurst.colorHex}
              strokeWidth="7"
              opacity="0.88"
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <circle
                  key={deg}
                  cx={Math.cos(rad) * 66}
                  cy={Math.sin(rad) * 66}
                  r="8.5"
                  fill={particleBurst.colorHex}
                />
              );
            })}
          </g>
        )}

        {/* Crisp Inner Wooden Board Border */}
        <rect
          x="0"
          y="0"
          width="1500"
          height="1500"
          fill="none"
          stroke="#2B1709"
          strokeWidth="9"
        />
      </svg>

      {/* Physical 3D Dice Rolling Directly Over the Wooden Board */}
      <BoardPhysicalDiceOverlay
        activeRoll={activeDiceRoll}
        isRolling={isDiceRolling}
        doubleDicePrimed={gameState.doubleDicePrimed}
        canRoll={canRollDice}
        activeColor={activePlayer.color}
        onTriggerRoll={onTriggerDiceRoll}
        onRollAnimationComplete={onDiceRollSettled}
      />
    </div>
  );
};
