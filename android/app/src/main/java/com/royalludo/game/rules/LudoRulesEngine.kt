package com.royalludo.game.rules

import com.royalludo.game.model.*

data class GridCell(val row: Float, val col: Float)

object BoardGeometry {
    val mainTrack: List<GridCell> = listOf(
        GridCell(6f, 1f), GridCell(6f, 2f), GridCell(6f, 3f), GridCell(6f, 4f), GridCell(6f, 5f),
        GridCell(5f, 6f), GridCell(4f, 6f), GridCell(3f, 6f), GridCell(2f, 6f), GridCell(1f, 6f), GridCell(0f, 6f),
        GridCell(0f, 7f), GridCell(0f, 8f),
        GridCell(1f, 8f), GridCell(2f, 8f), GridCell(3f, 8f), GridCell(4f, 8f), GridCell(5f, 8f),
        GridCell(6f, 9f), GridCell(6f, 10f), GridCell(6f, 11f), GridCell(6f, 12f), GridCell(6f, 13f), GridCell(6f, 14f),
        GridCell(7f, 14f), GridCell(8f, 14f),
        GridCell(8f, 13f), GridCell(8f, 12f), GridCell(8f, 11f), GridCell(8f, 10f), GridCell(8f, 9f),
        GridCell(9f, 8f), GridCell(10f, 8f), GridCell(11f, 8f), GridCell(12f, 8f), GridCell(13f, 8f), GridCell(14f, 8f),
        GridCell(14f, 7f), GridCell(14f, 6f),
        GridCell(13f, 6f), GridCell(12f, 6f), GridCell(11f, 6f), GridCell(10f, 6f), GridCell(9f, 6f),
        GridCell(8f, 5f), GridCell(8f, 4f), GridCell(8f, 3f), GridCell(8f, 2f), GridCell(8f, 1f), GridCell(8f, 0f),
        GridCell(7f, 0f), GridCell(6f, 0f)
    )

    // Neo Classic Corners: Blue (Top-Left), Yellow (Top-Right), Green (Bottom-Right), Red (Bottom-Left)
    val startTrackOffset: Map<PlayerColor, Int> = mapOf(
        PlayerColor.BLUE to 0,
        PlayerColor.YELLOW to 13,
        PlayerColor.GREEN to 26,
        PlayerColor.RED to 39
    )

    val safeTrackIndices: Set<Int> = setOf(0, 8, 13, 21, 26, 34, 39, 47)

    val homeStretches: Map<PlayerColor, List<GridCell>> = mapOf(
        PlayerColor.BLUE to (1..5).map { GridCell(7f, it.toFloat()) },
        PlayerColor.YELLOW to (1..5).map { GridCell(it.toFloat(), 7f) },
        PlayerColor.GREEN to (13 downTo 9).map { GridCell(7f, it.toFloat()) },
        PlayerColor.RED to (13 downTo 9).map { GridCell(it.toFloat(), 7f) }
    )

    val yardSlots: Map<PlayerColor, List<GridCell>> = mapOf(
        PlayerColor.BLUE to listOf(GridCell(1.65f, 1.75f), GridCell(1.65f, 3.25f), GridCell(3.05f, 1.75f), GridCell(3.05f, 3.25f)),
        PlayerColor.YELLOW to listOf(GridCell(1.65f, 10.75f), GridCell(1.65f, 12.25f), GridCell(3.05f, 10.75f), GridCell(3.05f, 12.25f)),
        PlayerColor.RED to listOf(GridCell(10.65f, 1.75f), GridCell(10.65f, 3.25f), GridCell(12.05f, 1.75f), GridCell(12.05f, 3.25f)),
        PlayerColor.GREEN to listOf(GridCell(10.65f, 10.75f), GridCell(10.65f, 12.25f), GridCell(12.05f, 10.75f), GridCell(12.05f, 12.25f))
    )

    fun globalTrackIndex(color: PlayerColor, progress: Int): Int? {
        if (progress !in 0..50) return null
        val start = startTrackOffset[color] ?: 0
        return (start + progress) % 52
    }

