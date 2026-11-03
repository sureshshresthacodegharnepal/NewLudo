import { useCallback, useEffect, useState } from 'react';
import {
  AppSettings,
  GameModePreset,
  GameRulesConfig,
  GameState,
  PlayerSetupSlot,
  PlayerStatistics,
  ScreenRoute,
} from './models/gameModels';
import { createNewGameState } from './engine/gameEngine';
import { soundManager } from './audio/soundManager';
import {
  loadSettings,
  loadStatistics,
  recordMatchResult,
  resetStatistics,
  saveSettings,
} from './storage/localStore';
import { HomeScreen } from './screens/HomeScreen';
import { PlayerSetupScreen } from './screens/PlayerSetupScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { ResultScreen } from './screens/ResultScreen';
import {
  AboutAndroidScreen,
  HowToPlayScreen,
  SettingsScreen,
  StatisticsScreen,
} from './screens/InfoModals';

export default function App() {
  const [route, setRoute] = useState<ScreenRoute>('HOME');
  const [returnRouteAfterRules, setReturnRouteAfterRules] =
    useState<ScreenRoute>('HOME');

  const [selectedPreset, setSelectedPreset] = useState<GameModePreset>(
    GameModePreset.VS_AI
  );
  const [lastMatchSetup, setLastMatchSetup] = useState<{
    slots: PlayerSetupSlot[];
    mode: GameModePreset;
    rules: GameRulesConfig;
  } | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [stats, setStats] = useState<PlayerStatistics>(() => loadStatistics());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    soundManager.configure(settings.sfxEnabled, settings.musicEnabled);
  }, [settings.sfxEnabled, settings.musicEnabled]);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
    soundManager.configure(next.sfxEnabled, next.musicEnabled);
  }, []);

  const handleToggleSfx = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, sfxEnabled: !prev.sfxEnabled };
      saveSettings(next);
      soundManager.setSfxEnabled(next.sfxEnabled);
      if (next.sfxEnabled) soundManager.playClick();
      return next;
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, musicEnabled: !prev.musicEnabled };
      saveSettings(next);
      soundManager.setMusicEnabled(next.musicEnabled);
      return next;
    });
  }, []);

  const handleOpenModeSetup = useCallback((mode: GameModePreset) => {
    soundManager.playClick();
    setSelectedPreset(mode);
    setRoute('PLAYER_SETUP');
  }, []);

  const handleStartMatch = useCallback(
    (
      slots: PlayerSetupSlot[],
      mode: GameModePreset,
      rules: GameRulesConfig
    ) => {
      soundManager.playClick();
      setLastMatchSetup({ slots, mode, rules });
      const freshState = createNewGameState(slots, mode, rules);
      setGameState(freshState);
      setRoute('GAMEPLAY');
    },
    []
  );

  const handleRestartCurrentMatch = useCallback(() => {
    if (!lastMatchSetup) return;
    soundManager.playClick();
    const freshState = createNewGameState(
      lastMatchSetup.slots,
      lastMatchSetup.mode,
      lastMatchSetup.rules
    );
    setGameState(freshState);
    setRoute('GAMEPLAY');
  }, [lastMatchSetup]);

  const handleGameFinished = useCallback((finalState: GameState) => {
    setGameState(finalState);

    const humans = finalState.players.filter((p) => p.type === 'HUMAN');
    const humanParticipated = humans.length > 0;
    const humanWon = humans.some((h) => h.color === finalState.winnerColor);
    const totalHumanCaptures = humans.reduce(
      (sum, h) => sum + h.capturesMade,
      0
    );
    const totalHumanSkills = humans.reduce((sum, h) => sum + h.skillsUsed, 0);

    setStats((prev) =>
      recordMatchResult(
        prev,
        humanParticipated,
        humanWon,
        totalHumanCaptures,
        totalHumanSkills
      )
    );
    setRoute('RESULT');
  }, []);

  const handleNavigate = useCallback((target: ScreenRoute) => {
    soundManager.playClick();
    if (target === 'HOW_TO_PLAY') {
      setReturnRouteAfterRules('HOME');
    }
    setRoute(target);
  }, []);

  if (route === 'PLAYER_SETUP') {
    return (
      <PlayerSetupScreen
        initialMode={selectedPreset}
        defaultDifficulty={settings.defaultDifficulty}
        initialRules={settings.rules}
        onBack={() => {
          soundManager.playClick();
          setRoute('HOME');
        }}
        onStartMatch={handleStartMatch}
      />
    );
  }

  if (route === 'GAMEPLAY' && gameState) {
    return (
      <GameplayScreen
        gameState={gameState}
        sfxEnabled={settings.sfxEnabled}
        musicEnabled={settings.musicEnabled}
        onUpdateGameState={setGameState}
        onGameFinished={handleGameFinished}
        onToggleSfx={handleToggleSfx}
        onToggleMusic={handleToggleMusic}
        onRestartMatch={handleRestartCurrentMatch}
        onOpenRules={() => {
          setReturnRouteAfterRules('GAMEPLAY');
          setRoute('HOW_TO_PLAY');
        }}
        onExitHome={() => {
          soundManager.playClick();
          setRoute('HOME');
        }}
      />
    );
  }

  if (route === 'RESULT' && gameState) {
    return (
      <ResultScreen
        gameState={gameState}
        onPlayAgain={handleRestartCurrentMatch}
        onReturnHome={() => {
          soundManager.playClick();
          setRoute('HOME');
        }}
      />
    );
  }

  if (route === 'HOW_TO_PLAY') {
    return (
      <HowToPlayScreen
        onBack={() => {
          soundManager.playClick();
          setRoute(returnRouteAfterRules);
        }}
      />
    );
  }

  if (route === 'STATISTICS') {
    return (
      <StatisticsScreen
        stats={stats}
        onResetStats={() => setStats(resetStatistics())}
        onBack={() => {
          soundManager.playClick();
          setRoute('HOME');
        }}
      />
    );
  }

  if (route === 'SETTINGS') {
    return (
      <SettingsScreen
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onBack={() => {
          soundManager.playClick();
          setRoute('HOME');
        }}
      />
    );
  }

  if (route === 'ABOUT') {
    return (
      <AboutAndroidScreen
        onBack={() => {
          soundManager.playClick();
          setRoute('HOME');
        }}
      />
    );
  }

  return (
    <HomeScreen
      stats={stats}
      sfxEnabled={settings.sfxEnabled}
      onToggleSfx={handleToggleSfx}
      onStartMode={handleOpenModeSetup}
      onNavigate={handleNavigate}
    />
  );
}
