package com.royalludo.game.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.royalludo.game.model.CareerStats
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "royal_ludo_datastore")

class StatsPreferencesRepository(private val context: Context) {

    private object Keys {
        val TOTAL_GAMES = intPreferencesKey("total_games")
        val GAMES_WON = intPreferencesKey("games_won")
        val GAMES_LOST = intPreferencesKey("games_lost")
        val TOKENS_CAPTURED = intPreferencesKey("tokens_captured")
        val CURRENT_STREAK = intPreferencesKey("current_streak")
        val BEST_STREAK = intPreferencesKey("best_streak")
        val SFX_ENABLED = booleanPreferencesKey("sfx_enabled")
        val MUSIC_ENABLED = booleanPreferencesKey("music_enabled")
    }

    val statsFlow: Flow<CareerStats> = context.dataStore.data.map { prefs ->
        CareerStats(
            totalGamesPlayed = prefs[Keys.TOTAL_GAMES] ?: 0,
            gamesWon = prefs[Keys.GAMES_WON] ?: 0,
            gamesLost = prefs[Keys.GAMES_LOST] ?: 0,
            tokensCaptured = prefs[Keys.TOKENS_CAPTURED] ?: 0,
            currentWinStreak = prefs[Keys.CURRENT_STREAK] ?: 0,
            bestWinStreak = prefs[Keys.BEST_STREAK] ?: 0
        )
    }

    val sfxEnabledFlow: Flow<Boolean> = context.dataStore.data.map { it[Keys.SFX_ENABLED] ?: true }
    val musicEnabledFlow: Flow<Boolean> = context.dataStore.data.map { it[Keys.MUSIC_ENABLED] ?: false }

    suspend fun recordMatchOutcome(won: Boolean, capturesMade: Int) {
        context.dataStore.edit { prefs ->
            val played = (prefs[Keys.TOTAL_GAMES] ?: 0) + 1
            val wins = (prefs[Keys.GAMES_WON] ?: 0) + if (won) 1 else 0
            val losses = (prefs[Keys.GAMES_LOST] ?: 0) + if (won) 0 else 1
            val captures = (prefs[Keys.TOKENS_CAPTURED] ?: 0) + capturesMade
            val streak = if (won) (prefs[Keys.CURRENT_STREAK] ?: 0) + 1 else 0
            val best = maxOf(prefs[Keys.BEST_STREAK] ?: 0, streak)

            prefs[Keys.TOTAL_GAMES] = played
            prefs[Keys.GAMES_WON] = wins
            prefs[Keys.GAMES_LOST] = losses
            prefs[Keys.TOKENS_CAPTURED] = captures
            prefs[Keys.CURRENT_STREAK] = streak
            prefs[Keys.BEST_STREAK] = best
        }
    }

    suspend fun setSfxEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.SFX_ENABLED] = enabled }
    }

    suspend fun setMusicEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.MUSIC_ENABLED] = enabled }
    }
}
