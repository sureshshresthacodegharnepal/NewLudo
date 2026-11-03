export enum PlayerColor {
  RED = 'RED',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  BLUE = 'BLUE',
}

export enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI',
}

export enum AiDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum SkillId {
  SHIELD = 'SHIELD',
  DOUBLE_DICE = 'DOUBLE_DICE',
}

export enum GameModePreset {
  TWO_PLAYER = 'TWO_PLAYER',
  THREE_PLAYER = 'THREE_PLAYER',
  FOUR_PLAYER = 'FOUR_PLAYER',
  VS_AI = 'VS_AI',
}

export type TurnPhase =
  | 'WAITING_FOR_ROLL'
  | 'ROLLING'
  | 'SELECTING_SHIELD_TOKEN'
  | 'SELECTING_MOVE'
  | 'ANIMATING_MOVE'
  | 'NO_MOVES_DELAY'
  | 'GAME_OVER';

export type ScreenRoute =
  | 'HOME'
  | 'PLAYER_SETUP'
  | 'GAMEPLAY'
  | 'RESULT'
  | 'HOW_TO_PLAY'
  | 'STATISTICS'
  | 'SETTINGS'
  | 'ABOUT';

export interface Token {
  id: string;
  tokenIndex: number;
  ownerColor: PlayerColor;
  /**
   * -1: In starting yard (base)
   * 0..50: On the 52-cell shared track (relative to player's start cell)
   * 51..55: On the player's 5-cell colored home stretch
   * 56: Reached central finishing destination
   */
  progress: number;
  shieldTurnsRemaining: number;
}

export interface PlayerSkillState {
  skillId: SkillId;
  chargesRemaining: number;
  maxCharges: number;
  cooldownTurns: number;
}

export interface PlayerSetupSlot {
  enabled: boolean;
  name: string;
  color: PlayerColor;
  type: PlayerType;
  aiDifficulty: AiDifficulty;
}

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  type: PlayerType;
  aiDifficulty: AiDifficulty;
  tokens: Token[];
  skills: Record<SkillId, PlayerSkillState>;
  capturesMade: number;
  skillsUsed: number;
  finishedRank: number | null;
}

export interface GameRulesConfig {
  tokensPerPlayer: 2 | 3 | 4;
  entryRolls: number[];
  extraTurnRolls: number[];
  bonusTurnOnCapture: boolean;
  bonusTurnOnHome: boolean;
  exactHomeRoll: boolean;
  enableSkills: boolean;
}

export interface DiceRollState {
  values: number[];
  total: number;
  isDoubleDice: boolean;
  rollId: number;
}

export interface LegalMove {
  tokenId: string;
  fromProgress: number;
  toProgress: number;
  stepsUsed: number;
  isEntryMove: boolean;
  isHomeStretchEntry: boolean;
  isFinalHome: boolean;
  willCaptureTokenIds: string[];
  willHitShieldedTokenIds: string[];
}

export interface GameEventLog {
  id: string;
  turnNumber: number;
  playerColor: PlayerColor;
  message: string;
  type: 'roll' | 'move' | 'capture' | 'skill' | 'shield_block' | 'win' | 'skip';
}

export interface GameState {
  matchId: string;
  modePreset: GameModePreset;
  rules: GameRulesConfig;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnNumber: number;
  turnPhase: TurnPhase;
  phaseBeforeShieldSelect: 'WAITING_FOR_ROLL' | 'SELECTING_MOVE' | null;
  doubleDicePrimed: boolean;
  lastDiceRoll: DiceRollState | null;
  legalMoves: LegalMove[];
  consecutiveBonusTurns: number;
  winnerColor: PlayerColor | null;
  rankings: PlayerColor[];
  events: GameEventLog[];
}

export interface PlayerStatistics {
  totalGamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  tokensCaptured: number;
  currentWinStreak: number;
  bestWinStreak: number;
  skillsActivated: number;
}

export interface AppSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  defaultDifficulty: AiDifficulty;
  rules: GameRulesConfig;
}

export const DEFAULT_GAME_RULES: GameRulesConfig = {
  tokensPerPlayer: 4,
  entryRolls: [1], // Standard rule per spec: roll a 1 to deploy out of starting area
  extraTurnRolls: [1, 6], // Standard rule per spec: rolling a 6 or 1 grants another turn
  bonusTurnOnCapture: true,
  bonusTurnOnHome: true,
  exactHomeRoll: true,
  enableSkills: true,
};
