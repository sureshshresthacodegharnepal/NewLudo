import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Dices,
  FolderTree,
  Music,
  RotateCcw,
  Shield,
  Star,
  Trophy,
  Volume2,
} from 'lucide-react';
import {
  AiDifficulty,
  AppSettings,
  PlayerStatistics,
} from '../models/gameModels';

interface SubScreenHeaderProps {
  title: string;
  onBack: () => void;
}

const SubScreenHeader: React.FC<SubScreenHeaderProps> = ({ title, onBack }) => (
  <header className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="gold-circle-btn w-11 h-11 rounded-full flex items-center justify-center cursor-pointer shrink-0"
    >
      <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
    </button>
    <div className="wood-banner px-6 py-2 rounded-2xl">
      <h1 className="font-display text-lg font-bold text-[#FFFDF7] truncate">
        {title}
      </h1>
    </div>
    <div className="w-11" />
  </header>
);

export const HowToPlayScreen: React.FC<{ onBack: () => void }> = ({
  onBack,
}) => {
  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex flex-col">
      <SubScreenHeader title="How to Play" onBack={onBack} />

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-6 rounded-2xl wood-card flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-[#2C1A0E]">
            01. Traditional Rules &amp; Physical Dice
          </h2>
          <ul className="space-y-2.5 text-sm text-[#4A2C14] leading-relaxed">
            <li>
              <strong className="text-[#2C1A0E]">Physical 3D Dice:</strong> Tap the central dice on the board or the golden dice button to throw a physical 3D cube onto the wooden board.
            </li>
            <li>
              <strong className="text-[#2C1A0E]">Starting Deployment:</strong> Roll a{' '}
              <span className="font-mono-num font-bold text-[#2C1A0E]">1</span> (configurable to 6 or 1/6) to deploy a piece from your corner home onto your starting cell.
            </li>
            <li>
              <strong className="text-[#2C1A0E]">Bonus Turns:</strong> Rolling a{' '}
              <span className="font-mono-num font-bold text-[#2C1A0E]">6</span> or{' '}
              <span className="font-mono-num font-bold text-[#2C1A0E]">1</span>, capturing an opponent piece, or reaching the center grants another roll.
            </li>
            <li>
              <strong className="text-[#2C1A0E]">Exact Finish:</strong> Roll the exact remaining steps to enter the four-color central finishing triangle.
            </li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl wood-card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#B87D14]" />
            <h2 className="font-display text-lg font-bold text-[#2C1A0E]">
              02. Corner Zones &amp; Safe Stars
            </h2>
          </div>
          <ul className="space-y-2.5 text-sm text-[#4A2C14] leading-relaxed">
            <li>
              <strong className="text-[#2C1A0E]">Corner Home Layout:</strong> Blue sits top-left, Yellow top-right, Red bottom-left, and Green bottom-right, each tracking live player progress percentage.
            </li>
            <li>
              <strong className="text-[#2C1A0E]">8 Safe Squares:</strong> The 4 colored starting squares and 4 star-marked squares protect pieces from capture.
            </li>
            <li>
              <strong className="text-[#2C1A0E]">Captures:</strong> Landing on an unprotected opponent piece sends it back to its corner home.
            </li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl wood-card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1E5AA8]" />
            <h2 className="font-display text-lg font-bold text-[#2C1A0E]">
              03. Skill: Aegis Shield
            </h2>
          </div>
          <p className="text-sm text-[#4A2C14] leading-relaxed">
            Protects one of your active pieces on the shared track from capture for{' '}
            <span className="font-mono-num font-bold text-[#2C1A0E]">3 full rounds</span>. Limited to 2 charges per match with a 3-turn cooldown.
          </p>
        </section>

        <section className="p-6 rounded-2xl wood-card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-[#B87D14]" />
            <h2 className="font-display text-lg font-bold text-[#2C1A0E]">
              04. Skill: Double Dice
            </h2>
          </div>
          <p className="text-sm text-[#4A2C14] leading-relaxed">
            Activate before rolling to throw{' '}
            <span className="font-mono-num font-bold text-[#2C1A0E]">two 3D golden dice</span> onto the board simultaneously for combined movement distance or base deployment plus bonus steps.
          </p>
        </section>
      </main>
    </div>
  );
};

