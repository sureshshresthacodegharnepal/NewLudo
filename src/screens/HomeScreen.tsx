import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Play,
  Settings,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  GameModePreset,
  PlayerStatistics,
  ScreenRoute,
} from '../models/gameModels';

interface HomeScreenProps {
  stats: PlayerStatistics;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  onStartMode: (mode: GameModePreset) => void;
  onNavigate: (route: ScreenRoute) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  stats,
  sfxEnabled,
  onToggleSfx,
  onStartMode,
  onNavigate,
}) => {
  const [orbitStep, setOrbitStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOrbitStep((prev) => (prev + 1) % 4);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        onStartMode(GameModePreset.VS_AI);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartMode]);

  const winRate =
    stats.totalGamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.totalGamesPlayed) * 100)
      : 0;

  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex flex-col justify-between relative overflow-hidden">
      {/* Top Perimeter Navigation Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-4 pb-2 flex items-center justify-between gap-8">
        <span className="font-display text-xl font-extrabold tracking-tight text-[#3B2313] whitespace-nowrap shrink-0">
          Royal Ludo
        </span>

        <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-[#4A2C14]">
          <button
            type="button"
            onClick={() => onNavigate('HOW_TO_PLAY')}
            className="hover:text-[#1F1005] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How to Play
          </button>
          <button
            type="button"
            onClick={() => onNavigate('STATISTICS')}
            className="hover:text-[#1F1005] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Statistics
          </button>
          <button
            type="button"
            onClick={() => onNavigate('SETTINGS')}
            className="hover:text-[#1F1005] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => onNavigate('ABOUT')}
            className="hover:text-[#1F1005] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Android Kotlin Project
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSfx}
            aria-label={sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            className="gold-circle-btn w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
          >
            {sfxEnabled ? (
              <Volume2 className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <VolumeX className="w-5 h-5 stroke-[2.5] opacity-70" />
            )}
          </button>
        </div>
      </header>

      {/* Main Split Hero Centerpiece */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center flex-1">
        {/* Left Column: Bespoke Neo Classic SVG Title Lockup, Start CTA & Mode Cards */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <svg
            viewBox="0 0 540 120"
            className="w-full max-w-[460px] h-auto mb-4 drop-shadow-sm"
            aria-label="Royal Ludo Neo Classic Edition"
          >
            {/* Carved Miniature Wooden Board Crest (Blue TL, Yellow TR, Red BL, Green BR) */}
            <g transform="translate(4, 14)">
              <rect
                x="-4"
                y="-4"
                width="96"
                height="96"
                rx="14"
                fill="#5C381C"
                stroke="#2C1A0E"
                strokeWidth="3"
              />
              <rect x="2" y="2" width="40" height="40" rx="8" fill="#1E5AA8" />
              <rect x="46" y="2" width="40" height="40" rx="8" fill="#E2A316" />
              <rect x="2" y="46" width="40" height="40" rx="8" fill="#C82E29" />
              <rect x="46" y="46" width="40" height="40" rx="8" fill="#267D39" />
              <circle
                cx="44"
                cy="44"
                r="14"
                fill="#FCF5E3"
                stroke="#3B2313"
                strokeWidth="3.5"
              />
              <circle cx="44" cy="44" r="5.5" fill="#C98A14" />
            </g>
            <text
              x="114"
              y="62"
              fill="#2C1A0E"
              fontSize="54"
              fontWeight="800"
              letterSpacing="-1"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              ROYAL LUDO
            </text>
            <text
              x="116"
              y="95"
              fill="#5C381C"
              fontSize="18"
              fontWeight="600"
              letterSpacing="0.3"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Neo Classic Wooden Board · Physical 3D Dice · Offline Play
            </text>
          </svg>

          <p className="text-[#3E2410] text-base leading-relaxed max-w-xl mb-7 font-medium">
            Experience classic tabletop Ludo crafted on natural maple &amp; carved walnut wood. Throw realistic 3D bouncing dice onto the center plinth, move glossy raised pieces, and compete offline in pass-and-play or against smart AI.
          </p>

          {/* Primary Play CTA + Pass & Play Setup */}
          <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto mb-8">
            <button
              type="button"
              onClick={() => onStartMode(GameModePreset.VS_AI)}
              className="gold-cta-btn min-h-[54px] px-8 py-3 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Play Game</span>
            </button>

            <button
              type="button"
              onClick={() => onStartMode(GameModePreset.TWO_PLAYER)}
              className="min-h-[54px] px-6 py-3 rounded-2xl wood-banner font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4 text-[#FFE699]" />
              <span>Pass &amp; Play Setup</span>
            </button>
          </div>

          {/* Select Game Mode Grid */}
          <div className="w-full max-w-xl">
            <div className="text-xs font-bold text-[#4A2C14] mb-2.5">
              Select Game Mode
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => onStartMode(GameModePreset.VS_AI)}
                className="min-h-[70px] p-3.5 rounded-2xl wood-card hover:brightness-[1.02] active:scale-[0.98] text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <Bot className="w-4 h-4 text-[#1E5AA8]" />
                <span className="text-sm font-bold text-[#2C1A0E] whitespace-nowrap">
                  Vs Computer
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartMode(GameModePreset.TWO_PLAYER)}
                className="min-h-[70px] p-3.5 rounded-2xl wood-card hover:brightness-[1.02] active:scale-[0.98] text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <Users className="w-4 h-4 text-[#267D39]" />
                <span className="text-sm font-bold text-[#2C1A0E] whitespace-nowrap">
                  2 Players
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartMode(GameModePreset.THREE_PLAYER)}
                className="min-h-[70px] p-3.5 rounded-2xl wood-card hover:brightness-[1.02] active:scale-[0.98] text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <Users className="w-4 h-4 text-[#B87D14]" />
                <span className="text-sm font-bold text-[#2C1A0E] whitespace-nowrap">
                  3 Players
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartMode(GameModePreset.FOUR_PLAYER)}
                className="min-h-[70px] p-3.5 rounded-2xl wood-card hover:brightness-[1.02] active:scale-[0.98] text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <Users className="w-4 h-4 text-[#C82E29]" />
                <span className="text-sm font-bold text-[#2C1A0E] whitespace-nowrap">
                  4 Players
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Golden Circular Utility Row */}
          <div className="flex items-center gap-3 mt-5 md:hidden">
            <button
              type="button"
              onClick={() => onNavigate('HOW_TO_PLAY')}
              aria-label="How to Play"
              className="gold-circle-btn w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
            >
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('STATISTICS')}
              aria-label="Statistics"
              className="gold-circle-btn w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
            >
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS')}
              aria-label="Settings"
              className="gold-circle-btn w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Settings className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ABOUT')}
              aria-label="Android Project"
              className="gold-circle-btn w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Neo Classic Wooden Board Showcase */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div
            onClick={() => onStartMode(GameModePreset.VS_AI)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onStartMode(GameModePreset.VS_AI);
            }}
            aria-label="Interactive Neo Classic wooden board preview — click to play"
            className="w-full max-w-[390px] aspect-square rounded-[28px] p-3.5 bg-gradient-to-b from-[#8A5A2B] to-[#563416] border-[3px] border-[#361E0B] shadow-[0_20px_42px_rgba(42,22,7,0.45)] cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <svg viewBox="0 0 300 300" className="w-full h-full rounded-2xl border-2 border-[#2B1709]">
              <rect x="0" y="0" width="300" height="300" fill="#FAF2DF" />

              {/* Neo Classic Corner Bases: Blue TL, Yellow TR, Red BL, Green BR */}
              <rect x="0" y="0" width="120" height="120" fill="#1E5AA8" stroke="#3B2313" strokeWidth="2" />
              <rect x="180" y="0" width="120" height="120" fill="#E2A316" stroke="#3B2313" strokeWidth="2" />
              <rect x="0" y="180" width="120" height="120" fill="#C82E29" stroke="#3B2313" strokeWidth="2" />
              <rect x="180" y="180" width="120" height="120" fill="#267D39" stroke="#3B2313" strokeWidth="2" />

              {/* Cream Rounded Interiors */}
              <rect x="18" y="18" width="84" height="84" rx="16" fill="#FCF5E3" stroke="#3B2313" strokeWidth="2" />
              <rect x="198" y="18" width="84" height="84" rx="16" fill="#FCF5E3" stroke="#3B2313" strokeWidth="2" />
              <rect x="18" y="198" width="84" height="84" rx="16" fill="#FCF5E3" stroke="#3B2313" strokeWidth="2" />
              <rect x="198" y="198" width="84" height="84" rx="16" fill="#FCF5E3" stroke="#3B2313" strokeWidth="2" />

              {/* Home Stretches */}
              <rect x="20" y="140" width="100" height="20" fill="#1E5AA8" stroke="#3B2313" strokeWidth="1.5" />
              <rect x="140" y="20" width="20" height="100" fill="#E2A316" stroke="#3B2313" strokeWidth="1.5" />
              <rect x="180" y="140" width="100" height="20" fill="#267D39" stroke="#3B2313" strokeWidth="1.5" />
              <rect x="140" y="180" width="20" height="100" fill="#C82E29" stroke="#3B2313" strokeWidth="1.5" />

              {/* Central 4-Color Finishing Triangles */}
              <polygon points="120,120 150,150 120,180" fill="#1E5AA8" stroke="#3B2313" strokeWidth="1.5" />
              <polygon points="120,120 180,120 150,150" fill="#E2A316" stroke="#3B2313" strokeWidth="1.5" />
              <polygon points="180,120 180,180 150,150" fill="#267D39" stroke="#3B2313" strokeWidth="1.5" />
              <polygon points="120,180 180,180 150,150" fill="#C82E29" stroke="#3B2313" strokeWidth="1.5" />
              <circle cx="150" cy="150" r="16" fill="#F6E9CE" stroke="#5C3818" strokeWidth="2" />

              {/* Miniature Resting Ivory Die in Center */}
              <rect x="140" y="140" width="20" height="20" rx="4" fill="#FFFDF8" stroke="#8C6223" strokeWidth="1.5" />
              <circle cx="146" cy="146" r="1.8" fill="#241409" />
              <circle cx="150" cy="150" r="1.8" fill="#241409" />
              <circle cx="154" cy="154" r="1.8" fill="#241409" />

              {/* Live Animated 3D-Style Showcase Tokens */}
              <g
                transform={`translate(${
                  orbitStep === 0 ? 50 : orbitStep === 1 ? 130 : orbitStep === 2 ? 130 : 90
                }, ${orbitStep === 0 ? 130 : orbitStep === 1 ? 90 : orbitStep === 2 ? 50 : 130})`}
              >
                <ellipse cx="1" cy="3" rx="9" ry="7" fill="rgba(36,18,5,0.38)" />
                <circle cx="0" cy="0" r="9.5" fill="#1E5AA8" stroke="#FFF9EB" strokeWidth="2" />
              </g>
              <g transform={`translate(130, ${orbitStep % 2 === 0 ? 230 : 210})`}>
                <ellipse cx="1" cy="3" rx="9" ry="7" fill="rgba(36,18,5,0.38)" />
                <circle cx="0" cy="0" r="9.5" fill="#C82E29" stroke="#FFF9EB" strokeWidth="2" />
              </g>
              <g transform="translate(230, 170)">
                <ellipse cx="1" cy="3" rx="9" ry="7" fill="rgba(36,18,5,0.38)" />
                <circle cx="0" cy="0" r="9.5" fill="#267D39" stroke="#FFF9EB" strokeWidth="2" />
              </g>
              <g transform="translate(170, 70)">
                <ellipse cx="1" cy="3" rx="9" ry="7" fill="rgba(36,18,5,0.38)" />
                <circle cx="0" cy="0" r="9.5" fill="#E2A316" stroke="#FFF9EB" strokeWidth="2" />
              </g>
            </svg>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs font-bold text-[#4A2C14] font-mono-num">
            <span>Matches {stats.totalGamesPlayed}</span>
            <span aria-hidden="true">·</span>
            <span>Wins {stats.gamesWon}</span>
            <span aria-hidden="true">·</span>
            <span>Win Rate {winRate}%</span>
            <span aria-hidden="true">·</span>
            <span>Best Streak {stats.bestWinStreak}</span>
          </div>
        </div>
      </main>

      {/* Single Flat Control-Hint Line */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 py-3 border-t border-[#7C5227]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold text-[#4A2C14]">
        <span>Space Roll Physical Dice · 1–4 Move Piece · Esc Pause</span>
        <span>100% Offline · Neo Classic Wooden Edition</span>
      </footer>
    </div>
  );
};
