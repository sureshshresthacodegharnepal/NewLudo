import React, { useState } from 'react';
import { ArrowLeft, Bot, Play, Shield, Sparkles, User } from 'lucide-react';
import {
  AiDifficulty,
  GameModePreset,
  GameRulesConfig,
  PlayerColor,
  PlayerSetupSlot,
  PlayerType,
} from '../models/gameModels';
import { COLOR_PALETTE } from '../engine/boardGeometry';

interface PlayerSetupScreenProps {
  initialMode: GameModePreset;
  defaultDifficulty: AiDifficulty;
  initialRules: GameRulesConfig;
  onBack: () => void;
  onStartMatch: (
    slots: PlayerSetupSlot[],
    mode: GameModePreset,
    rules: GameRulesConfig
  ) => void;
}

const ALL_COLORS: PlayerColor[] = [
  PlayerColor.BLUE,
  PlayerColor.YELLOW,
  PlayerColor.RED,
  PlayerColor.GREEN,
];

function buildPresetSlots(
  mode: GameModePreset,
  defaultDiff: AiDifficulty
): PlayerSetupSlot[] {
  if (mode === GameModePreset.TWO_PLAYER) {
    // Opposite corners on Neo Classic board: Blue (Top-Left) vs Green (Bottom-Right)
    return [
      {
        enabled: true,
        name: 'Player 1',
        color: PlayerColor.BLUE,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: true,
        name: 'Player 2',
        color: PlayerColor.GREEN,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: false,
        name: 'Player 3',
        color: PlayerColor.YELLOW,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: false,
        name: 'Player 4',
        color: PlayerColor.RED,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
    ];
  }

  if (mode === GameModePreset.THREE_PLAYER) {
    return [
      {
        enabled: true,
        name: 'Player 1',
        color: PlayerColor.BLUE,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: true,
        name: 'Player 2',
        color: PlayerColor.YELLOW,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: true,
        name: 'Player 3',
        color: PlayerColor.GREEN,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: false,
        name: 'Player 4',
        color: PlayerColor.RED,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
    ];
  }

  if (mode === GameModePreset.FOUR_PLAYER) {
    return [
      {
        enabled: true,
        name: 'Player 1',
        color: PlayerColor.BLUE,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: true,
        name: 'Player 2',
        color: PlayerColor.YELLOW,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: true,
        name: 'Player 3',
        color: PlayerColor.GREEN,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
      {
        enabled: true,
        name: 'Player 4',
        color: PlayerColor.RED,
        type: PlayerType.HUMAN,
        aiDifficulty: defaultDiff,
      },
    ];
  }

  // VS_AI default: You (Blue Top-Left) vs clockwise AI opponents
  return [
    {
      enabled: true,
      name: 'You',
      color: PlayerColor.BLUE,
      type: PlayerType.HUMAN,
      aiDifficulty: defaultDiff,
    },
    {
      enabled: true,
      name: 'Bot Yellow',
      color: PlayerColor.YELLOW,
      type: PlayerType.AI,
      aiDifficulty: defaultDiff,
    },
    {
      enabled: true,
      name: 'Bot Green',
      color: PlayerColor.GREEN,
      type: PlayerType.AI,
      aiDifficulty: defaultDiff,
    },
    {
      enabled: true,
      name: 'Bot Red',
      color: PlayerColor.RED,
      type: PlayerType.AI,
      aiDifficulty: defaultDiff,
    },
  ];
}

export const PlayerSetupScreen: React.FC<PlayerSetupScreenProps> = ({
  initialMode,
  defaultDifficulty,
  initialRules,
  onBack,
  onStartMatch,
}) => {
  const [mode, setMode] = useState<GameModePreset>(initialMode);
  const [slots, setSlots] = useState<PlayerSetupSlot[]>(() =>
    buildPresetSlots(initialMode, defaultDifficulty)
  );
  const [rules, setRules] = useState<GameRulesConfig>({ ...initialRules });

  const activeCount = slots.filter((s) => s.enabled).length;

  const handlePlayerCountChange = (count: 2 | 3 | 4) => {
    setSlots((prev) => {
      if (count === 2) {
        // Pair opposite corners (Blue & Green) for balanced 2-player play
        return [
          { ...prev[0], enabled: true, color: PlayerColor.BLUE },
          { ...prev[1], enabled: true, color: PlayerColor.GREEN },
          { ...prev[2], enabled: false, color: PlayerColor.YELLOW },
          { ...prev[3], enabled: false, color: PlayerColor.RED },
        ];
      }
      return prev.map((s, idx) => ({
        ...s,
        enabled: idx < count,
      }));
    });
    if (mode !== GameModePreset.VS_AI) {
      setMode(
        count === 2
          ? GameModePreset.TWO_PLAYER
          : count === 3
            ? GameModePreset.THREE_PLAYER
            : GameModePreset.FOUR_PLAYER
      );
    }
  };

  const handleModeSwitch = (nextMode: GameModePreset) => {
    setMode(nextMode);
    setSlots(buildPresetSlots(nextMode, defaultDifficulty));
  };

  const handleColorSelect = (slotIdx: number, newColor: PlayerColor) => {
    setSlots((prev) => {
      const currentColor = prev[slotIdx].color;
      if (currentColor === newColor) return prev;
      const otherIdx = prev.findIndex((s) => s.color === newColor);
      return prev.map((s, idx) => {
        if (idx === slotIdx) return { ...s, color: newColor };
        if (idx === otherIdx) return { ...s, color: currentColor };
        return s;
      });
    });
  };

  const entryPresetValue =
    rules.entryRolls.length === 2
      ? '1_6'
      : rules.entryRolls[0] === 6
        ? '6'
        : '1';

  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex flex-col">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Home"
          className="gold-circle-btn w-11 h-11 rounded-full flex items-center justify-center cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="wood-banner px-6 py-2 rounded-2xl">
          <h1 className="font-display text-lg font-bold text-[#FFFDF7] truncate">
            Match Setup
          </h1>
        </div>

        <div className="text-xs font-bold text-[#3B2313] font-mono-num whitespace-nowrap bg-[#FDF8EC]/85 px-3 py-1.5 rounded-xl border border-[#8C6239]">
          {activeCount}P · {rules.tokensPerPlayer} Tokens
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Mode, Players, Tokens & Rules */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-5 rounded-2xl wood-card">
            <h2 className="text-sm font-bold text-[#2C1A0E] mb-3">
              1. Game Mode
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: GameModePreset.VS_AI, label: 'Vs Computer (AI)' },
                  { id: GameModePreset.TWO_PLAYER, label: '2-Player Offline' },
                  { id: GameModePreset.THREE_PLAYER, label: '3-Player Offline' },
                  { id: GameModePreset.FOUR_PLAYER, label: '4-Player Offline' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeSwitch(item.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    mode === item.id
                      ? 'gold-cta-btn'
                      : 'bg-[#EFE3C8] hover:bg-[#E5D4B3] border border-[#9E784B] text-[#3B2313]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl wood-card flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#2C1A0E]">
                  2. Number of Players
                </span>
                <span className="text-xs text-[#6B4A2B]">Active corners</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#E8D8B9] rounded-xl border border-[#A88458]">
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handlePlayerCountChange(cnt)}
                    className={`min-h-[40px] rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeCount === cnt
                        ? 'gold-cta-btn'
                        : 'text-[#4A2C14] hover:text-[#2C1A0E]'
                    }`}
                  >
                    {cnt} Players
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#2C1A0E]">
                  3. Tokens per Player
                </span>
                <span className="text-xs text-[#6B4A2B]">
                  {rules.tokensPerPlayer === 2
                    ? 'Quick Match'
                    : rules.tokensPerPlayer === 3
                      ? 'Balanced'
                      : 'Traditional'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#E8D8B9] rounded-xl border border-[#A88458]">
                {([2, 3, 4] as const).map((tCount) => (
                  <button
                    key={tCount}
                    type="button"
                    onClick={() =>
                      setRules((r) => ({ ...r, tokensPerPlayer: tCount }))
                    }
                    className={`min-h-[40px] rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      rules.tokensPerPlayer === tCount
                        ? 'gold-cta-btn'
                        : 'text-[#4A2C14] hover:text-[#2C1A0E]'
                    }`}
                  >
                    {tCount} Tokens
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl wood-card flex flex-col gap-4">
            <h2 className="text-sm font-bold text-[#2C1A0E]">
              4. Board Rules &amp; Skills
            </h2>

            <div>
              <label className="block text-xs text-[#6B4A2B] mb-2">
                Starting Home Deployment Roll
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#E8D8B9] rounded-xl border border-[#A88458]">
                <button
                  type="button"
                  onClick={() =>
                    setRules((r) => ({
                      ...r,
                      entryRolls: [1],
                      extraTurnRolls: [1, 6],
                    }))
                  }
                  className={`min-h-[38px] px-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    entryPresetValue === '1'
                      ? 'gold-cta-btn'
                      : 'text-[#4A2C14]'
                  }`}
                >
                  Roll 1
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRules((r) => ({
                      ...r,
                      entryRolls: [6],
                      extraTurnRolls: [1, 6],
                    }))
                  }
                  className={`min-h-[38px] px-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    entryPresetValue === '6'
                      ? 'gold-cta-btn'
                      : 'text-[#4A2C14]'
                  }`}
                >
                  Roll 6
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRules((r) => ({
                      ...r,
                      entryRolls: [1, 6],
                      extraTurnRolls: [1, 6],
                    }))
                  }
                  className={`min-h-[38px] px-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    entryPresetValue === '1_6'
                      ? 'gold-cta-btn'
                      : 'text-[#4A2C14]'
                  }`}
                >
                  Roll 1 or 6
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#D6C29F]">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#1E5AA8] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#2C1A0E]">
                    Special Skills (Shield &amp; Double Dice)
                  </div>
                  <div className="text-[11px] text-[#6B4A2B]">
                    2 charges per player · 3-turn cooldown
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRules((r) => ({ ...r, enableSkills: !r.enableSkills }))
                }
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                  rules.enableSkills
                    ? 'gold-cta-btn'
                    : 'bg-[#E8D8B9] border-[#A88458] text-[#5C3D1E]'
                }`}
              >
                {rules.enableSkills ? 'Enabled' : 'Off'}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Player Roster */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[#2C1A0E]">
                Player Names, Corner Colors &amp; AI
              </h2>
              <span className="text-xs font-medium text-[#4A2C14]">
                Blue TL · Yellow TR · Red BL · Green BR
              </span>
            </div>

            {slots.map((slot, idx) => {
              if (!slot.enabled) return null;
              const pal = COLOR_PALETTE[slot.color];

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl wood-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    {/* 3D Token Preview Badge */}
                    <div
                      className="w-11 h-11 rounded-full border-2 border-[#FFFDF7] flex items-center justify-center font-mono-num font-bold text-white shrink-0 shadow-md"
                      style={{
                        background: `radial-gradient(circle at 32% 28%, ${pal.highlight}, ${pal.primary} 55%, ${pal.dark})`,
                      }}
                    >
                      P{idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        maxLength={16}
                        value={slot.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlots((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, name: val } : s
                            )
                          );
                        }}
                        placeholder={`Player ${idx + 1}`}
                        className="w-full bg-[#FFFDF8] border border-[#A88458] focus:border-[#5C381C] rounded-lg px-3 py-2 text-sm font-semibold text-[#2C1A0E] outline-none"
                      />

                      <div className="flex items-center gap-2.5 mt-2">
                        {ALL_COLORS.map((c) => {
                          const active = slot.color === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleColorSelect(idx, c)}
                              aria-label={`Select ${COLOR_PALETTE[c].name} color`}
                              className={`w-6 h-6 rounded-full transition-transform cursor-pointer border border-[#2C1A0E]/50 ${
                                active
                                  ? 'scale-115 ring-2 ring-[#5C381C] ring-offset-2 ring-offset-[#F9F1DF]'
                                  : 'opacity-55 hover:opacity-90'
                              }`}
                              style={{ backgroundColor: COLOR_PALETTE[c].primary }}
                            />
                          );
                        })}
                        <span className="text-xs font-semibold text-[#5C3D1E] ml-1">
                          {pal.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Human / Computer Toggle + Difficulty */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex p-1 bg-[#E8D8B9] rounded-xl border border-[#A88458]">
                      <button
                        type="button"
                        onClick={() =>
                          setSlots((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, type: PlayerType.HUMAN } : s
                            )
                          )
                        }
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          slot.type === PlayerType.HUMAN
                            ? 'gold-cta-btn'
                            : 'text-[#4A2C14]'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Human</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSlots((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, type: PlayerType.AI } : s
                            )
                          )
                        }
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          slot.type === PlayerType.AI
                            ? 'gold-cta-btn'
                            : 'text-[#4A2C14]'
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI</span>
                      </button>
                    </div>

                    {slot.type === PlayerType.AI && (
                      <div className="flex p-1 bg-[#E8D8B9] rounded-xl border border-[#A88458]">
                        {(
                          [
                            { id: AiDifficulty.EASY, label: 'Easy' },
                            { id: AiDifficulty.MEDIUM, label: 'Med' },
                            { id: AiDifficulty.HARD, label: 'Hard' },
                          ] as const
                        ).map((diff) => (
                          <button
                            key={diff.id}
                            type="button"
                            onClick={() =>
                              setSlots((prev) =>
                                prev.map((s, i) =>
                                  i === idx ? { ...s, aiDifficulty: diff.id } : s
                                )
                              )
                            }
                            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                              slot.aiDifficulty === diff.id
                                ? 'bg-[#5C381C] text-[#FFFDF7]'
                                : 'text-[#4A2C14]'
                            }`}
                          >
                            {diff.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-5 rounded-2xl wood-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs font-medium text-[#4A2C14]">
              <Sparkles className="w-4 h-4 text-[#B87D14] shrink-0" />
              <span>
                Physical 3D Dice · Raised Wooden Board · 100% Offline Play
              </span>
            </div>

            <button
              type="button"
              onClick={() => onStartMatch(slots, mode, rules)}
              className="gold-cta-btn w-full sm:w-auto min-h-[50px] px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Game</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
