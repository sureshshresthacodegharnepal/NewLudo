import {
  GameState,
  PlayerSkillState,
  PlayerState,
  SkillId,
  Token,
} from '../models/gameModels';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  shortLabel: string;
  description: string;
  usageConditionText: string;
  defaultCharges: number;
  cooldownTurns: number;
  shieldDurationRounds?: number;
}

export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  [SkillId.SHIELD]: {
    id: SkillId.SHIELD,
    name: 'Aegis Shield',
    shortLabel: 'Shield',
    description:
      'Projects a protective barrier around one of your board tokens, preventing opponents from capturing it for 3 full rounds.',
    usageConditionText:
      'Requires at least 1 unshielded token on the main track during your turn.',
    defaultCharges: 2,
    cooldownTurns: 3,
    shieldDurationRounds: 3,
  },
  [SkillId.DOUBLE_DICE]: {
    id: SkillId.DOUBLE_DICE,
    name: 'Double Dice',
    shortLabel: 'Double Dice',
    description:
      'Primes a twin-die throw before rolling. Advances a board token by the combined sum, or uses an entry die plus bonus steps from base.',
    usageConditionText:
      'Activate before rolling the dice on your turn.',
    defaultCharges: 2,
    cooldownTurns: 3,
  },
};

export function createInitialPlayerSkills(
  enabled: boolean
): Record<SkillId, PlayerSkillState> {
  return {
    [SkillId.SHIELD]: {
      skillId: SkillId.SHIELD,
      chargesRemaining: enabled ? SKILL_DEFINITIONS[SkillId.SHIELD].defaultCharges : 0,
      maxCharges: enabled ? SKILL_DEFINITIONS[SkillId.SHIELD].defaultCharges : 0,
      cooldownTurns: 0,
    },
    [SkillId.DOUBLE_DICE]: {
      skillId: SkillId.DOUBLE_DICE,
      chargesRemaining: enabled ? SKILL_DEFINITIONS[SkillId.DOUBLE_DICE].defaultCharges : 0,
      maxCharges: enabled ? SKILL_DEFINITIONS[SkillId.DOUBLE_DICE].defaultCharges : 0,
      cooldownTurns: 0,
    },
  };
}

export function getEligibleShieldTokens(player: PlayerState): Token[] {
  return player.tokens.filter(
    (t) => t.progress >= 0 && t.progress <= 50 && t.shieldTurnsRemaining <= 0
  );
}

export function validateSkillActivation(
  state: GameState,
  player: PlayerState,
  skillId: SkillId
): { valid: boolean; reason?: string } {
  if (!state.rules.enableSkills) {
    return { valid: false, reason: 'Special skills are disabled in match settings.' };
  }

  const activePlayer = state.players[state.currentPlayerIndex];
  if (!activePlayer || activePlayer.id !== player.id) {
    return { valid: false, reason: 'Not this player’s turn.' };
  }

  const skillState = player.skills[skillId];
  if (!skillState || skillState.chargesRemaining <= 0) {
    return { valid: false, reason: 'No charges remaining.' };
  }

  if (skillState.cooldownTurns > 0) {
    return {
      valid: false,
      reason: `Cooldown: ${skillState.cooldownTurns} turn${skillState.cooldownTurns > 1 ? 's' : ''}`,
    };
  }

  if (skillId === SkillId.DOUBLE_DICE) {
    if (state.turnPhase !== 'WAITING_FOR_ROLL') {
      return { valid: false, reason: 'Must activate before rolling.' };
    }
    if (state.doubleDicePrimed) {
      return { valid: false, reason: 'Double Dice already primed.' };
    }
    return { valid: true };
  }

  if (skillId === SkillId.SHIELD) {
    if (
      state.turnPhase !== 'WAITING_FOR_ROLL' &&
      state.turnPhase !== 'SELECTING_MOVE'
    ) {
      return { valid: false, reason: 'Use before moving your token.' };
    }
    const eligible = getEligibleShieldTokens(player);
    if (eligible.length === 0) {
      return { valid: false, reason: 'Needs an unshielded token on track.' };
    }
    return { valid: true };
  }

  return { valid: false, reason: 'Unknown skill.' };
}

/**
 * Called whenever a player starts a fresh turn (not an extra-roll continuation)
 * so shield durations and skill cooldowns tick predictably per full round.
 */
export function tickPlayerTimersOnTurnStart(player: PlayerState): PlayerState {
  const updatedTokens = player.tokens.map((t) => ({
    ...t,
    shieldTurnsRemaining: Math.max(0, t.shieldTurnsRemaining - 1),
  }));

  const updatedSkills: Record<SkillId, PlayerSkillState> = {
    [SkillId.SHIELD]: {
      ...player.skills[SkillId.SHIELD],
      cooldownTurns: Math.max(0, player.skills[SkillId.SHIELD].cooldownTurns - 1),
    },
    [SkillId.DOUBLE_DICE]: {
      ...player.skills[SkillId.DOUBLE_DICE],
      cooldownTurns: Math.max(
        0,
        player.skills[SkillId.DOUBLE_DICE].cooldownTurns - 1
      ),
    },
  };

  return {
    ...player,
    tokens: updatedTokens,
    skills: updatedSkills,
  };
}
