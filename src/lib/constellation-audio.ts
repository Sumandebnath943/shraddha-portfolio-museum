// Procedural ambient sound for the constellation — no audio assets, just a few
// detuned oscillators through a slow filter for a cosmic drone, plus a soft
// chime when a star is focused. Everything is gated behind a user gesture
// (browser autoplay policy) and starts muted; the UI toggle calls start()/stop().

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let drone: { stop: () => void } | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function startDrone() {
  if (!ctx || !master || drone) return;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 520;
  filter.Q.value = 0.6;
  filter.connect(master);

  // a slow LFO breathing the filter cutoff
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const freqs = [55, 82.4, 110, 164.8]; // A1 / E2 / A2 / E3 — open, calm
  const oscs = freqs.map((f, i) => {
    const o = ctx!.createOscillator();
    o.type = i % 2 === 0 ? "sine" : "triangle";
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 4;
    const g = ctx!.createGain();
    g.gain.value = 0.16 / (i + 1);
    o.connect(g).connect(filter);
    o.start();
    return { o, g };
  });

  drone = {
    stop: () => {
      try {
        lfo.stop();
        oscs.forEach(({ o }) => o.stop());
      } catch {
        /* already stopped */
      }
    },
  };
}

export function startAmbient() {
  const c = ensureCtx();
  if (!c || !master) return;
  startDrone();
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setTargetAtTime(0.5, c.currentTime, 1.4);
}

export function stopAmbient() {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
}

// soft bell when a star is reached / focused
export function chime(semitone = 0) {
  const c = ensureCtx();
  if (!c || !master) return;
  const base = 523.25 * Math.pow(2, semitone / 12); // C5 transposed
  [1, 2.01, 3.0].forEach((mult, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = base * mult;
    const t = c.currentTime;
    const peak = 0.12 / (i + 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + 1.7);
  });
}

// rising sweep for the hyperspace jump into the museum
export function warpSweep() {
  const c = ensureCtx();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  const t = c.currentTime;
  o.frequency.setValueAtTime(80, t);
  o.frequency.exponentialRampToValueAtTime(1400, t + 1.0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800;
  o.connect(filter).connect(g).connect(master);
  o.start(t);
  o.stop(t + 1.15);
}
