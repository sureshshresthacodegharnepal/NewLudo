import React from 'react';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import { GameState } from '../models/gameModels';
import { COLOR_PALETTE } from '../engine/boardGeometry';

interface ResultScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onReturnHome: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  gameState,
  onPlayAgain,
  onReturnHome,
}) => {
  const orderedPlayers = gameState.rankings
    .map((color) => gameState.players.find((p) => p.color === color)!)
    .filter(Boolean);

  const winner = orderedPlayers[0] ?? gameState.players[0];
  const winnerPalette = COLOR_PALETTE[winner.color];

  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-2xl rounded-3xl wood-card p-6 sm:p-10 flex flex-col items-center text-center">
        {/* Golden & Winner Color Medallion */}
        <div
          className="w-20 h-20 rounded-full border-4 border-[#FFE484] flex items-center justify-center shadow-xl mb-5"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${winnerPalette.highlight}, ${winnerPalette.primary} 58%, ${winnerPalette.dark})`,
          }}
        >
          <Trophy className="w-10 h-10 text-[#FFFDF7]" />
        </div>

        <div className="text-xs font-bold text-[#6B4A2B] mb-1">
          Match Complete · {gameState.turnNumber} Turns Played
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#2C1A0E] mb-2">
          {winner.name} Wins!
        </h1>

        <p className="text-sm font-medium text-[#5C3D1E] max-w-md mb-8">
          All {winner.tokens.length} {winnerPalette.name.toLowerCase()} pieces reached the central finishing area.
        </p>

        {/* Rankings Table */}
        <div className="w-full rounded-2xl bg-[#F4E7CA] border-2 border-[#8C6239] overflow-hidden mb-8 text-left">
          <div className="grid grid-cols-12 px-4 py-3 border-b border-[#C5AB82] text-xs font-bold text-[#5C3D1E]">
            <div className="col-span-2">Rank</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-3 text-right">Home</div>
            <div className="col-span-2 text-right">Captures</div>
          </div>

          {orderedPlayers.map((player, index) => {
            const pal = COLOR_PALETTE[player.color];
            const homeCount = player.tokens.filter(
              (t) => t.progress === 56
            ).length;

            return (
              <div
                key={player.id}
                className="grid grid-cols-12 items-center px-4 py-3.5 border-b border-[#DFCCA8] last:border-none text-sm"
              >
                <div className="col-span-2 font-mono-num font-extrabold text-[#3B2313]">
                  #{index + 1}
                </div>
                <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full border border-[#2C1A0E]/40 shrink-0"
                    style={{ backgroundColor: pal.primary }}
                  />
                  <span className="font-bold text-[#2C1A0E] truncate">
                    {player.name}
                  </span>
                </div>
                <div className="col-span-3 text-right font-mono-num font-semibold text-[#4A2C14]">
                  {homeCount}/{player.tokens.length}
                </div>
                <div className="col-span-2 text-right font-mono-num font-semibold text-[#4A2C14]">
                  {player.capturesMade}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full">
          <button
            type="button"
            onClick={onPlayAgain}
            className="gold-cta-btn w-full sm:w-auto min-h-[50px] px-7 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="w-full sm:w-auto min-h-[50px] px-7 py-3 rounded-xl wood-banner font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
