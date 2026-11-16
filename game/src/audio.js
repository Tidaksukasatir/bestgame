// Procedural WebAudio sounds: every effect is an oscillator (or a short noise
// burst) shaped by an envelope. Zero audio files, zero network. The context is
// created lazily on the first user gesture; screenshot mode never creates one.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx !== null || muted) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  /** Call from a user gesture (start button, first key) so sound is allowed. */
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function tone(freq0, freq1, dur, type, vol, when = 0) {
    const c = ensure();
    if (!c || !master) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq0, t0);
    if (freq1 !== freq0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    const c = ensure();
    if (!c || !master) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  return {
    unlock,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.22;
    },
    shoot() {
      tone(720, 240, 0.09, 'square', 0.16);
    },
    hit() {
      noise(0.07, 0.25, 2400);
      tone(190, 90, 0.08, 'triangle', 0.2);
    },
    enemyDie() {
      tone(320, 60, 0.18, 'sawtooth', 0.2);
      noise(0.12, 0.18, 1200);
    },
    pickup() {
      tone(880, 1320, 0.09, 'sine', 0.22);
    },
    hurt() {
      tone(140, 55, 0.25, 'sawtooth', 0.3);
      noise(0.15, 0.2, 700);
    },
    waveStart() {
      tone(392, 392, 0.12, 'triangle', 0.22);
      tone(523, 523, 0.12, 'triangle', 0.22, 0.12);
      tone(659, 659, 0.2, 'triangle', 0.22, 0.24);
    },
    waveClear() {
      tone(523, 523, 0.1, 'sine', 0.22);
      tone(659, 659, 0.1, 'sine', 0.22, 0.1);
      tone(784, 784, 0.18, 'sine', 0.22, 0.2);
    },
    boss() {
      tone(98, 49, 0.5, 'sawtooth', 0.3);
      tone(147, 73, 0.5, 'sawtooth', 0.2, 0.15);
    },
    buy() {
      tone(1046, 1568, 0.12, 'sine', 0.25);
    },
    denied() {
      tone(220, 160, 0.14, 'square', 0.18);
    },
    gameOver() {
      tone(392, 392, 0.25, 'triangle', 0.22);
      tone(311, 311, 0.25, 'triangle', 0.22, 0.25);
      tone(233, 155, 0.5, 'triangle', 0.22, 0.5);
    },
    victory() {
      tone(523, 523, 0.14, 'triangle', 0.22);
      tone(659, 659, 0.14, 'triangle', 0.22, 0.14);
      tone(784, 784, 0.14, 'triangle', 0.22, 0.28);
      tone(1046, 1046, 0.35, 'triangle', 0.25, 0.42);
    },
  };
}
