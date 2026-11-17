import type { CaseRarity } from "./types";

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) {
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume();
  }
  return sharedCtx;
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playCaseUnlockSound(muted = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Metallic key latch click
  const clickSrc = ctx.createBufferSource();
  clickSrc.buffer = createNoiseBuffer(ctx, 0.04);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2800, now);
  bp.Q.setValueAtTime(2.5, now);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.28, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
  clickSrc.connect(bp).connect(clickGain).connect(ctx.destination);
  clickSrc.start(now);

  // 2. Heavy latch thud
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(125, now + 0.02);
  thud.frequency.exponentialRampToValueAtTime(42, now + 0.14);
  thudGain.gain.setValueAtTime(0.32, now + 0.02);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  thud.connect(thudGain).connect(ctx.destination);
  thud.start(now + 0.02);
  thud.stop(now + 0.16);

  // 3. Mechanical slide release chime
  const latch = ctx.createOscillator();
  const latchGain = ctx.createGain();
  latch.type = "triangle";
  latch.frequency.setValueAtTime(1600, now + 0.09);
  latch.frequency.exponentialRampToValueAtTime(760, now + 0.17);
  latchGain.gain.setValueAtTime(0.14, now + 0.09);
  latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  latch.connect(latchGain).connect(ctx.destination);
  latch.start(now + 0.09);
  latch.stop(now + 0.19);
}

export function playCaseTickSound(progress01: number, muted = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const pitchFactor = 1.08 - progress01 * 0.22;

  // Crisp woody/metallic transient (CS2 reel tick)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1180 * pitchFactor, now);
  osc.frequency.exponentialRampToValueAtTime(410 * pitchFactor, now + 0.024);

  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.028);

  // Micro transient snap
  const snap = ctx.createBufferSource();
  snap.buffer = createNoiseBuffer(ctx, 0.014);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3400 * pitchFactor, now);
  filter.Q.setValueAtTime(2.0, now);
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.09, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);
  snap.connect(filter).connect(snapGain).connect(ctx.destination);
  snap.start(now);
}

export function playCaseRevealSound(rarity: CaseRarity, muted = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Bass drop impact (stronger for higher rarities)
  const bassAmp =
    rarity === "gold"
      ? 0.42
      : rarity === "covert" || rarity === "classified"
        ? 0.34
        : 0.22;
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(92, now);
  sub.frequency.exponentialRampToValueAtTime(36, now + 0.38);
  subGain.gain.setValueAtTime(bassAmp, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  sub.connect(subGain).connect(ctx.destination);
  sub.start(now);
  sub.stop(now + 0.44);

  if (rarity === "gold") {
    // Legendary CS2 golden fanfare arpeggio
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, i) => {
      const start = now + i * 0.075;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc2.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      osc2.frequency.setValueAtTime(freq * 2, start);
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.16, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.72);
      osc.connect(g);
      osc2.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc2.start(start);
      osc.stop(start + 0.75);
      osc2.stop(start + 0.75);
    });
    return;
  }

  const chord =
    rarity === "covert"
      ? [329.63, 493.88, 659.25, 783.99]
      : rarity === "classified"
        ? [349.23, 440.0, 523.25, 698.46]
        : [392.0, 493.88, 587.33];

  chord.forEach((freq, idx) => {
    const start = now + idx * 0.035;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = rarity === "covert" || rarity === "classified" ? "sawtooth" : "triangle";

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200, start);
    lp.frequency.exponentialRampToValueAtTime(750, start + 0.55);

    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.001, start);
    g.gain.linearRampToValueAtTime(0.11, start + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.62);

    osc.connect(lp).connect(g).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}
