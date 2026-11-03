package com.royalludo.game.skills

import com.royalludo.game.model.*

data class SkillSpec(
    val id: SkillId,
    val title: String,
    val description: String,
    val maxCharges: Int,
    val cooldownTurns: Int,
    val shieldRounds: Int = 0
)

object SkillEngine {
    val registry: Map<SkillId, SkillSpec> = mapOf(
        SkillId.SHIELD to SkillSpec(
            id = SkillId.SHIELD,
            title = "Aegis Shield",
            description = "Protects a board token from opponent capture for 3 full rounds.",
            maxCharges = 2,
            cooldownTurns = 3,
            shieldRounds = 3
        ),
        SkillId.DOUBLE_DICE to SkillSpec(
            id = SkillId.DOUBLE_DICE,
            title = "Double Dice",
            description = "Throws two dice simultaneously for combined distance and dual entry.",
            maxCharges = 2,
            cooldownTurns = 3
        )
    )

    fun initialPlayerSkills(enabled: Boolean): Map<SkillId, PlayerSkillState> =
        registry.mapValues { (id, spec) ->
            val charges = if (enabled) spec.maxCharges else 0
            PlayerSkillState(skillId = id, chargesRemaining = charges, maxCharges = charges)
        }

    fun eligibleShieldTokens(player: PlayerState): List<Token> =
        player.tokens.filter { it.progress in 0..50 && it.shieldTurnsRemaining <= 0 }

    fun canActivate(state: GameState, player: PlayerState, skillId: SkillId): Boolean {
        if (!state.rules.enableSkills) return false
        val current = state.players.getOrNull(state.currentPlayerIndex) ?: return false
        if (current.id != player.id) return false

        val skill = player.skills[skillId] ?: return false
        if (skill.chargesRemaining <= 0 || skill.cooldownTurns > 0) return false

        return when (skillId) {
            SkillId.DOUBLE_DICE -> state.turnPhase == TurnPhase.WAITING_FOR_ROLL && !state.doubleDicePrimed
            SkillId.SHIELD -> (state.turnPhase == TurnPhase.WAITING_FOR_ROLL || state.turnPhase == TurnPhase.SELECTING_MOVE) &&
                eligibleShieldTokens(player).isNotEmpty()
        }
    }

    fun tickTimersOnTurnStart(player: PlayerState): PlayerState =
        player.copy(
            tokens = player.tokens.map { t ->
                t.copy(shieldTurnsRemaining = (t.shieldTurnsRemaining - 1).coerceAtLeast(0))
            },
            skills = player.skills.mapValues { (_, st) ->
                st.copy(cooldownTurns = (st.cooldownTurns - 1).coerceAtLeast(0))
            }
        )
}
