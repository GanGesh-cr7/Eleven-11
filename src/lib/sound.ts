/**
 * Synthesised game sound effects (Web Audio API). No audio files and no
 * network requests: every sound is generated in the browser. Sounds are
 * on by default and the choice is remembered per device.
 */
const STORAGE_KEY = "eleven-sound";

let muted = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Browsers only allow audio after a user gesture; call from the first tap/key. */
export function unlockAudio() {
  audio();
}

export const soundStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  enabled: () => !muted,
  setEnabled(on: boolean) {
    muted = !on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      /* storage may be unavailable; the choice still applies to this tab */
    }
    if (muted && ctx) void ctx.suspend().catch(() => {});
    listeners.forEach((l) => l());
  },
};

type ToneOptions = {
  type?: OscillatorType;
  delay?: number;
  dur?: number;
  vol?: number;
  attack?: number;
  /** Glide to this frequency over the duration. */
  to?: number;
  /** Optional low-pass cutoff to soften bright waveforms. */
  lowpass?: number;
  out?: AudioNode;
};

function tone(freq: number, o: ToneOptions = {}) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.15;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const peak = o.vol ?? 0.25;
  const attack = o.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lowpass;
    osc.connect(f);
    node = f;
  }
  node.connect(gain);
  gain.connect(o.out ?? master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

type NoiseOptions = {
  delay?: number;
  dur?: number;
  vol?: number;
  filter?: BiquadFilterType;
  freq?: number;
  /** Sweep the filter to this frequency over the duration. */
  to?: number;
  q?: number;
  out?: AudioNode;
};

function noise(o: NoiseOptions = {}) {
  const c = audio();
  if (!c || !master) return;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.1;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = o.filter ?? "bandpass";
  filter.frequency.setValueAtTime(o.freq ?? 2000, t);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  filter.Q.value = o.q ?? 0.8;
  const gain = c.createGain();
  gain.gain.setValueAtTime(o.vol ?? 0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src
    .connect(filter)
    .connect(gain)
    .connect(o.out ?? master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

/** A short metallic "clink": a bright partial plus an inharmonic overtone. */
function clink(freq: number, vol: number, delay = 0) {
  tone(freq, { vol, dur: 0.16, delay });
  tone(freq * 2.76, { vol: vol * 0.35, dur: 0.09, delay });
  noise({ filter: "highpass", freq: 6000, dur: 0.02, vol: vol * 0.5, delay });
}

export const sfx = {
  /** Countdown clinks for 5…1, rising in pitch and volume as time runs out. */
  tick(secondsLeft: number) {
    const step = 5 - Math.max(1, Math.min(5, secondsLeft));
    clink(1250 + step * 140, 0.16 + step * 0.04);
  },
  timeUp() {
    tone(196, { type: "square", vol: 0.12, dur: 0.45, lowpass: 900 });
    tone(207, { type: "square", vol: 0.1, dur: 0.45, lowpass: 900 });
  },
  select() {
    tone(380, { vol: 0.22, dur: 0.1, to: 820 });
  },
  /** Ballot confirmed by the host: a whoosh into a two-note chime. */
  voted() {
    noise({ freq: 500, to: 3500, dur: 0.22, vol: 0.18, q: 1.2 });
    tone(1047, { vol: 0.2, dur: 0.6, delay: 0.14 });
    tone(1568, { vol: 0.16, dur: 0.7, delay: 0.22 });
  },
  /** Somebody else's vote arrived. */
  blip() {
    tone(880, { type: "triangle", vol: 0.1, dur: 0.08 });
  },
  everyoneIn() {
    [660, 880, 1320].forEach((f, i) =>
      tone(f, { type: "triangle", vol: 0.14, dur: 0.25, delay: i * 0.08 }),
    );
  },
  roundStart() {
    noise({ freq: 300, to: 2500, dur: 0.3, vol: 0.12, q: 1 });
    tone(523, { type: "triangle", vol: 0.16, dur: 0.18, delay: 0.18 });
    tone(784, { type: "triangle", vol: 0.18, dur: 0.35, delay: 0.3 });
  },
  join() {
    tone(587, { type: "triangle", vol: 0.15, dur: 0.14 });
    tone(880, { type: "triangle", vol: 0.15, dur: 0.25, delay: 0.1 });
  },
  leave() {
    tone(659, { type: "triangle", vol: 0.12, dur: 0.14 });
    tone(440, { type: "triangle", vol: 0.12, dur: 0.25, delay: 0.1 });
  },
  /** A snare roll that builds for `seconds`. Returns a stop function. */
  drumroll(seconds: number) {
    const c = audio();
    if (!c || !master) return () => {};
    const bus = c.createGain();
    bus.connect(master);
    const hits = Math.floor(seconds / 0.05);
    for (let i = 0; i < hits; i++) {
      const progress = i / hits;
      noise({
        delay: i * 0.05,
        dur: 0.06,
        vol: 0.1 + progress * progress * 0.5,
        freq: 1800,
        q: 0.7,
        out: bus,
      });
    }
    return () => {
      try {
        bus.gain.setTargetAtTime(0, c.currentTime, 0.03);
      } catch {
        /* context may already be closed */
      }
    };
  },
  /** One step of the rankings climbing up: pitch rises with each row. */
  rowTick(step: number) {
    tone(520 + Math.min(step, 12) * 45, {
      type: "triangle",
      vol: 0.1,
      dur: 0.07,
    });
  },
  /** Winner reveal: a cymbal crash and a bright brass-like arpeggio. */
  fanfare() {
    noise({ filter: "highpass", freq: 5000, dur: 1.3, vol: 0.16 });
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      tone(f, {
        type: "sawtooth",
        lowpass: 2200,
        vol: last ? 0.13 : 0.1,
        dur: last ? 0.8 : 0.16,
        delay: i * 0.11,
        attack: 0.02,
      });
    });
    tone(262, { type: "triangle", vol: 0.14, dur: 0.9, delay: 0.33 });
  },
  /** The crown landing. */
  sparkle(delay = 0) {
    [1568, 2093, 2637, 3136].forEach((f, i) =>
      tone(f, { vol: 0.08, dur: 0.22, delay: delay + i * 0.05 }),
    );
  },
  /** Nobody voted: a little sad trombone. */
  sadTrombone() {
    [392, 370, 349].forEach((f, i) =>
      tone(f, {
        type: "sawtooth",
        lowpass: 1200,
        vol: 0.1,
        dur: 0.3,
        delay: i * 0.3,
        attack: 0.03,
      }),
    );
    tone(330, {
      type: "sawtooth",
      lowpass: 1000,
      vol: 0.1,
      dur: 0.9,
      delay: 0.9,
      to: 300,
      attack: 0.03,
    });
  },
  /** End-of-game celebration. */
  celebrate() {
    sfx.fanfare();
    sfx.sparkle(0.5);
    sfx.sparkle(0.9);
  },
};
