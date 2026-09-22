/** Lightweight synthesized SFX via Web Audio API. */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  volume = 0.08,
  slideTo?: number,
) {
  const audio = getCtx();
  if (!audio) return;
  const t0 = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  }
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(duration: number, volume = 0.05, filterFreq = 1200) {
  const audio = getCtx();
  if (!audio) return;
  const bufferSize = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  const gain = audio.createGain();
  gain.gain.value = volume;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  src.start();
}

export const audio = {
  resume() {
    getCtx();
  },
  setMuted(value: boolean) {
    muted = value;
  },
  isMuted() {
    return muted;
  },
  hit(tier: number) {
    noiseBurst(0.08 + tier * 0.02, 0.06 + tier * 0.015, 800 + tier * 400);
    tone(120 + tier * 40, 0.08, "triangle", 0.05);
  },
  breakRock() {
    noiseBurst(0.18, 0.09, 600);
    tone(90, 0.2, "sawtooth", 0.04, 40);
  },
  crystal(points: number) {
    const base = 440 + Math.min(points, 400);
    tone(base, 0.12, "sine", 0.07);
    tone(base * 1.5, 0.18, "sine", 0.05);
    tone(base * 2, 0.22, "triangle", 0.035);
  },
  empty() {
    tone(180, 0.1, "square", 0.03, 90);
  },
  unlockFanfare() {
    tone(523, 0.12, "square", 0.06);
    setTimeout(() => tone(659, 0.12, "square", 0.06), 90);
    setTimeout(() => tone(784, 0.2, "square", 0.07), 180);
  },
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => tone(f, 0.25, "triangle", 0.07), i * 140);
    });
  },
  ui() {
    tone(660, 0.05, "sine", 0.04);
  },
};