export const StatisticsScreen: React.FC<{
  stats: PlayerStatistics;
  onResetStats: () => void;
  onBack: () => void;
}> = ({ stats, onResetStats, onBack }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const winPct =
    stats.totalGamesPlayed > 0
      ? ((stats.gamesWon / stats.totalGamesPlayed) * 100).toFixed(1)
      : '0.0';

  const statItems = [
    { label: 'Total Games Played', value: `${stats.totalGamesPlayed}` },
    { label: 'Games Won', value: `${stats.gamesWon}` },
    { label: 'Games Lost', value: `${stats.gamesLost}` },
    { label: 'Win Percentage', value: `${winPct}%` },
    { label: 'Tokens Captured', value: `${stats.tokensCaptured}` },
    { label: 'Best Winning Streak', value: `${stats.bestWinStreak}` },
  ];

  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex flex-col">
      <SubScreenHeader title="Career Statistics" onBack={onBack} />

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="p-5 rounded-2xl wood-card flex flex-col justify-between gap-2"
            >
              <span className="text-xs font-semibold text-[#6B4A2B]">
                {item.label}
              </span>
              <span className="font-display font-mono-num text-3xl font-extrabold text-[#2C1A0E]">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl wood-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[#B87D14] shrink-0" />
            <div className="text-sm font-medium text-[#4A2C14]">
              Active Streak:{' '}
              <span className="font-mono-num font-bold text-[#2C1A0E]">
                {stats.currentWinStreak}
              </span>{' '}
              · Skills Used:{' '}
              <span className="font-mono-num font-bold text-[#2C1A0E]">
                {stats.skillsActivated}
              </span>
            </div>
          </div>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[42px] px-4 rounded-xl bg-[#E8D8B9] hover:bg-[#DFCBA6] border border-[#9E784B] text-xs font-bold text-[#3B2313] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Statistics</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetStats();
                  setConfirmReset(false);
                }}
                className="min-h-[42px] px-4 rounded-xl bg-[#C82E29] text-xs font-bold text-white cursor-pointer whitespace-nowrap"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[42px] px-3 rounded-xl bg-[#E8D8B9] border border-[#9E784B] text-xs font-bold text-[#3B2313] cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export const SettingsScreen: React.FC<{
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onBack: () => void;
}> = ({ settings, onUpdateSettings, onBack }) => {
  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex flex-col">
      <SubScreenHeader title="Game Settings" onBack={onBack} />

      <main className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
        <section className="p-6 rounded-2xl wood-card flex flex-col gap-5">
          <h2 className="font-display text-base font-bold text-[#2C1A0E]">
            Audio &amp; Tabletop Sound
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#4A2C14]" />
              <div>
                <div className="text-sm font-bold text-[#2C1A0E]">
                  Sound Effects (SFX)
                </div>
                <div className="text-xs text-[#6B4A2B]">
                  Physical wooden dice bounces, pawn taps, and fanfare
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  sfxEnabled: !settings.sfxEnabled,
                })
              }
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                settings.sfxEnabled
                  ? 'gold-cta-btn'
                  : 'bg-[#E8D8B9] border-[#A88458] text-[#5C3D1E]'
              }`}
            >
              {settings.sfxEnabled ? 'On' : 'Muted'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#D6C29F]">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-[#4A2C14]" />
              <div>
                <div className="text-sm font-bold text-[#2C1A0E]">
                  Background Music
                </div>
                <div className="text-xs text-[#6B4A2B]">
                  Gentle acoustic tabletop melody
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  musicEnabled: !settings.musicEnabled,
                })
              }
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                settings.musicEnabled
                  ? 'gold-cta-btn'
                  : 'bg-[#E8D8B9] border-[#A88458] text-[#5C3D1E]'
              }`}
            >
              {settings.musicEnabled ? 'Playing' : 'Off'}
            </button>
          </div>
        </section>

        <section className="p-6 rounded-2xl wood-card flex flex-col gap-5">
          <h2 className="font-display text-base font-bold text-[#2C1A0E]">
            Default Match Preferences
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-[#2C1A0E]">
                Default AI Difficulty
              </div>
              <div className="text-xs text-[#6B4A2B]">
                Preselected computer skill tier on match setup
              </div>
            </div>
            <div className="flex p-1 bg-[#E8D8B9] rounded-xl border border-[#A88458]">
              {(
                [
                  AiDifficulty.EASY,
                  AiDifficulty.MEDIUM,
                  AiDifficulty.HARD,
                ] as const
              ).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, defaultDifficulty: diff })
                  }
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    settings.defaultDifficulty === diff
                      ? 'gold-cta-btn'
                      : 'text-[#4A2C14]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#D6C29F]">
            <div>
              <div className="text-sm font-bold text-[#2C1A0E]">
                Bonus Turn on Opponent Capture
              </div>
              <div className="text-xs text-[#6B4A2B]">
                Grants an extra roll immediately after capturing
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  rules: {
                    ...settings.rules,
                    bonusTurnOnCapture: !settings.rules.bonusTurnOnCapture,
                  },
                })
              }
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                settings.rules.bonusTurnOnCapture
                  ? 'gold-cta-btn'
                  : 'bg-[#E8D8B9] border-[#A88458] text-[#5C3D1E]'
              }`}
            >
              {settings.rules.bonusTurnOnCapture ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

const ANDROID_MODULES = [
  {
    path: 'android/app/build.gradle.kts',
    role: 'Gradle module setup targeting Android 8.0+ (API 26), Kotlin 2.0, Jetpack Compose BOM, Navigation, ViewModel, and DataStore Preferences.',
  },
  {
    path: 'android/app/src/main/java/com/royalludo/game/model/GameModels.kt',
    role: 'Immutable data classes & Neo Classic pigments for Blue, Yellow, Red, and Green players.',
  },
  {
    path: 'android/app/src/main/java/com/royalludo/game/rules/LudoRulesEngine.kt',
    role: '15x15 BoardGeometry mapping Blue (TL), Yellow (TR), Red (BL), Green (BR), 52 shared track cells, 8 safe zones, and exact finish validation.',
  },
  {
    path: 'android/app/src/main/java/com/royalludo/game/ui/components/LudoBoardCanvas.kt',
    role: 'Neo Classic Wooden Jetpack Compose Canvas rendering carved wooden bevels, cream interiors, 3D shaded tokens, and physical center dice bounce.',
  },
  {
    path: 'android/app/src/main/java/com/royalludo/game/viewmodel/LudoViewModel.kt',
    role: 'MVVM StateFlow ViewModel coordinating single-source dice roll generation, physical roll duration lock, AI turns, and DataStore stats.',
  },
];

const APK_BUILD_COMMANDS = `cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.royalludo.game/.MainActivity`;

export const AboutAndroidScreen: React.FC<{ onBack: () => void }> = ({
  onBack,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCommands = () => {
    navigator.clipboard?.writeText(APK_BUILD_COMMANDS).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="min-h-dvh w-full wood-tabletop text-[#2C1A0E] flex flex-col">
      <SubScreenHeader title="Android Kotlin Architecture" onBack={onBack} />

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
        <section className="p-6 rounded-2xl wood-card flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-[#2C1A0E]">
            Neo Classic Wooden Ludo · Interactive &amp; Android Jetpack Compose
          </h2>
          <p className="text-sm text-[#4A2C14] leading-relaxed">
            Both the interactive web experience and the native Android{' '}
            <strong className="text-[#2C1A0E]">Kotlin + Jetpack Compose + MVVM</strong>{' '}
            source files in <span className="font-mono-num font-bold">/android</span> implement the Neo Classic Wooden Board, Blue/Yellow/Red/Green corner homes, 3D raised tokens, and single-source physical dice rolling.
          </p>
        </section>

        <section className="p-6 rounded-2xl wood-card flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-bold text-[#2C1A0E]">
              Building &amp; Running the Android APK
            </h2>
            <button
              type="button"
              onClick={handleCopyCommands}
              className="gold-cta-btn min-h-[38px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Commands</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-[#38210E] border border-[#6E441E] text-xs font-mono-num text-[#FDF5E2] overflow-x-auto leading-relaxed">
            {APK_BUILD_COMMANDS}
          </pre>
        </section>

        <section className="p-6 rounded-2xl wood-card flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#8C5B08]" />
            <h2 className="font-display text-base font-bold text-[#2C1A0E]">
              Core Android Modules (/android)
            </h2>
          </div>

          <div className="divide-y divide-[#D6C29F]">
            {ANDROID_MODULES.map((mod) => (
              <div key={mod.path} className="py-3 first:pt-0 last:pb-0">
                <div className="font-mono-num text-xs font-bold text-[#1E5AA8] break-all">
                  {mod.path}
                </div>
                <p className="text-xs text-[#4A2C14] mt-1 leading-relaxed">
                  {mod.role}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
