package com.royalludo.game.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.royalludo.game.ai.AiEngine
import com.royalludo.game.audio.AudioManager
import com.royalludo.game.data.StatsPreferencesRepository
import com.royalludo.game.engine.LudoGameEngine
import com.royalludo.game.model.*
import com.royalludo.game.skills.SkillEngine
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class LudoViewModel(
    private val repository: StatsPreferencesRepository,
    private val gameEngine: LudoGameEngine = LudoGameEngine(),
    private val audioManager: AudioManager = AudioManager()
) : ViewModel() {

    private val _gameState = MutableStateFlow(GameState())
    val gameState: StateFlow<GameState> = _gameState.asStateFlow()

    val careerStats: StateFlow<CareerStats> = repository.statsFlow.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        CareerStats()
    )

    val sfxEnabled: StateFlow<Boolean> = repository.sfxEnabledFlow.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        true
    )

    fun startNewMatch(
        roster: List<Triple<String, PlayerColor, PlayerType>>,
        aiDifficulty: AiDifficulty,
        rules: GameRulesConfig
    ) {
        _gameState.value = gameEngine.createMatch(roster, aiDifficulty, rules)
        scheduleAiIfNeeded()
    }

    fun onRollDiceClicked() {
        val current = _gameState.value
        val active = current.players.getOrNull(current.currentPlayerIndex) ?: return
        if (active.type != PlayerType.HUMAN || current.turnPhase != TurnPhase.WAITING_FOR_ROLL) return
        performRoll()
    }

    private fun performRoll() {
        viewModelScope.launch {
            _gameState.update { it.copy(turnPhase = TurnPhase.ROLLING) }
            audioManager.playDiceRoll()
            delay(380)

            val rolled = gameEngine.rollDice(_gameState.value.copy(turnPhase = TurnPhase.WAITING_FOR_ROLL))
            _gameState.value = rolled

            if (rolled.turnPhase == TurnPhase.NO_MOVES_DELAY) {
                delay(850)
                _gameState.update { gameEngine.advanceTurn(it) }
                scheduleAiIfNeeded()
            } else {
                scheduleAiIfNeeded()
            }
        }
    }

    fun onSelectTokenMove(move: LegalMove) {
        val current = _gameState.value
        if (current.turnPhase != TurnPhase.SELECTING_MOVE) return

        viewModelScope.launch {
            audioManager.playTokenMove()
            if (move.willCaptureTokenIds.isNotEmpty()) {
                audioManager.playCapture()
            }
            val next = gameEngine.applyMove(current, move)
            _gameState.value = next

            if (next.turnPhase == TurnPhase.GAME_OVER) {
                audioManager.playVictory()
                val human = next.players.firstOrNull { it.type == PlayerType.HUMAN }
                if (human != null) {
                    repository.recordMatchOutcome(
                        won = next.winnerColor == human.color,
                        capturesMade = human.capturesMade
                    )
                }
            } else {
                scheduleAiIfNeeded()
            }
        }
    }

    fun onActivateDoubleDice() {
        val current = _gameState.value
        audioManager.playSkill()
        _gameState.value = gameEngine.primeDoubleDice(current)
    }

    fun onToggleShieldSelection() {
        val current = _gameState.value
        val active = current.players.getOrNull(current.currentPlayerIndex) ?: return
        if (current.turnPhase == TurnPhase.SELECTING_SHIELD_TOKEN) {
            _gameState.update {
                it.copy(turnPhase = it.phaseBeforeShield ?: TurnPhase.WAITING_FOR_ROLL, phaseBeforeShield = null)
            }
            return
        }
        val candidates = SkillEngine.eligibleShieldTokens(active)
        if (candidates.size == 1) {
            audioManager.playSkill()
            _gameState.value = gameEngine.applyShield(current, candidates.first().id)
        } else if (candidates.size > 1) {
            _gameState.update {
                it.copy(phaseBeforeShield = it.turnPhase, turnPhase = TurnPhase.SELECTING_SHIELD_TOKEN)
            }
        }
    }

    fun onApplyShieldToToken(tokenId: String) {
        audioManager.playSkill()
        _gameState.update { gameEngine.applyShield(it, tokenId) }
    }

    fun toggleSfx(enabled: Boolean) {
        audioManager.sfxEnabled = enabled
        viewModelScope.launch { repository.setSfxEnabled(enabled) }
    }

    private fun scheduleAiIfNeeded() {
        val current = _gameState.value
        val active = current.players.getOrNull(current.currentPlayerIndex) ?: return
        if (active.type != PlayerType.AI || current.turnPhase == TurnPhase.GAME_OVER) return

        viewModelScope.launch {
            delay(520)
            val snapshot = _gameState.value
            val bot = snapshot.players.getOrNull(snapshot.currentPlayerIndex) ?: return@launch
            if (bot.type != PlayerType.AI) return@launch

            when (snapshot.turnPhase) {
                TurnPhase.WAITING_FOR_ROLL -> {
                    when (val decision = AiEngine.decidePreRollSkill(snapshot, bot)) {
                        is AiEngine.PreRollDecision.ActivateDoubleDice -> {
                            audioManager.playSkill()
                            _gameState.value = gameEngine.primeDoubleDice(snapshot)
                            delay(300)
                        }
                        is AiEngine.PreRollDecision.ActivateShield -> {
                            audioManager.playSkill()
                            _gameState.value = gameEngine.applyShield(snapshot, decision.tokenId)
                            delay(300)
                        }
                        AiEngine.PreRollDecision.None -> Unit
                    }
                    performRoll()
                }
                TurnPhase.SELECTING_MOVE -> {
                    if (snapshot.legalMoves.isNotEmpty()) {
                        val move = AiEngine.chooseMove(snapshot, bot, snapshot.legalMoves)
                        onSelectTokenMove(move)
                    }
                }
                else -> Unit
            }
        }
    }

    override fun onCleared() {
        audioManager.release()
        super.onCleared()
    }
}
