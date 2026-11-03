import {
  AiDifficulty,
  GameState,
  LegalMove,
  PlayerColor,
  PlayerState,
  SkillId,
  Token,
} from '../models/gameModels';
import {
  ALL_SAFE_TRACK_INDICES,
  getGlobalTrackIndex,
} from './boardGeometry';
import {
  getEligibleShieldTokens,
  validateSkillActivation,
} from './skillEngine';

/**
 * Counts how many opponent tokens sit 1..6 cells behind a given global track index.
 */
function countImmediateThreats(
  players: PlayerState[],
  ownerColor: PlayerColor,
  progress: number
): number {
  if (progress < 0 || progress > 50) return 0;
  const globalIdx = getGlobalTrackIndex(ownerColor, progress);
  if (globalIdx === null || ALL_SAFE_TRACK_INDICES.has(globalIdx)) return 0;

  let threats = 0;
  for (const opp of players) {
    if (opp.color === ownerColor) continue;
    for (const oppToken of opp.tokens) {
      if (oppToken.progress >= 0 && oppToken.progress <= 50) {
        const oppIdx = getGlobalTrackIndex(opp.color, oppToken.progress);
        if (oppIdx !== null) {
          const distanceBehind = (globalIdx - oppIdx + 52) % 52;
          if (distanceBehind >= 1 && distanceBehind <= 6) {
            threats += 1;
          }
        }
      }
    }
  }
  return threats;
}

/**
 * AI Pre-Roll Skill Evaluation:
 * Determines whether the AI should activate Double Dice or Shield before rolling.
 */
export function decideAiPreRollAction(
  state: GameState,
  aiPlayer: PlayerState
):
  | { type: 'ACTIVATE_DOUBLE_DICE' }
  | { type: 'ACTIVATE_SHIELD'; tokenId: string }
  | { type: 'NONE' } {
  const difficulty = aiPlayer.aiDifficulty;

  // Easy AI rarely uses skills (only 15% chance)
  if (difficulty === AiDifficulty.EASY && Math.random() > 0.15) {
    return { type: 'NONE' };
  }

  // 1. Check if a high-progress token is under immediate capture threat -> Shield!
  const shieldCheck = validateSkillActivation(state, aiPlayer, SkillId.SHIELD);
  if (shieldCheck.valid) {
    const candidates = getEligibleShieldTokens(aiPlayer);
    let bestThreatened: { token: Token; dangerScore: number } | null = null;

    for (const token of candidates) {
      const threats = countImmediateThreats(
        state.players,
        aiPlayer.color,
        token.progress
      );
      if (threats > 0) {
        const dangerScore = threats * 30 + token.progress;
        if (!bestThreatened || dangerScore > bestThreatened.dangerScore) {
          bestThreatened = { token, dangerScore };
        }
      }
    }

    const minDangerThreshold =
      difficulty === AiDifficulty.HARD ? 45 : 62;
    if (bestThreatened && bestThreatened.dangerScore >= minDangerThreshold) {
      return {
        type: 'ACTIVATE_SHIELD',
        tokenId: bestThreatened.token.id,
      };
    }
  }

  // 2. Check if Double Dice gives strong strategic advantage
  const doubleCheck = validateSkillActivation(
    state,
    aiPlayer,
    SkillId.DOUBLE_DICE
  );
  if (doubleCheck.valid) {
    const inYardCount = aiPlayer.tokens.filter((t) => t.progress === -1).length;
    const midTrackTokens = aiPlayer.tokens.filter(
      (t) => t.progress >= 4 && t.progress <= 40
    );

    if (difficulty === AiDifficulty.HARD) {
      // Use Double Dice if stuck with >= 3 tokens in base OR when sprinting mid-track
      if (inYardCount >= 3 || (midTrackTokens.length >= 2 && Math.random() < 0.45)) {
        return { type: 'ACTIVATE_DOUBLE_DICE' };
      }
    } else if (difficulty === AiDifficulty.MEDIUM) {
      if ((inYardCount >= 3 || midTrackTokens.length >= 1) && Math.random() < 0.3) {
        return { type: 'ACTIVATE_DOUBLE_DICE' };
      }
    }
  }

  return { type: 'NONE' };
}

