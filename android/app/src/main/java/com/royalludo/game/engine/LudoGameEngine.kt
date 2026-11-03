package com.royalludo.game.engine

import com.royalludo.game.dice.DiceSystem
import com.royalludo.game.model.*
import com.royalludo.game.rules.LudoRulesEngine
import com.royalludo.game.skills.SkillEngine

class LudoGameEngine(
    private val diceSystem: DiceSystem = DiceSystem()
) {
    fun createMatch(
        playersConfig: List<Triple<String, PlayerColor, PlayerType>>,
        aiDifficulty: AiDifficulty,
        rules: GameRulesConfig
    ): GameState {
        val players = playersConfig.mapIndexed { idx, (name, color, type) ->
            PlayerState(
                id = "P$idx-${color.name}",
                name = name.ifBlank { "Player ${idx + 1}" },
                color = color,
                type = type,
                aiDifficulty = aiDifficulty,
                tokens = List(rules.tokensPerPlayer) { tIdx ->
                    Token(
                        id = "${color.name}-T$tIdx",
                        tokenIndex = tIdx,
                        ownerColor = color,
                        progress = -1
                    )
                },
                skills = SkillEngine.initialPlayerSkills(rules.enableSkills)
            )
        }
        return GameState(
            rules = rules,
            players = players,
            rankings = players.map { it.color }
        )
    }

    fun primeDoubleDice(state: GameState): GameState {
        val player = state.players[state.currentPlayerIndex]
        if (!SkillEngine.canActivate(state, player, SkillId.DOUBLE_DICE)) return state
        val spec = SkillEngine.registry.getValue(SkillId.DOUBLE_DICE)

        val updated = state.players.mapIndexed { idx, p ->
            if (idx != state.currentPlayerIndex) p else {
                val st = p.skills.getValue(SkillId.DOUBLE_DICE)
                p.copy(
                    skills = p.skills + (SkillId.DOUBLE_DICE to st.copy(
                        chargesRemaining = st.chargesRemaining - 1,
                        cooldownTurns = spec.cooldownTurns
                    ))
                )
            }
        }
        return state.copy(players = updated, doubleDicePrimed = true)
    }

    fun applyShield(state: GameState, tokenId: String): GameState {
        val player = state.players[state.currentPlayerIndex]
        val spec = SkillEngine.registry.getValue(SkillId.SHIELD)

        val updated = state.players.mapIndexed { idx, p ->
            if (idx != state.currentPlayerIndex) p else {
                val st = p.skills.getValue(SkillId.SHIELD)
                p.copy(
                    tokens = p.tokens.map { t ->
                        if (t.id == tokenId) t.copy(shieldTurnsRemaining = spec.shieldRounds) else t
                    },
                    skills = p.skills + (SkillId.SHIELD to st.copy(
                        chargesRemaining = st.chargesRemaining - 1,
                        cooldownTurns = spec.cooldownTurns
                    ))
                )
            }
        }
        return state.copy(
            players = updated,
            turnPhase = state.phaseBeforeShield ?: state.turnPhase,
            phaseBeforeShield = null
        )
    }

    fun rollDice(state: GameState): GameState {
        val active = state.players[state.currentPlayerIndex]
        val roll = diceSystem.roll(state.doubleDicePrimed)
        val moves = LudoRulesEngine.calculateLegalMoves(state, active, roll)
        return state.copy(
            doubleDicePrimed = false,
            lastDiceRoll = roll,
            legalMoves = moves,
            turnPhase = if (moves.isEmpty()) TurnPhase.NO_MOVES_DELAY else TurnPhase.SELECTING_MOVE
        )
    }

    fun applyMove(state: GameState, move: LegalMove): GameState {
        val capturedIds = move.willCaptureTokenIds.toSet()
        var updatedPlayers = state.players.mapIndexed { idx, p ->
            if (idx == state.currentPlayerIndex) {
                p.copy(
                    capturesMade = p.capturesMade + capturedIds.size,
                    tokens = p.tokens.map { t ->
                        if (t.id == move.tokenId) t.copy(progress = move.toProgress) else t
                    }
                )
            } else {
                p.copy(
                    tokens = p.tokens.map { t ->
                        if (t.id in capturedIds) t.copy(progress = -1, shieldTurnsRemaining = 0) else t
                    }
                )
            }
        }

        val currentAfter = updatedPlayers[state.currentPlayerIndex]
        val hasWon = currentAfter.tokens.all { it.progress >= LudoRulesEngine.FINAL_HOME }
        if (hasWon) {
            updatedPlayers = updatedPlayers.mapIndexed { idx, p ->
                if (idx == state.currentPlayerIndex) p.copy(finishedRank = 1) else p
            }
            return state.copy(
                players = updatedPlayers,
                turnPhase = TurnPhase.GAME_OVER,
                legalMoves = emptyList(),
                winnerColor = currentAfter.color,
                rankings = computeStandings(updatedPlayers)
            )
        }

        val roll = state.lastDiceRoll!!
        val rolledExtra = if (roll.isDoubleDice) {
            roll.values[0] == roll.values[1] || roll.values.any { it in state.rules.extraTurnRolls }
        } else {
            roll.values.first() in state.rules.extraTurnRolls
        }
        val bonusTurn = state.consecutiveBonusTurns < 5 && (
            rolledExtra ||
                (state.rules.bonusTurnOnCapture && capturedIds.isNotEmpty()) ||
                (state.rules.bonusTurnOnHome && move.isFinalHome)
            )

        if (bonusTurn) {
            return state.copy(
                players = updatedPlayers,
                turnPhase = TurnPhase.WAITING_FOR_ROLL,
                legalMoves = emptyList(),
                consecutiveBonusTurns = state.consecutiveBonusTurns + 1,
                rankings = computeStandings(updatedPlayers)
            )
        }

        return advanceTurn(state.copy(players = updatedPlayers, legalMoves = emptyList()))
    }

    fun advanceTurn(state: GameState): GameState {
        val nextIdx = (state.currentPlayerIndex + 1) % state.players.size
        val tickedPlayers = state.players.mapIndexed { idx, p ->
            if (idx == nextIdx) SkillEngine.tickTimersOnTurnStart(p) else p
        }
        return state.copy(
            players = tickedPlayers,
            currentPlayerIndex = nextIdx,
            turnNumber = state.turnNumber + 1,
            turnPhase = TurnPhase.WAITING_FOR_ROLL,
            doubleDicePrimed = false,
            legalMoves = emptyList(),
            consecutiveBonusTurns = 0,
            rankings = computeStandings(tickedPlayers)
        )
    }

    private fun computeStandings(players: List<PlayerState>): List<PlayerColor> =
        players.sortedWith(
            compareBy<PlayerState> { it.finishedRank ?: Int.MAX_VALUE }
                .thenByDescending { p -> p.tokens.count { it.progress == 56 } }
                .thenByDescending { p -> p.tokens.sumOf { (it.progress + 1).coerceAtLeast(0) } }
        ).map { it.color }
}
