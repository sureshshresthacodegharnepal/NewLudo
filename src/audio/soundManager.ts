/**
 * Procedural Web Audio API synthesizer for Neo Classic wooden tabletop game feel
 * including synchronized multi-bounce wooden dice impacts. Works 100% offline.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private musicInterval: number | null = null;
  private musicNoteIdx = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public configure(sfx: boolean, music: boolean) {
    this.sfxEnabled = sfx;
    if (music !== this.musicEnabled) {
      this.musicEnabled = music;
      if (this.musicEnabled) {
        this.startBackgroundMusic();
      } else {
        this.stopBackgroundMusic();
      }
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delaySec = 0,
    endFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        now + durationSec
      );
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  /**
   * Synthesizes a realistic wooden cube impact against a hardwood Ludo board.
   * intensity ranges 0.15..1.0 across successive bounces.
   */
  public playDiceWoodImpact(intensity = 1) {
    if (!this.sfxEnabled) return;
    const clamped = Math.max(0.12, Math.min(1, intensity));
    // Low hardwood resonance thud + crisp ivory edge click
    this.playTone(
      165 + (1 - clamped) * 55,
      0.065 * clamped + 0.025,
      'triangle',
      0.19 * clamped,
      0,
      78
    );
    this.playTone(
      760 + Math.random() * 140,
      0.028,
      'sine',
      0.09 * clamped,
      0.002,
      340
    );
  }

  public playDiceThrowRelease() {
    if (!this.sfxEnabled) return;
    // Initial hand shake / release click
    this.playTone(320, 0.035, 'triangle', 0.08, 0, 220);
    this.playTone(410, 0.03, 'triangle', 0.07, 0.045, 290);
  }

  public playDiceRoll() {
    this.playDiceThrowRelease();
  }

  public playClick() {
    if (!this.sfxEnabled) return;
    this.playTone(480, 0.05, 'triangle', 0.1, 0, 620);
  }

  public playTokenHop(stepIndex = 0) {
    if (!this.sfxEnabled) return;
    // Tactile wooden pawn tap on board square
    const baseFreq = 330 + Math.min(stepIndex, 10) * 22;
    this.playTone(baseFreq, 0.068, 'triangle', 0.14, 0, baseFreq * 0.72);
    this.playTone(baseFreq * 1.5, 0.04, 'sine', 0.06, 0.005);
  }

  public playTokenDeploy() {
    if (!this.sfxEnabled) return;
    this.playTone(349.23, 0.09, 'triangle', 0.14, 0);
    this.playTone(440, 0.12, 'triangle', 0.15, 0.07);
    this.playTone(587.33, 0.17, 'sine', 0.15, 0.14);
  }

  public playCapture() {
    if (!this.sfxEnabled) return;
    this.playTone(180, 0.22, 'sawtooth', 0.15, 0, 58);
    this.playTone(523.25, 0.14, 'triangle', 0.15, 0.06);
    this.playTone(783.99, 0.24, 'triangle', 0.16, 0.14);
  }

  public playShieldActivate() {
    if (!this.sfxEnabled) return;
    this.playTone(523.25, 0.16, 'sine', 0.13, 0);
    this.playTone(659.25, 0.18, 'sine', 0.13, 0.06);
    this.playTone(783.99, 0.28, 'triangle', 0.15, 0.12);
  }

  public playDoubleDiceActivate() {
    if (!this.sfxEnabled) return;
    this.playTone(440, 0.12, 'triangle', 0.14, 0);
    this.playTone(554.37, 0.14, 'triangle', 0.14, 0.06);
    this.playTone(659.25, 0.22, 'triangle', 0.16, 0.12);
  }

  public playShieldDeflect() {
    if (!this.sfxEnabled) return;
    this.playTone(880, 0.15, 'sine', 0.14, 0, 460);
    this.playTone(660, 0.18, 'triangle', 0.13, 0.07, 920);
  }

  public playExtraTurn() {
    if (!this.sfxEnabled) return;
    this.playTone(523.25, 0.1, 'sine', 0.11, 0);
    this.playTone(659.25, 0.16, 'sine', 0.13, 0.08);
  }

  public playNoMoves() {
    if (!this.sfxEnabled) return;
    this.playTone(290, 0.12, 'sine', 0.1, 0, 215);
    this.playTone(215, 0.16, 'sine', 0.09, 0.1, 175);
  }

  public playVictoryFanfare() {
    if (!this.sfxEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.11, 0.22, 0.34, 0.5, 0.64];
    const durations = [0.12, 0.12, 0.14, 0.2, 0.14, 0.48];
    notes.forEach((freq, i) => {
      this.playTone(freq, durations[i], 'triangle', 0.17, times[i]);
    });
  }

  private startBackgroundMusic() {
    this.stopBackgroundMusic();
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
    this.musicInterval = window.setInterval(() => {
      if (!this.musicEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;
      const freq = scale[this.musicNoteIdx % scale.length];
      this.musicNoteIdx++;
      this.playTone(freq, 0.42, 'sine', 0.032, 0);
    }, 540);
  }

  public stopBackgroundMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