/**
 * Evaluates all legal moves and selects the optimal move based on AI difficulty.
 */
export function selectAiMove(
  state: GameState,
  aiPlayer: PlayerState,
  legalMoves: LegalMove[]
): LegalMove {
  if (legalMoves.length === 1) {
    return legalMoves[0];
  }

  const difficulty = aiPlayer.aiDifficulty;

  // Easy AI: Mostly random legal moves with modest preference for captures
  if (difficulty === AiDifficulty.EASY) {
    const captureMoves = legalMoves.filter(
      (m) => m.willCaptureTokenIds.length > 0
    );
    if (captureMoves.length > 0 && Math.random() < 0.55) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // Medium & Hard AI: Heuristic scoring
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    let score = 0;

    // 1. Capturing opponent tokens
    if (move.willCaptureTokenIds.length > 0) {
      score += 95 * move.willCaptureTokenIds.length;

      if (difficulty === AiDifficulty.HARD) {
        // Prioritize capturing opponents who are closer to winning
        for (const victimId of move.willCaptureTokenIds) {
          for (const p of state.players) {
            const victim = p.tokens.find((t) => t.id === victimId);
            if (victim && victim.progress > 0) {
              score += victim.progress * 1.4;
            }
          }
        }
      }
    }

    // 2. Reaching final home triangle
    if (move.isFinalHome) {
      score += 85;
    }

    // 3. Entering safe colored home stretch (51..55)
    if (move.isHomeStretchEntry) {
      score += 68;
    }

    // 4. Deploying a new token out of base
    if (move.isEntryMove) {
      const activeBoardTokens = aiPlayer.tokens.filter(
        (t) => t.progress >= 0 && t.progress < 56
      ).length;
      score += activeBoardTokens < 2 ? 72 : 52;
    }

    // 5. Safe cell awareness
    const targetGlobalIdx = getGlobalTrackIndex(
      aiPlayer.color,
      move.toProgress
    );
    if (
      targetGlobalIdx !== null &&
      ALL_SAFE_TRACK_INDICES.has(targetGlobalIdx)
    ) {
      score += 36;
    }

    // 6. Leaving a safe cell penalty (if not capturing or entering home stretch)
    const fromGlobalIdx = getGlobalTrackIndex(
      aiPlayer.color,
      move.fromProgress
    );
    if (
      fromGlobalIdx !== null &&
      ALL_SAFE_TRACK_INDICES.has(fromGlobalIdx) &&
      move.willCaptureTokenIds.length === 0 &&
      !move.isHomeStretchEntry
    ) {
      score -= 14;
    }

    // 7. Hard AI: Threat avoidance & escape calculation
    if (difficulty === AiDifficulty.HARD) {
      const currentThreats = countImmediateThreats(
        state.players,
        aiPlayer.color,
        move.fromProgress
      );
      const destinationThreats = countImmediateThreats(
        state.players,
        aiPlayer.color,
        move.toProgress
      );

      // Escaping danger is strongly rewarded
      if (currentThreats > 0 && destinationThreats === 0) {
        score += 48 * currentThreats;
      }

      // Stepping into an opponent's strike zone is penalized unless shielded
      const movingToken = aiPlayer.tokens.find((t) => t.id === move.tokenId);
      const isShielded = (movingToken?.shieldTurnsRemaining ?? 0) > 0;
      if (destinationThreats > 0 && !isShielded) {
        score -= 42 * destinationThreats;
      }

      // Advance tokens closer to home
      if (move.fromProgress >= 0) {
        score += move.toProgress * 0.65;
      }
    } else {
      // Medium AI: steady forward progress + tiny jitter
      if (move.fromProgress >= 0) {
        score += move.toProgress * 0.45;
      }
      score += Math.random() * 8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
