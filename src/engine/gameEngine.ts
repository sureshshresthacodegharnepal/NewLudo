import {
  DiceRollState,
  GameEventLog,
  GameModePreset,
  GameRulesConfig,
  GameState,
  LegalMove,
  PlayerSetupSlot,
  PlayerState,
  SkillId,
} from '../models/gameModels';
import { generateDiceRoll } from './diceSystem';
import {
  calculateLegalMoves,
  checkPlayerHasWon,
  computeStandings,
  shouldAwardExtraTurn,
} from './ludoRules';
import {
  SKILL_DEFINITIONS,
  createInitialPlayerSkills,
  tickPlayerTimersOnTurnStart,
  validateSkillActivation,
} from './skillEngine';

let eventSequence = 1;

function createEvent(
  turnNumber: number,
  playerColor: PlayerState['color'],
  message: string,
  type: GameEventLog['type']
): GameEventLog {
  return {
    id: `evt-${eventSequence++}`,
    turnNumber,
    playerColor,
    message,
    type,
  };
}

export function createNewGameState(
  slots: PlayerSetupSlot[],
  modePreset: GameModePreset,
  rules: GameRulesConfig
): GameState {
  const activeSlots = slots.filter((s) => s.enabled);

  const players: PlayerState[] = activeSlots.map((slot, idx) => ({
    id: `player-${idx}-${slot.color}`,
    name: slot.name.trim() || `Player ${idx + 1}`,
    color: slot.color,
    type: slot.type,
    aiDifficulty: slot.aiDifficulty,
    tokens: Array.from({ length: rules.tokensPerPlayer }, (_, tIdx) => ({
      id: `${slot.color}-T${tIdx + 1}`,
      tokenIndex: tIdx,
      ownerColor: slot.color,
      progress: -1,
      shieldTurnsRemaining: 0,
    })),
    skills: createInitialPlayerSkills(rules.enableSkills),
    capturesMade: 0,
    skillsUsed: 0,
    finishedRank: null,
  }));

  const firstPlayer = players[0];

  return {
    matchId: `match-${Date.now()}`,
    modePreset,
    rules: { ...rules },
    players,
    currentPlayerIndex: 0,
    turnNumber: 1,
    turnPhase: 'WAITING_FOR_ROLL',
    phaseBeforeShieldSelect: null,
    doubleDicePrimed: false,
    lastDiceRoll: null,
    legalMoves: [],
    consecutiveBonusTurns: 0,
    winnerColor: null,
    rankings: players.map((p) => p.color),
    events: [
      createEvent(
        1,
        firstPlayer.color,
        `${firstPlayer.name} begins the match.`,
        'roll'
      ),
    ],
  };
}

export function activateDoubleDiceSkill(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const check = validateSkillActivation(state, player, SkillId.DOUBLE_DICE);
  if (!check.valid) return state;

  const def = SKILL_DEFINITIONS[SkillId.DOUBLE_DICE];
  const updatedPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentPlayerIndex) return p;
    return {
      ...p,
      skillsUsed: p.skillsUsed + 1,
      skills: {
        ...p.skills,
        [SkillId.DOUBLE_DICE]: {
          ...p.skills[SkillId.DOUBLE_DICE],
          chargesRemaining: p.skills[SkillId.DOUBLE_DICE].chargesRemaining - 1,
          cooldownTurns: def.cooldownTurns,
        },
      },
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    doubleDicePrimed: true,
    events: [
      createEvent(
        state.turnNumber,
        player.color,
        `${player.name} primed Double Dice!`,
        'skill'
      ),
      ...state.events,
    ].slice(0, 25),
  };
}

export function startShieldTokenSelection(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const check = validateSkillActivation(state, player, SkillId.SHIELD);
  if (!check.valid) return state;

  if (
    state.turnPhase !== 'WAITING_FOR_ROLL' &&
    state.turnPhase !== 'SELECTING_MOVE'
  ) {
    return state;
  }

  return {
    ...state,
    phaseBeforeShieldSelect: state.turnPhase,
    turnPhase: 'SELECTING_SHIELD_TOKEN',
  };
}

export function cancelShieldTokenSelection(state: GameState): GameState {
  if (state.turnPhase !== 'SELECTING_SHIELD_TOKEN') return state;
  return {
    ...state,
    turnPhase: state.phaseBeforeShieldSelect ?? 'WAITING_FOR_ROLL',
    phaseBeforeShieldSelect: null,
  };
}

