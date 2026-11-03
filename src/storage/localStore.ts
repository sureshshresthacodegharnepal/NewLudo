import {
  AiDifficulty,
  AppSettings,
  DEFAULT_GAME_RULES,
  PlayerStatistics,
} from '../models/gameModels';

const STATS_KEY = 'royal_ludo_stats_v1';
const SETTINGS_KEY = 'royal_ludo_settings_v1';

export const INITIAL_STATISTICS: PlayerStatistics = {
  totalGamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  tokensCaptured: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  skillsActivated: 0,
};

export const INITIAL_SETTINGS: AppSettings = {
  sfxEnabled: true,
  musicEnabled: false,
  defaultDifficulty: AiDifficulty.MEDIUM,
  rules: { ...DEFAULT_GAME_RULES },
};

export function loadStatistics(): PlayerStatistics {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...INITIAL_STATISTICS };
    const parsed = JSON.parse(raw) as Partial<PlayerStatistics>;
    return {
      totalGamesPlayed: parsed.totalGamesPlayed ?? 0,
      gamesWon: parsed.gamesWon ?? 0,
      gamesLost: parsed.gamesLost ?? 0,
      tokensCaptured: parsed.tokensCaptured ?? 0,
      currentWinStreak: parsed.currentWinStreak ?? 0,
      bestWinStreak: parsed.bestWinStreak ?? 0,
      skillsActivated: parsed.skillsActivated ?? 0,
    };
  } catch {
    return { ...INITIAL_STATISTICS };
  }
}

export function saveStatistics(stats: PlayerStatistics): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

export function recordMatchResult(
  prev: PlayerStatistics,
  humanParticipated: boolean,
  humanWon: boolean,
  humanCaptures: number,
  humanSkillsUsed: number
): PlayerStatistics {
  const totalGamesPlayed = prev.totalGamesPlayed + 1;
  const tokensCaptured = prev.tokensCaptured + humanCaptures;
  const skillsActivated = prev.skillsActivated + humanSkillsUsed;

  if (!humanParticipated) {
    return {
      ...prev,
      totalGamesPlayed,
      tokensCaptured,
      skillsActivated,
    };
  }

  const gamesWon = prev.gamesWon + (humanWon ? 1 : 0);
  const gamesLost = prev.gamesLost + (humanWon ? 0 : 1);
  const currentWinStreak = humanWon ? prev.currentWinStreak + 1 : 0;
  const bestWinStreak = Math.max(prev.bestWinStreak, currentWinStreak);

  const next: PlayerStatistics = {
    totalGamesPlayed,
    gamesWon,
    gamesLost,
    tokensCaptured,
    currentWinStreak,
    bestWinStreak,
    skillsActivated,
  };
  saveStatistics(next);
  return next;
}

export function resetStatistics(): PlayerStatistics {
  const clean = { ...INITIAL_STATISTICS };
  saveStatistics(clean);
  return clean;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...INITIAL_SETTINGS, rules: { ...DEFAULT_GAME_RULES } };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      sfxEnabled: parsed.sfxEnabled ?? true,
      musicEnabled: parsed.musicEnabled ?? false,
      defaultDifficulty: parsed.defaultDifficulty ?? AiDifficulty.MEDIUM,
      rules: {
        ...DEFAULT_GAME_RULES,
        ...(parsed.rules ?? {}),
      },
    };
  } catch {
    return { ...INITIAL_SETTINGS, rules: { ...DEFAULT_GAME_RULES } };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}
