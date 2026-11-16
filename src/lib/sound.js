// Alarm sounds synthesised with Web Audio: no audio files, works offline, plays while the app is open.
// (When the app is closed, Android plays the bundled res/raw sounds through the notification channels.)

export const ALARM_TONES = [
  { id: 'chime', label: 'Chime' },
  { id: 'bell', label: 'Bell' },
  { id: 'beep', label: 'Beep' },
  { id: 'digital', label: 'Digital' },
];

let ctx = null;
const getCtx = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// Browsers only allow audio after a user gesture; call this from the first tap.
export const unlockAudio = () => getCtx();

function note(ac, out, { f, t, dur, type = 'sine', peak = 0.25, attack = 0.01 }) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = f;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Each pattern lasts under ~2 s so it can repeat while ringing.
const PATTERNS = {
  chime(ac, out, t0) {
    [880, 1174.66, 1567.98].forEach((f, i) => note(ac, out, { f, t: t0 + i * 0.16, dur: 0.9 }));
  },
  bell(ac, out, t0) {
    // Struck bell: a fundamental plus inharmonic partials, two strikes.
    [0, 0.7].forEach((dt) =>
      [
        [660, 0.3],
        [660 * 2.76, 0.12],
        [660 * 5.4, 0.06],
      ].forEach(([f, peak]) => note(ac, out, { f, t: t0 + dt, dur: 1.3, peak, attack: 0.005 }))
    );
  },
  beep(ac, out, t0) {
    // Classic alarm clock: two bursts of four short beeps.
    for (let b = 0; b < 2; b++) for (let i = 0; i < 4; i++) note(ac, out, { f: 1000, t: t0 + b * 0.8 + i * 0.14, dur: 0.08, type: 'square', peak: 0.12, attack: 0.005 });
  },
  digital(ac, out, t0) {
    for (let i = 0; i < 6; i++) note(ac, out, { f: i % 2 ? 660 : 990, t: t0 + i * 0.18, dur: 0.16, type: 'triangle', peak: 0.22, attack: 0.005 });
  },
};

export function playTone(tone = 'chime', volume = 0.8) {
  const ac = getCtx();
  if (!ac) return;
  const out = ac.createGain();
  out.gain.value = Math.max(0, Math.min(1, volume));
  out.connect(ac.destination);
  (PATTERNS[tone] || PATTERNS.chime)(ac, out, ac.currentTime + 0.03);
}

// ---------- ringing: repeat the tone (and vibrate) until stopped ----------
let ringTimer = null;
let ringStop = null;
export function startRinging(tone, volume, { maxMs = 60000, vibrate = true } = {}) {
  stopRinging();
  const ring = () => {
    playTone(tone, volume);
    if (vibrate) navigator.vibrate?.([400, 200, 400]);
  };
  ring();
  ringTimer = setInterval(ring, 2200);
  ringStop = setTimeout(stopRinging, maxMs); // never ring forever
}
export function stopRinging() {
  clearInterval(ringTimer);
  clearTimeout(ringStop);
  ringTimer = ringStop = null;
  navigator.vibrate?.(0);
}
