import {
  DiceRollState,
  GameRulesConfig,
  GameState,
  LegalMove,
  PlayerColor,
  PlayerState,
} from '../models/gameModels';
import {
  ALL_SAFE_TRACK_INDICES,
  getGlobalTrackIndex,
} from './boardGeometry';

const FINAL_HOME_PROGRESS = 56;

function inspectTargetCellOpponents(
  players: PlayerState[],
  movingColor: PlayerColor,
  targetProgress: number
): { capturableIds: string[]; shieldedIds: string[] } {
  if (targetProgress < 0 || targetProgress > 50) {
    return { capturableIds: [], shieldedIds: [] };
  }

  const targetGlobalIdx = getGlobalTrackIndex(movingColor, targetProgress);
  if (targetGlobalIdx === null || ALL_SAFE_TRACK_INDICES.has(targetGlobalIdx)) {
    return { capturableIds: [], shieldedIds: [] };
  }

  const capturableIds: string[] = [];
  const shieldedIds: string[] = [];

  for (const p of players) {
    if (p.color === movingColor) continue;
    for (const oppToken of p.tokens) {
      if (oppToken.progress >= 0 && oppToken.progress <= 50) {
        const oppGlobalIdx = getGlobalTrackIndex(p.color, oppToken.progress);
        if (oppGlobalIdx === targetGlobalIdx) {
          if (oppToken.shieldTurnsRemaining > 0) {
            shieldedIds.push(oppToken.id);
          } else {
            capturableIds.push(oppToken.id);
          }
        }
      }
    }
  }

  return { capturableIds, shieldedIds };
}

/**
 * Calculates all valid legal moves for the active player given a dice roll.
 */
export function calculateLegalMoves(
  state: GameState,
  player: PlayerState,
  diceRoll: DiceRollState
): LegalMove[] {
  const moves: LegalMove[] = [];
  const { rules, players } = state;

  for (const token of player.tokens) {
    if (token.progress >= FINAL_HOME_PROGRESS) {
      continue;
    }

    // Case 1: Token is in starting yard (-1)
    if (token.progress === -1) {
      if (!diceRoll.isDoubleDice) {
        const dieVal = diceRoll.values[0];
        if (rules.entryRolls.includes(dieVal)) {
          const targetProgress = 0;
          const { capturableIds, shieldedIds } = inspectTargetCellOpponents(
            players,
            player.color,
            targetProgress
          );
          moves.push({
            tokenId: token.id,
            fromProgress: -1,
            toProgress: targetProgress,
            stepsUsed: dieVal,
            isEntryMove: true,
            isHomeStretchEntry: false,
            isFinalHome: false,
            willCaptureTokenIds: capturableIds,
            willHitShieldedTokenIds: shieldedIds,
          });
        }
      } else {
        // Double Dice from base: if either die is an entry roll, deploy to 0 + advance by the other die
        const [d1, d2] = diceRoll.values;
        const d1Entry = rules.entryRolls.includes(d1);
        const d2Entry = rules.entryRolls.includes(d2);
        if (d1Entry || d2Entry) {
          // Prefer advancing by the bonus die after deploying
          const bonusSteps = d1Entry ? d2 : d1;
          const targetProgress = Math.min(FINAL_HOME_PROGRESS, bonusSteps);
          const { capturableIds, shieldedIds } = inspectTargetCellOpponents(
            players,
            player.color,
            targetProgress
          );
          moves.push({
            tokenId: token.id,
            fromProgress: -1,
            toProgress: targetProgress,
            stepsUsed: diceRoll.total,
            isEntryMove: true,
            isHomeStretchEntry: targetProgress >= 51,
            isFinalHome: targetProgress === FINAL_HOME_PROGRESS,
            willCaptureTokenIds: capturableIds,
            willHitShieldedTokenIds: shieldedIds,
          });
        }
      }
      continue;
    }

    // Case 2: Token is already on the track (0..50) or home stretch (51..55)
    const candidateTarget = token.progress + diceRoll.total;
    if (candidateTarget <= FINAL_HOME_PROGRESS) {
      const { capturableIds, shieldedIds } = inspectTargetCellOpponents(
        players,
        player.color,
        candidateTarget
      );
      moves.push({
        tokenId: token.id,
        fromProgress: token.progress,
        toProgress: candidateTarget,
        stepsUsed: diceRoll.total,
        isEntryMove: false,
        isHomeStretchEntry: token.progress <= 50 && candidateTarget >= 51,
        isFinalHome: candidateTarget === FINAL_HOME_PROGRESS,
        willCaptureTokenIds: capturableIds,
        willHitShieldedTokenIds: shieldedIds,
      });
    } else if (diceRoll.isDoubleDice) {
      // If combined Double Dice overshoots exact home, allow exact single-die home finish if one die matches
      const exactNeeded = FINAL_HOME_PROGRESS - token.progress;
      if (diceRoll.values.includes(exactNeeded)) {
        moves.push({
          tokenId: token.id,
          fromProgress: token.progress,
          toProgress: FINAL_HOME_PROGRESS,
          stepsUsed: exactNeeded,
          isEntryMove: false,
          isHomeStretchEntry: token.progress <= 50,
          isFinalHome: true,
          willCaptureTokenIds: [],
          willHitShieldedTokenIds: [],
        });
      }
    }
  }

  return moves;
}

export function checkPlayerHasWon(player: PlayerState): boolean {
  return (
    player.tokens.length > 0 &&
    player.tokens.every((t) => t.progress >= FINAL_HOME_PROGRESS)
  );
}

export function shouldAwardExtraTurn(
  rules: GameRulesConfig,
  diceRoll: DiceRollState,
  capturedCount: number,
  reachedFinalHome: boolean,
  consecutiveBonusTurns: number
): boolean {
  // Prevent infinite loops at 5 consecutive bonus turns while keeping generous traditional play
  if (consecutiveBonusTurns >= 5) {
    return false;
  }

  const rolledBonusDie = diceRoll.isDoubleDice
    ? diceRoll.values[0] === diceRoll.values[1] ||
      diceRoll.values.some((v) => rules.extraTurnRolls.includes(v))
    : rules.extraTurnRolls.includes(diceRoll.values[0]);

  if (rolledBonusDie) return true;
  if (rules.bonusTurnOnCapture && capturedCount > 0) return true;
  if (rules.bonusTurnOnHome && reachedFinalHome) return true;

  return false;
}

export function computeStandings(players: PlayerState[]): PlayerColor[] {
  return [...players]
    .sort((a, b) => {
      if (a.finishedRank !== null && b.finishedRank !== null) {
        return a.finishedRank - b.finishedRank;
      }
      if (a.finishedRank !== null) return -1;
      if (b.finishedRank !== null) return 1;

      const aHome = a.tokens.filter((t) => t.progress === FINAL_HOME_PROGRESS).length;
      const bHome = b.tokens.filter((t) => t.progress === FINAL_HOME_PROGRESS).length;
      if (bHome !== aHome) return bHome - aHome;

      const aProgress = a.tokens.reduce(
        (sum, t) => sum + (t.progress < 0 ? 0 : t.progress + 5),
        0
      );
      const bProgress = b.tokens.reduce(
        (sum, t) => sum + (t.progress < 0 ? 0 : t.progress + 5),
        0
      );
      if (bProgress !== aProgress) return bProgress - aProgress;

      return b.capturesMade - a.capturesMade;
    })
    .map((p) => p.color);
}