export function applyShieldSkillToToken(
  state: GameState,
  tokenId: string
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const targetToken = player.tokens.find((t) => t.id === tokenId);
  if (
    !targetToken ||
    targetToken.progress < 0 ||
    targetToken.progress > 50 ||
    targetToken.shieldTurnsRemaining > 0
  ) {
    return state;
  }

  const def = SKILL_DEFINITIONS[SkillId.SHIELD];
  const shieldRounds = def.shieldDurationRounds ?? 3;

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentPlayerIndex) return p;
    return {
      ...p,
      skillsUsed: p.skillsUsed + 1,
      tokens: p.tokens.map((t) =>
        t.id === tokenId ? { ...t, shieldTurnsRemaining: shieldRounds } : t
      ),
      skills: {
        ...p.skills,
        [SkillId.SHIELD]: {
          ...p.skills[SkillId.SHIELD],
          chargesRemaining: p.skills[SkillId.SHIELD].chargesRemaining - 1,
          cooldownTurns: def.cooldownTurns,
        },
      },
    };
  });

  const resumePhase =
    state.turnPhase === 'SELECTING_SHIELD_TOKEN'
      ? state.phaseBeforeShieldSelect ?? 'WAITING_FOR_ROLL'
      : state.turnPhase;

  return {
    ...state,
    players: updatedPlayers,
    turnPhase: resumePhase,
    phaseBeforeShieldSelect: null,
    events: [
      createEvent(
        state.turnNumber,
        player.color,
        `${player.name} shielded token #${targetToken.tokenIndex + 1} for ${shieldRounds} rounds.`,
        'skill'
      ),
      ...state.events,
    ].slice(0, 25),
  };
}

export function commitDiceRoll(
  state: GameState,
  customRoll?: DiceRollState
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const diceRoll =
    customRoll ?? generateDiceRoll(state.doubleDicePrimed);
  const legalMoves = calculateLegalMoves(state, player, diceRoll);

  const rollDesc = diceRoll.isDoubleDice
    ? `${diceRoll.values[0]} + ${diceRoll.values[1]} (${diceRoll.total})`
    : `${diceRoll.total}`;

  if (legalMoves.length === 0) {
    return {
      ...state,
      doubleDicePrimed: false,
      lastDiceRoll: diceRoll,
      legalMoves: [],
      turnPhase: 'NO_MOVES_DELAY',
      events: [
        createEvent(
          state.turnNumber,
          player.color,
          `${player.name} rolled ${rollDesc} — no valid moves.`,
          'skip'
        ),
        ...state.events,
      ].slice(0, 25),
    };
  }

  return {
    ...state,
    doubleDicePrimed: false,
    lastDiceRoll: diceRoll,
    legalMoves,
    turnPhase: 'SELECTING_MOVE',
    events: [
      createEvent(
        state.turnNumber,
        player.color,
        `${player.name} rolled ${rollDesc}.`,
        'roll'
      ),
      ...state.events,
    ].slice(0, 25),
  };
}

