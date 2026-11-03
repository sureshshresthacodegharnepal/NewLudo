package com.royalludo.game.dice

import com.royalludo.game.model.DiceRollState
import java.security.SecureRandom

class DiceSystem {
    private val secureRandom = SecureRandom()

    fun rollSingleDie(): Int = secureRandom.nextInt(6) + 1

    fun roll(isDoubleDice: Boolean): DiceRollState {
        val values = if (isDoubleDice) {
            listOf(rollSingleDie(), rollSingleDie())
        } else {
            listOf(rollSingleDie())
        }
        return DiceRollState(values = values, isDoubleDice = isDoubleDice)
    }
}
