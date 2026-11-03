import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Dices,
  Home,
  Music,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  DiceRollState,
  GameState,
  LegalMove,
  SkillId,
} from '../models/gameModels';
import {
  COLOR_PALETTE,
  GridCoord,
  getProgressGridCoord,
  getStepPathCoords,
} from '../engine/boardGeometry';
import { generateDiceRoll } from '../engine/diceSystem';
import {
  activateDoubleDiceSkill,
  advanceTurn,
  applySelectedMove,
  applyShieldSkillToToken,
  cancelShieldTokenSelection,
  commitDiceRoll,
  startShieldTokenSelection,
} from '../engine/gameEngine';
import {
  getEligibleShieldTokens,
  validateSkillActivation,
} from '../engine/skillEngine';
import { decideAiPreRollAction, selectAiMove } from '../engine/aiEngine';
import { soundManager } from '../audio/soundManager';
import { BoardParticleBurst, LudoBoard } from '../components/LudoBoard';
import { DiceWidget } from '../components/DiceWidget';

interface GameplayScreenProps {
  gameState: GameState;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  onUpdateGameState: (next: GameState) => void;
  onGameFinished: (finalState: GameState) => void;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onRestartMatch: () => void;
  onOpenRules: () => void;
  onExitHome: () => void;
}

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  gameState,
  sfxEnabled,
  musicEnabled,
  onUpdateGameState,
  onGameFinished,
  onToggleSfx,
  onToggleMusic,
  onRestartMatch,
  onOpenRules,
  onExitHome,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRollingAnim, setIsRollingAnim] = useState(false);
  const [pendingDiceRoll, setPendingDiceRoll] = useState<DiceRollState | null>(
    null
  );
  const [animatingToken, setAnimatingToken] = useState<{
    tokenId: string;
    coord: GridCoord;
    hopScale: number;
  } | null>(null);
  const [particleBurst, setParticleBurst] = useState<BoardParticleBurst | null>(
    null
  );
  const [shakeBoard, setShakeBoard] = useState(false);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const pendingRollRef = useRef<DiceRollState | null>(null);
  const isAnimatingRef = useRef(false);

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const activePalette = COLOR_PALETTE[activePlayer.color];
  const isHumanTurn = activePlayer.type === 'HUMAN';

  const triggerParticles = useCallback(
    (coord: GridCoord, colorHex: string, kind: BoardParticleBurst['kind']) => {
      const burstId = Date.now();
      setParticleBurst({ id: burstId, coord, colorHex, kind });
      window.setTimeout(() => {
        setParticleBurst((curr) => (curr?.id === burstId ? null : curr));
      }, 480);
    },
    []
  );

  /**
   * Generates the dice result ONCE through the existing dice engine,
   * locks rolling input, and initiates the 3D physical board throw.
   */
  const handleRollDice = useCallback(() => {
    const current = stateRef.current;
    if (
      current.turnPhase !== 'WAITING_FOR_ROLL' ||
      isRollingAnim ||
      pendingRollRef.current !== null ||
      isAnimatingRef.current
    ) {
      return;
    }

    const engineRoll = generateDiceRoll(current.doubleDicePrimed);
    pendingRollRef.current = engineRoll;
    setPendingDiceRoll(engineRoll);
    setIsRollingAnim(true);
  }, [isRollingAnim]);

  /**
   * Invoked when the 3D physical dice settles on the wooden board,
   * committing the exact pre-generated engine roll to game state.
   */
  const handleDiceRollSettled = useCallback(() => {
    const settledRoll = pendingRollRef.current;
    pendingRollRef.current = null;
    setIsRollingAnim(false);
    setPendingDiceRoll(null);

    if (!settledRoll) return;
    const latest = stateRef.current;
    if (latest.turnPhase !== 'WAITING_FOR_ROLL') return;

    const rolledState = commitDiceRoll(latest, settledRoll);
    if (rolledState.turnPhase === 'NO_MOVES_DELAY') {
      soundManager.playNoMoves();
    }
    onUpdateGameState(rolledState);
  }, [onUpdateGameState]);

  // Execute Token Move with smooth step-by-step wooden pawn hops
  const handleExecuteMove = useCallback(
    (move: LegalMove) => {
      const current = stateRef.current;
      if (current.turnPhase !== 'SELECTING_MOVE' || isAnimatingRef.current) {
        return;
      }

      const mover = current.players[current.currentPlayerIndex];
      const token = mover.tokens.find((t) => t.id === move.tokenId);
      if (!token) return;

      isAnimatingRef.current = true;
      onUpdateGameState({ ...current, turnPhase: 'ANIMATING_MOVE' });

      const stepCoords = getStepPathCoords(
        mover.color,
        move.fromProgress,
        move.toProgress,
        token.tokenIndex
      );

      if (move.isEntryMove) {
        soundManager.playTokenDeploy();
      }

      let stepIdx = 0;
      const stepDurationMs = stepCoords.length > 7 ? 72 : 92;

      const runNextStep = () => {
        if (stepIdx < stepCoords.length) {
          const coord = stepCoords[stepIdx];
          setAnimatingToken({
            tokenId: token.id,
            coord,
            hopScale: 1.18,
          });
          if (!move.isEntryMove || stepIdx > 0) {
            soundManager.playTokenHop(stepIdx);
          }
          stepIdx++;
          window.setTimeout(runNextStep, stepDurationMs);
        } else {
          setAnimatingToken(null);
          const {
            nextState,
            capturedCount,
            shieldBlockedCount,
            earnedBonusTurn,
            gameEnded,
          } = applySelectedMove(stateRef.current, move);

          const destCoord = getProgressGridCoord(
            mover.color,
            move.toProgress,
            token.tokenIndex
          );

          if (capturedCount > 0) {
            soundManager.playCapture();
            setShakeBoard(true);
            window.setTimeout(() => setShakeBoard(false), 300);
            triggerParticles(destCoord, '#C82E29', 'capture');
          } else if (shieldBlockedCount > 0) {
            soundManager.playShieldDeflect();
            triggerParticles(destCoord, '#0284C7', 'shield');
          } else if (move.isFinalHome) {
            soundManager.playExtraTurn();
            triggerParticles(destCoord, '#D99B26', 'home');
          } else if (earnedBonusTurn) {
            soundManager.playExtraTurn();
          }

          isAnimatingRef.current = false;
          onUpdateGameState(nextState);

          if (gameEnded) {
            soundManager.playVictoryFanfare();
            window.setTimeout(() => {
              onGameFinished(nextState);
            }, 680);
          }
        }
      };

      runNextStep();
    },
    [onUpdateGameState, onGameFinished, triggerParticles]
  );

  // Auto-advance turn when NO_MOVES_DELAY triggers
  useEffect(() => {
    if (isPaused || isSettingsOpen || gameState.turnPhase !== 'NO_MOVES_DELAY') {
      return;
    }
    const timer = window.setTimeout(() => {
      onUpdateGameState(advanceTurn(stateRef.current));
    }, 950);
    return () => clearTimeout(timer);
  }, [gameState.turnPhase, isPaused, isSettingsOpen, onUpdateGameState]);

  // Computer AI Turn Automation
  useEffect(() => {
    if (
      isPaused ||
      isSettingsOpen ||
      activePlayer.type !== 'AI' ||
      isRollingAnim ||
      isAnimatingRef.current
    ) {
      return;
    }

    if (gameState.turnPhase === 'WAITING_FOR_ROLL') {
      const timer = window.setTimeout(() => {
        const latest = stateRef.current;
        const aiPlayer = latest.players[latest.currentPlayerIndex];
        if (aiPlayer.type !== 'AI' || latest.turnPhase !== 'WAITING_FOR_ROLL') {
          return;
        }

        const skillDecision = decideAiPreRollAction(latest, aiPlayer);
        if (skillDecision.type === 'ACTIVATE_DOUBLE_DICE') {
          soundManager.playDoubleDiceActivate();
          onUpdateGameState(activateDoubleDiceSkill(latest));
          return;
        }
        if (skillDecision.type === 'ACTIVATE_SHIELD') {
          soundManager.playShieldActivate();
          const shieldedState = applyShieldSkillToToken(
            latest,
            skillDecision.tokenId
          );
          const tok = aiPlayer.tokens.find(
            (t) => t.id === skillDecision.tokenId
          );
          if (tok) {
            triggerParticles(
              getProgressGridCoord(aiPlayer.color, tok.progress, tok.tokenIndex),
              '#0284C7',
              'shield'
            );
          }
          onUpdateGameState(shieldedState);
          return;
        }

        handleRollDice();
      }, 520);
      return () => clearTimeout(timer);
    }

    if (gameState.turnPhase === 'SELECTING_MOVE') {
      const timer = window.setTimeout(() => {
        const latest = stateRef.current;
        const aiPlayer = latest.players[latest.currentPlayerIndex];
        if (
          aiPlayer.type !== 'AI' ||
          latest.turnPhase !== 'SELECTING_MOVE' ||
          latest.legalMoves.length === 0
        ) {
          return;
        }
        const chosen = selectAiMove(latest, aiPlayer, latest.legalMoves);
        handleExecuteMove(chosen);
      }, 480);
      return () => clearTimeout(timer);
    }
  }, [
    isPaused,
    isSettingsOpen,
    activePlayer.type,
    gameState.currentPlayerIndex,
    gameState.turnPhase,
    gameState.doubleDicePrimed,
    isRollingAnim,
    handleRollDice,
    handleExecuteMove,
    onUpdateGameState,
    triggerParticles,
  ]);

  // Human Skill Handlers
  const handleTriggerShield = () => {
    if (!isHumanTurn || isRollingAnim) return;
    if (gameState.turnPhase === 'SELECTING_SHIELD_TOKEN') {
      onUpdateGameState(cancelShieldTokenSelection(gameState));
      return;
    }

    const check = validateSkillActivation(
      gameState,
      activePlayer,
      SkillId.SHIELD
    );
    if (!check.valid) return;

    const candidates = getEligibleShieldTokens(activePlayer);
    if (candidates.length === 1) {
      soundManager.playShieldActivate();
      const target = candidates[0];
      triggerParticles(
        getProgressGridCoord(activePlayer.color, target.progress, target.tokenIndex),
        '#0284C7',
        'shield'
      );
      onUpdateGameState(applyShieldSkillToToken(gameState, target.id));
    } else {
      soundManager.playClick();
      onUpdateGameState(startShieldTokenSelection(gameState));
    }
  };

  const handleConfirmShieldToken = (tokenId: string) => {
    soundManager.playShieldActivate();
    const target = activePlayer.tokens.find((t) => t.id === tokenId);
    if (target) {
      triggerParticles(
        getProgressGridCoord(activePlayer.color, target.progress, target.tokenIndex),
        '#0284C7',
        'shield'
      );
    }
    onUpdateGameState(applyShieldSkillToToken(gameState, tokenId));
  };

  const handleTriggerDoubleDice = () => {
    if (!isHumanTurn || isRollingAnim) return;
    const check = validateSkillActivation(
      gameState,
      activePlayer,
      SkillId.DOUBLE_DICE
    );
    if (!check.valid) return;
    soundManager.playDoubleDiceActivate();
    onUpdateGameState(activateDoubleDiceSkill(gameState));
  };

  // Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (gameState.turnPhase === 'SELECTING_SHIELD_TOKEN') {
          onUpdateGameState(cancelShieldTokenSelection(gameState));
        } else {
          setIsPaused((p) => !p);
        }
        return;
      }

      if (isPaused || isSettingsOpen || !isHumanTurn || isRollingAnim) return;

      if (e.key === ' ' || e.key === 'Enter') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON') return;
        e.preventDefault();
        if (gameState.turnPhase === 'WAITING_FOR_ROLL') {
          handleRollDice();
        } else if (
          gameState.turnPhase === 'SELECTING_MOVE' &&
          gameState.legalMoves.length === 1
        ) {
          handleExecuteMove(gameState.legalMoves[0]);
        }
      }

      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const tok = activePlayer.tokens[idx];
        if (!tok) return;

        if (gameState.turnPhase === 'SELECTING_MOVE') {
          const matchingMove = gameState.legalMoves.find(
            (m) => m.tokenId === tok.id
          );
          if (matchingMove) {
            e.preventDefault();
            handleExecuteMove(matchingMove);
          }
        } else if (gameState.turnPhase === 'SELECTING_SHIELD_TOKEN') {
          const candidates = getEligibleShieldTokens(activePlayer);
          if (candidates.some((c) => c.id === tok.id)) {
            e.preventDefault();
            handleConfirmShieldToken(tok.id);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isPaused,
    isSettingsOpen,
    isHumanTurn,
    isRollingAnim,
    gameState,
    activePlayer,
    handleRollDice,
    handleExecuteMove,
    onUpdateGameState,
  ]);

  const shieldValidation = validateSkillActivation(
    gameState,
    activePlayer,
    SkillId.SHIELD
  );
  const doubleDiceValidation = validateSkillActivation(
    gameState,
    activePlayer,
    SkillId.DOUBLE_DICE
  );

  const canHumanRoll =
    isHumanTurn && !isRollingAnim && gameState.turnPhase === 'WAITING_FOR_ROLL';

  const statusText = isRollingAnim
    ? 'Rolling dice on board...'
    : gameState.turnPhase === 'SELECTING_SHIELD_TOKEN'
      ? 'Tap an active piece on the board to Shield'
      : gameState.turnPhase === 'NO_MOVES_DELAY'
        ? `Rolled ${gameState.lastDiceRoll?.total ?? ''} · No valid moves`
        : gameState.turnPhase === 'SELECTING_MOVE'
          ? isHumanTurn
            ? `Rolled ${gameState.lastDiceRoll?.total ?? ''} · Tap a glowing piece`
            : `${activePlayer.name} rolled ${gameState.lastDiceRoll?.total ?? ''}`
          : isHumanTurn
            ? gameState.doubleDicePrimed
              ? 'Twin Dice Primed · Tap Dice to Roll'
              : 'Tap Dice to Roll'
            : `${activePlayer.name} (${activePlayer.aiDifficulty} AI) is playing`;

  return (
    <div className="min-h-dvh w-full wood-tabletop flex flex-col justify-between items-center px-3 py-2.5 sm:py-4 overflow-hidden">
      {/* TOP SECTION: Current Player & Turn Information */}
      <header className="w-full max-w-[660px] flex items-center justify-between gap-3 shrink-0">
        <div className="wood-banner flex-1 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Raised 3D Color Token Disc */}
            <span
              className="w-8 h-8 rounded-full border-2 border-[#FFF8E6] shadow-md shrink-0 flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 32% 30%, ${activePalette.highlight}, ${activePalette.primary} 55%, ${activePalette.dark})`,
              }}
            >
              <span className="w-3.5 h-3.5 rounded-full border border-white/60" />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-base sm:text-lg font-bold text-[#FFFDF7] truncate">
                  {activePlayer.name}’s Turn
                </span>
                <span className="text-xs text-[#F5D78E] font-mono-num whitespace-nowrap">
                  · Turn {gameState.turnNumber}
                </span>
              </div>
              <p className="text-xs text-[#EAD8B8] truncate">{statusText}</p>
            </div>
          </div>

          {/* Last Settled Roll Readout */}
          {gameState.lastDiceRoll && !isRollingAnim && (
            <div className="px-2.5 py-1 rounded-xl bg-[#2A1709]/70 border border-[#C89B43]/60 text-right shrink-0">
              <div className="text-[10px] text-[#E6CFA8] leading-tight">
                Last Roll
              </div>
              <div className="text-sm font-bold font-mono-num text-[#FFE699] leading-tight">
                {gameState.lastDiceRoll.isDoubleDice
                  ? `${gameState.lastDiceRoll.values[0]}+${gameState.lastDiceRoll.values[1]}`
                  : gameState.lastDiceRoll.total}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CENTER SECTION: Large Symmetrical Neo Classic Wooden Ludo Board */}
      <main className="w-full flex-1 flex items-center justify-center my-1.5 sm:my-2 min-h-0">
        <LudoBoard
          gameState={gameState}
          animatingToken={animatingToken}
          particleBurst={particleBurst}
          shakeBoard={shakeBoard}
          activeDiceRoll={pendingDiceRoll ?? gameState.lastDiceRoll}
          isDiceRolling={isRollingAnim}
          canRollDice={canHumanRoll}
          onTriggerDiceRoll={handleRollDice}
          onDiceRollSettled={handleDiceRollSettled}
          onSelectMove={handleExecuteMove}
          onSelectShieldToken={handleConfirmShieldToken}
        />
      </main>

      {/* BOTTOM SECTION: Neo Classic Golden Circular Buttons & Player Controls */}
      <footer className="w-full max-w-[660px] flex items-center justify-between gap-2 sm:gap-4 pt-1 shrink-0">
        {/* Left Golden Controls: Back & Pause */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onExitHome();
            }}
            aria-label="Back to Home"
            title="Back to Home"
            className="gold-circle-btn w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsPaused(true);
            }}
            aria-label="Pause Game"
            title="Pause Game"
            className="gold-circle-btn w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center cursor-pointer shrink-0"
          >
            <Pause className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Center Player Controls: Tactical Skill Medallions + Golden Dice Button */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
          {gameState.rules.enableSkills && (
            <button
              type="button"
              onClick={handleTriggerShield}
              disabled={
                !isHumanTurn ||
                isRollingAnim ||
                (!shieldValidation.valid &&
                  gameState.turnPhase !== 'SELECTING_SHIELD_TOKEN')
              }
              title={`Aegis Shield (${activePlayer.skills[SkillId.SHIELD].chargesRemaining} left)`}
              className={`gold-circle-btn relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex flex-col items-center justify-center cursor-pointer shrink-0 ${
                gameState.turnPhase === 'SELECTING_SHIELD_TOKEN'
                  ? 'ring-4 ring-sky-400'
                  : ''
              }`}
            >
              <Shield className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[9px] font-mono-num font-extrabold leading-none mt-0.5">
                {activePlayer.skills[SkillId.SHIELD].chargesRemaining}
              </span>
            </button>
          )}

          <DiceWidget
            lastRoll={pendingDiceRoll ?? gameState.lastDiceRoll}
            isRolling={isRollingAnim}
            doubleDicePrimed={gameState.doubleDicePrimed}
            canRoll={canHumanRoll}
            onRoll={handleRollDice}
          />

          {gameState.rules.enableSkills && (
            <button
              type="button"
              onClick={handleTriggerDoubleDice}
              disabled={
                !isHumanTurn ||
                isRollingAnim ||
                !doubleDiceValidation.valid ||
                gameState.doubleDicePrimed
              }
              title={`Double Dice (${activePlayer.skills[SkillId.DOUBLE_DICE].chargesRemaining} left)`}
              className={`gold-circle-btn relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex flex-col items-center justify-center cursor-pointer shrink-0 ${
                gameState.doubleDicePrimed ? 'ring-4 ring-amber-200' : ''
              }`}
            >
              <Dices className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[9px] font-mono-num font-extrabold leading-none mt-0.5">
                {activePlayer.skills[SkillId.DOUBLE_DICE].chargesRemaining}
              </span>
            </button>
          )}
        </div>

        {/* Right Golden Controls: Sound & Settings */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSfx}
            aria-label={sfxEnabled ? 'Mute Sound' : 'Enable Sound'}
            title={sfxEnabled ? 'Sound On' : 'Sound Muted'}
            className="gold-circle-btn w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center cursor-pointer shrink-0"
          >
            {sfxEnabled ? (
              <Volume2 className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <VolumeX className="w-5 h-5 stroke-[2.5] opacity-70" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsSettingsOpen(true);
            }}
            aria-label="Match Settings"
            title="Match Settings"
            className="gold-circle-btn w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center cursor-pointer shrink-0"
          >
            <Settings className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </footer>

      {/* Neo Classic Wooden Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-[#1F1005]/65 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl wood-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#2C1A0E]">
                Game Paused
              </h2>
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                aria-label="Close pause menu"
                className="gold-circle-btn w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <p className="text-xs text-[#6B4A2B]">
              Turn {gameState.turnNumber} · {activePlayer.name}’s turn is preserved offline.
            </p>

            <div className="flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="gold-cta-btn min-h-[48px] px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Game</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPaused(false);
                  onRestartMatch();
                }}
                className="min-h-[46px] px-4 rounded-xl bg-[#EFE2C6] hover:bg-[#E6D5B3] border border-[#8C6239] text-[#2C1A0E] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Match</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPaused(false);
                  onOpenRules();
                }}
                className="min-h-[46px] px-4 rounded-xl bg-[#EFE2C6] hover:bg-[#E6D5B3] border border-[#8C6239] text-[#2C1A0E] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4" />
                <span>How to Play</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPaused(false);
                  onExitHome();
                }}
                className="min-h-[46px] px-4 rounded-xl bg-[#5C381C] hover:bg-[#4A2C14] text-[#FFFDF7] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Neo Classic In-Game Settings Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#1F1005]/65 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl wood-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#2C1A0E]">
                Table Settings
              </h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close settings"
                className="gold-circle-btn w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4E8CD] border border-[#BCA074]">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-5 h-5 text-[#4A2C14]" />
                  <div>
                    <div className="text-sm font-bold text-[#2C1A0E]">
                      Sound Effects
                    </div>
                    <div className="text-[11px] text-[#6B4A2B]">
                      Wooden dice &amp; token audio
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleSfx}
                  className={`min-h-[38px] px-4 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                    sfxEnabled
                      ? 'gold-cta-btn'
                      : 'bg-[#E5D5B5] border-[#9E7B4F] text-[#5C3D1E]'
                  }`}
                >
                  {sfxEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4E8CD] border border-[#BCA074]">
                <div className="flex items-center gap-2.5">
                  <Music className="w-5 h-5 text-[#4A2C14]" />
                  <div>
                    <div className="text-sm font-bold text-[#2C1A0E]">
                      Ambient Music
                    </div>
                    <div className="text-[11px] text-[#6B4A2B]">
                      Warm acoustic tabletop loop
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleMusic}
                  className={`min-h-[38px] px-4 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                    musicEnabled
                      ? 'gold-cta-btn'
                      : 'bg-[#E5D5B5] border-[#9E7B4F] text-[#5C3D1E]'
                  }`}
                >
                  {musicEnabled ? 'Playing' : 'Off'}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F4E8CD] border border-[#BCA074] text-xs text-[#4A2C14] space-y-1">
                <div className="font-bold text-[#2C1A0E]">Active Match Rules</div>
                <div>
                  Entry Roll: {gameState.rules.entryRolls.join(' or ')} · Extra Turn: {gameState.rules.extraTurnRolls.join(' or ')} · Tokens: {gameState.rules.tokensPerPlayer}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="gold-cta-btn min-h-[46px] rounded-xl font-bold text-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
