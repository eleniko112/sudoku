let isMutedGlobal = false;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (isMutedGlobal) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const sound = {
  toggleMute(): boolean {
    isMutedGlobal = !isMutedGlobal;
    if (isMutedGlobal && audioCtx) {
      audioCtx.close().then(() => {
        audioCtx = null;
      });
    }
    return isMutedGlobal;
  },

  isMuted(): boolean {
    return isMutedGlobal;
  },

  playCorrect() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Friendly, crisp chime: 523.25Hz (C5) gliding to 659.25Hz (E5)
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  },

  playWrong() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    // Low, distinct buzz: 147Hz (D3) sliding down to 110Hz (A2)
    osc.frequency.setValueAtTime(147.0, now);
    osc.frequency.linearRampToValueAtTime(110.0, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  },

  playWin() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Major triad arpeggio)
    
    notes.forEach((freq, idx) => {
      const noteDelay = idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + noteDelay);

      gain.gain.setValueAtTime(0.08, now + noteDelay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + noteDelay + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + noteDelay);
      osc.stop(now + noteDelay + 0.3);
    });
  }
};
