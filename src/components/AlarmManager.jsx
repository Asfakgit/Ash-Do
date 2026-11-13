import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

// Offline alarm: a soft three-note chime synthesised with Web Audio (no audio files, no network).
let ctx = null;
const getCtx = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

function chime(volume = 0.8) {
  const ac = getCtx();
  if (!ac) return;
  const notes = [880, 1174.66, 1567.98]; // A5, D6, G6
  const start = ac.currentTime + 0.02;
  for (let rep = 0; rep < 2; rep++) {
    notes.forEach((f, i) => {
      const t = start + rep * 0.9 + i * 0.16;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25 * volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
  }
}

export const AlarmManager = () => {
  const { settings } = useApp();
  useEffect(() => {
    // Browsers only allow audio after a user gesture: unlock on first interaction.
    const unlock = () => getCtx();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.playAlarm = () => {
      if (settings?.alarm?.enabled !== false) chime(settings?.alarm?.volume ?? 0.8);
    };
    window.stopAlarm = () => ctx?.suspend().catch(() => {});
    return () => {
      window.removeEventListener('pointerdown', unlock);
      delete window.playAlarm;
      delete window.stopAlarm;
    };
  }, [settings]);
  return null;
};
