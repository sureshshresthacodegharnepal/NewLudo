package com.royalludo.game.model

enum class PlayerColor(val primaryHex: Long, val darkHex: Long, val highlightHex: Long, val label: String) {
    BLUE(0xFF1E5AA8, 0xFF103466, 0xFF5591DF, "Blue"),
    YELLOW(0xFFE2A316, 0xFF966604, 0xFFFAD264, "Yellow"),
    RED(0xFFC82E29, 0xFF7D1613, 0xFFEB6A65, "Red"),
    GREEN(0xFF267D39, 0xFF144A20, 0xFF59B56D, "Green")
}

enum class PlayerType { HUMAN, AI }

enum class AiDifficulty { EASY, MEDIUM, HARD }

enum class SkillId { SHIELD, DOUBLE_DICE }

enum class TurnPhase {
    WAITING_FOR_ROLL,
    ROLLING,
    SELECTING_SHIELD_TOKEN,
    SELECTING_MOVE,
    ANIMATING_MOVE,
    NO_MOVES_DELAY,
    GAME_OVER
}

data class Token(
    val id: String,
    val tokenIndex: Int,
    val ownerColor: PlayerColor,
    val progress: Int = -1,
    val shieldTurnsRemaining: Int = 0
)

data class PlayerSkillState(
    val skillId: SkillId,
    val chargesRemaining: Int,
    val maxCharges: Int,
    val cooldownTurns: Int = 0
)

data class PlayerState(
    val id: String,
    val name: String,
    val color: PlayerColor,
    val type: PlayerType,
    val aiDifficulty: AiDifficulty = AiDifficulty.MEDIUM,
    val tokens: List<Token>,
    val skills: Map<SkillId, PlayerSkillState>,
    val capturesMade: Int = 0,
    val finishedRank: Int? = null
)

data class GameRulesConfig(
    val tokensPerPlayer: Int = 4,
    val entryRolls: Set<Int> = setOf(1),
    val extraTurnRolls: Set<Int> = setOf(1, 6),
    val bonusTurnOnCapture: Boolean = true,
    val bonusTurnOnHome: Boolean = true,
    val exactHomeRoll: Boolean = true,
    val enableSkills: Boolean = true
)

data class DiceRollState(
    val values: List<Int>,
    val isDoubleDice: Boolean = false
) {
    val total: Int get() = values.sum()
}

data class LegalMove(
    val tokenId: String,
    val fromProgress: Int,
    val toProgress: Int,
    val stepsUsed: Int,
    val isEntryMove: Boolean,
    val isHomeStretchEntry: Boolean,
    val isFinalHome: Boolean,
    val willCaptureTokenIds: List<String>,
    val willHitShieldedTokenIds: List<String>
)

data class GameState(
    val rules: GameRulesConfig = GameRulesConfig(),
    val players: List<PlayerState> = emptyList(),
    val currentPlayerIndex: Int = 0,
    val turnNumber: Int = 1,
    val turnPhase: TurnPhase = TurnPhase.WAITING_FOR_ROLL,
    val phaseBeforeShield: TurnPhase? = null,
    val doubleDicePrimed: Boolean = false,
    val lastDiceRoll: DiceRollState? = null,
    val legalMoves: List<LegalMove> = emptyList(),
    val consecutiveBonusTurns: Int = 0,
    val winnerColor: PlayerColor? = null,
    val rankings: List<PlayerColor> = emptyList()
)

data class CareerStats(
    val totalGamesPlayed: Int = 0,
    val gamesWon: Int = 0,
    val gamesLost: Int = 0,
    val tokensCaptured: Int = 0,
    val currentWinStreak: Int = 0,
    val bestWinStreak: Int = 0
) {
    val winPercentage: Int
        get() = if (totalGamesPlayed == 0) 0 else ((gamesWon * 100f) / totalGamesPlayed).toInt()
}