    fun resolveTokenCell(token: Token): GridCell {
        return when {
            token.progress == -1 -> yardSlots.getValue(token.ownerColor)[token.tokenIndex % 4]
            token.progress in 0..50 -> mainTrack[globalTrackIndex(token.ownerColor, token.progress)!!]
            token.progress in 51..55 -> homeStretches.getValue(token.ownerColor)[token.progress - 51]
            else -> when (token.ownerColor) {
                PlayerColor.BLUE -> GridCell(7f, 6.25f)
                PlayerColor.YELLOW -> GridCell(6.25f, 7f)
                PlayerColor.GREEN -> GridCell(7f, 7.75f)
                PlayerColor.RED -> GridCell(7.75f, 7f)
            }
        }
    }
}

object LudoRulesEngine {
    const val FINAL_HOME = 56

    fun calculateLegalMoves(
        state: GameState,
        player: PlayerState,
        diceRoll: DiceRollState
    ): List<LegalMove> {
        val moves = mutableListOf<LegalMove>()
        val rules = state.rules

        for (token in player.tokens) {
            if (token.progress >= FINAL_HOME) continue

            if (token.progress == -1) {
                if (!diceRoll.isDoubleDice) {
                    val roll = diceRoll.values.first()
                    if (roll in rules.entryRolls) {
                        val (capturable, shielded) = inspectOpponents(state.players, player.color, 0)
                        moves += LegalMove(
                            tokenId = token.id,
                            fromProgress = -1,
                            toProgress = 0,
                            stepsUsed = roll,
                            isEntryMove = true,
                            isHomeStretchEntry = false,
                            isFinalHome = false,
                            willCaptureTokenIds = capturable,
                            willHitShieldedTokenIds = shielded
                        )
                    }
                } else {
                    val d1 = diceRoll.values[0]
                    val d2 = diceRoll.values[1]
                    if (d1 in rules.entryRolls || d2 in rules.entryRolls) {
                        val bonus = if (d1 in rules.entryRolls) d2 else d1
                        val target = bonus.coerceAtMost(FINAL_HOME)
                        val (capturable, shielded) = inspectOpponents(state.players, player.color, target)
                        moves += LegalMove(
                            tokenId = token.id,
                            fromProgress = -1,
                            toProgress = target,
                            stepsUsed = diceRoll.total,
                            isEntryMove = true,
                            isHomeStretchEntry = target >= 51,
                            isFinalHome = target == FINAL_HOME,
                            willCaptureTokenIds = capturable,
                            willHitShieldedTokenIds = shielded
                        )
                    }
                }
                continue
            }

            val target = token.progress + diceRoll.total
            if (target <= FINAL_HOME) {
                val (capturable, shielded) = inspectOpponents(state.players, player.color, target)
                moves += LegalMove(
                    tokenId = token.id,
                    fromProgress = token.progress,
                    toProgress = target,
                    stepsUsed = diceRoll.total,
                    isEntryMove = false,
                    isHomeStretchEntry = token.progress <= 50 && target >= 51,
                    isFinalHome = target == FINAL_HOME,
                    willCaptureTokenIds = capturable,
                    willHitShieldedTokenIds = shielded
                )
            } else if (diceRoll.isDoubleDice) {
                val needed = FINAL_HOME - token.progress
                if (needed in diceRoll.values) {
                    moves += LegalMove(
                        tokenId = token.id,
                        fromProgress = token.progress,
                        toProgress = FINAL_HOME,
                        stepsUsed = needed,
                        isEntryMove = false,
                        isHomeStretchEntry = token.progress <= 50,
                        isFinalHome = true,
                        willCaptureTokenIds = emptyList(),
                        willHitShieldedTokenIds = emptyList()
                    )
                }
            }
        }
        return moves
    }

    private fun inspectOpponents(
        players: List<PlayerState>,
        moverColor: PlayerColor,
        targetProgress: Int
    ): Pair<List<String>, List<String>> {
        val targetGlobal = BoardGeometry.globalTrackIndex(moverColor, targetProgress)
            ?: return emptyList<String>() to emptyList()
        if (targetGlobal in BoardGeometry.safeTrackIndices) {
            return emptyList<String>() to emptyList()
        }

        val capturable = mutableListOf<String>()
        val shielded = mutableListOf<String>()

        for (opp in players) {
            if (opp.color == moverColor) continue
            for (t in opp.tokens) {
                val oppGlobal = BoardGeometry.globalTrackIndex(opp.color, t.progress)
                if (oppGlobal == targetGlobal) {
                    if (t.shieldTurnsRemaining > 0) shielded += t.id else capturable += t.id
                }
            }
        }
        return capturable to shielded
    }
}
