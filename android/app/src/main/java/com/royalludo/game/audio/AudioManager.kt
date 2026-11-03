package com.royalludo.game.audio

import android.media.AudioManager as SystemAudioManager
import android.media.ToneGenerator

/**
 * Lightweight zero-asset offline audio synthesizer for Android devices (API 26+)
 * providing tactile feedback on dice rolls, token hops, captures, and victories.
 */
class AudioManager {
    private val toneGen = ToneGenerator(SystemAudioManager.STREAM_MUSIC, 65)
    var sfxEnabled: Boolean = true

    fun playDiceRoll() {
        if (!sfxEnabled) return
        toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 55)
    }

    fun playTokenMove() {
        if (!sfxEnabled) return
        toneGen.startTone(ToneGenerator.TONE_PROP_ACK, 40)
    }

    fun playCapture() {
        if (!sfxEnabled) return
        toneGen.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 160)
    }

    fun playSkill() {
        if (!sfxEnabled) return
        toneGen.startTone(ToneGenerator.TONE_PROP_BEEP2, 120)
    }

    fun playVictory() {
        if (!sfxEnabled) return
        toneGen.startTone(ToneGenerator.TONE_CDMA_MED_L, 320)
    }

    fun release() {
        toneGen.release()
    }
}
