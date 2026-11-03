package com.royalludo.game.ai

import com.royalludo.game.model.*
import com.royalludo.game.rules.BoardGeometry
import com.royalludo.game.skills.SkillEngine
import kotlin.random.Random

object AiEngine {

    private fun countImmediateThreats(
        players: List<PlayerState>,
        ownerColor: PlayerColor,
        progress: Int
    ): Int {
        val globalIdx = BoardGeometry.globalTrackIndex(ownerColor, progress) ?: return 0
        if (globalIdx in BoardGeometry.safeTrackIndices) return 0

        var threats = 0
        for (opp in players) {
            if (opp.color == ownerColor) continue
            for (t in opp.tokens) {
                val oppIdx = BoardGeometry.globalTrackIndex(opp.color, t.progress) ?: continue
                val distBehind = (globalIdx - oppIdx + 52) % 52
                if (distBehind in 1..6) threats++
            }
        }
        return threats
    }

    sealed interface PreRollDecision {
        data object None : PreRollDecision
        data object ActivateDoubleDice : PreRollDecision
        data class ActivateShield(val tokenId: String) : PreRollDecision
    }

    fun decidePreRollSkill(state: GameState, aiPlayer: PlayerState): PreRollDecision {
        if (aiPlayer.aiDifficulty == AiDifficulty.EASY && Random.nextFloat() > 0.15f) {
            return PreRollDecision.None
        }

        if (SkillEngine.canActivate(state, aiPlayer, SkillId.SHIELD)) {
            val bestCandidate = SkillEngine.eligibleShieldTokens(aiPlayer)
                .map { tok ->
                    val threats = countImmediateThreats(state.players, aiPlayer.color, tok.progress)
                    tok to (threats * 30 + tok.progress)
                }
                .filter { it.second >= if (aiPlayer.aiDifficulty == AiDifficulty.HARD) 45 else 62 }
                .maxByOrNull { it.second }

            if (bestCandidate != null) {
                return PreRollDecision.ActivateShield(bestCandidate.first.id)
            }
        }

        if (SkillEngine.canActivate(state, aiPlayer, SkillId.DOUBLE_DICE)) {
            val inYard = aiPlayer.tokens.count { it.progress == -1 }
            if (inYard >= 3 || (aiPlayer.aiDifficulty == AiDifficulty.HARD && Random.nextFloat() < 0.4f)) {
                return PreRollDecision.ActivateDoubleDice
            }
        }

        return PreRollDecision.None
    }

    fun chooseMove(
        state: GameState,
        aiPlayer: PlayerState,
        legalMoves: List<LegalMove>
    ): LegalMove {
        if (legalMoves.size == 1) return legalMoves.first()

        if (aiPlayer.aiDifficulty == AiDifficulty.EASY) {
            val captures = legalMoves.filter { it.willCaptureTokenIds.isNotEmpty() }
            if (captures.isNotEmpty() && Random.nextFloat() < 0.5f) return captures.random()
            return legalMoves.random()
        }

        return legalMoves.maxBy { move ->
            var score = 0f
            if (move.willCaptureTokenIds.isNotEmpty()) score += 95f * move.willCaptureTokenIds.size
            if (move.isFinalHome) score += 85f
            if (move.isHomeStretchEntry) score += 68f
            if (move.isEntryMove) score += 62f

            val destIdx = BoardGeometry.globalTrackIndex(aiPlayer.color, move.toProgress)
            if (destIdx != null && destIdx in BoardGeometry.safeTrackIndices) score += 35f

            if (aiPlayer.aiDifficulty == AiDifficulty.HARD) {
                val currDanger = countImmediateThreats(state.players, aiPlayer.color, move.fromProgress)
                val destDanger = countImmediateThreats(state.players, aiPlayer.color, move.toProgress)
                if (currDanger > 0 && destDanger == 0) score += 48f * currDanger
                if (destDanger > 0) score -= 42f * destDanger
                score += move.toProgress * 0.65f
            } else {
                score += move.toProgress * 0.45f
            }
            score
        }
    }
}