export function applySelectedMove(
  state: GameState,
  move: LegalMove
): {
  nextState: GameState;
  capturedCount: number;
  shieldBlockedCount: number;
  earnedBonusTurn: boolean;
  gameEnded: boolean;
} {
  const activePlayer = state.players[state.currentPlayerIndex];
  const diceRoll = state.lastDiceRoll!;
  const capturedSet = new Set(move.willCaptureTokenIds);
  const shieldBlockCount = move.willHitShieldedTokenIds.length;

  let updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return {
        ...p,
        capturesMade: p.capturesMade + capturedSet.size,
        tokens: p.tokens.map((t) =>
          t.id === move.tokenId ? { ...t, progress: move.toProgress } : t
        ),
      };
    }

    // Send captured opponent tokens back to their starting yard (-1)
    if (capturedSet.size > 0) {
      return {
        ...p,
        tokens: p.tokens.map((t) =>
          capturedSet.has(t.id)
            ? { ...t, progress: -1, shieldTurnsRemaining: 0 }
            : t
        ),
      };
    }

    return p;
  });

  const postMovePlayer = updatedPlayers[state.currentPlayerIndex];
  const playerWon = checkPlayerHasWon(postMovePlayer);

  const newEvents = [...state.events];

  if (shieldBlockCount > 0) {
    newEvents.unshift(
      createEvent(
        state.turnNumber,
        activePlayer.color,
        `Opponent’s Aegis Shield deflected capture!`,
        'shield_block'
      )
    );
  }

  if (capturedSet.size > 0) {
    newEvents.unshift(
      createEvent(
        state.turnNumber,
        activePlayer.color,
        `${activePlayer.name} captured ${capturedSet.size} opponent token${capturedSet.size > 1 ? 's' : ''}!`,
        'capture'
      )
    );
  } else if (move.isFinalHome) {
    newEvents.unshift(
      createEvent(
        state.turnNumber,
        activePlayer.color,
        `${activePlayer.name} brought a token home!`,
        'move'
      )
    );
  } else if (move.isEntryMove) {
    newEvents.unshift(
      createEvent(
        state.turnNumber,
        activePlayer.color,
        `${activePlayer.name} deployed a token onto the track.`,
        'move'
      )
    );
  }

  // Victory check: first player to get all tokens home wins the match and ranks all players
  if (playerWon) {
    updatedPlayers = updatedPlayers.map((p, idx) =>
      idx === state.currentPlayerIndex ? { ...p, finishedRank: 1 } : p
    );
    const rankings = computeStandings(updatedPlayers);
    newEvents.unshift(
      createEvent(
        state.turnNumber,
        activePlayer.color,
        `${activePlayer.name} wins the match!`,
        'win'
      )
    );

    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        turnPhase: 'GAME_OVER',
        legalMoves: [],
        winnerColor: activePlayer.color,
        rankings,
        events: newEvents.slice(0, 25),
      },
      capturedCount: capturedSet.size,
      shieldBlockedCount: shieldBlockCount,
      earnedBonusTurn: false,
      gameEnded: true,
    };
  }

  const earnedBonusTurn = shouldAwardExtraTurn(
    state.rules,
    diceRoll,
    capturedSet.size,
    move.isFinalHome,
    state.consecutiveBonusTurns
  );

  if (earnedBonusTurn) {
    newEvents.unshift(
      createEvent(
        state.turnNumber,
        activePlayer.color,
        `${activePlayer.name} earned an extra turn!`,
        'roll'
      )
    );
    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        turnPhase: 'WAITING_FOR_ROLL',
        legalMoves: [],
        consecutiveBonusTurns: state.consecutiveBonusTurns + 1,
        rankings: computeStandings(updatedPlayers),
        events: newEvents.slice(0, 25),
      },
      capturedCount: capturedSet.size,
      shieldBlockedCount: shieldBlockCount,
      earnedBonusTurn: true,
      gameEnded: false,
    };
  }

  // Advance to next player's turn
  const baseNextState: GameState = {
    ...state,
    players: updatedPlayers,
    legalMoves: [],
    rankings: computeStandings(updatedPlayers),
    events: newEvents.slice(0, 25),
  };

  return {
    nextState: advanceTurn(baseNextState),
    capturedCount: capturedSet.size,
    shieldBlockedCount: shieldBlockCount,
    earnedBonusTurn: false,
    gameEnded: false,
  };
}

export function advanceTurn(state: GameState): GameState {
  if (state.turnPhase === 'GAME_OVER') return state;

  const totalPlayers = state.players.length;
  let nextIdx = (state.currentPlayerIndex + 1) % totalPlayers;
  let safetyCounter = 0;

  while (
    state.players[nextIdx].finishedRank !== null &&
    safetyCounter < totalPlayers
  ) {
    nextIdx = (nextIdx + 1) % totalPlayers;
    safetyCounter++;
  }

  // Tick shield duration & skill cooldowns for the incoming player
  const updatedPlayers = state.players.map((p, idx) =>
    idx === nextIdx ? tickPlayerTimersOnTurnStart(p) : p
  );

  return {
    ...state,
    players: updatedPlayers,
    currentPlayerIndex: nextIdx,
    turnNumber: state.turnNumber + 1,
    turnPhase: 'WAITING_FOR_ROLL',
    phaseBeforeShieldSelect: null,
    doubleDicePrimed: false,
    legalMoves: [],
    consecutiveBonusTurns: 0,
  };
}
