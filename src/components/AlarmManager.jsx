import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BellRing, NotebookPen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playTone, startRinging, stopRinging, unlockAudio } from '../lib/sound';
import { pushBackHandler } from '../lib/native';
import { cn } from './ui';

// In-app alarm: a sheet that rings (repeating sound + vibration) until the person acts on it.
// ring({ id, kind: 'task' | 'diary', title, body, loud, actions: [{ label, icon, primary, onClick }] })
//   loud = false for reminders that were missed while the app was closed: shown, not rung.
const AlarmContext = createContext({ ring: () => {} });
export const useAlarm = () => useContext(AlarmContext);

export function AlarmProvider({ children }) {
  const { settings } = useApp();
  const cfg = settings.alarm;
  const [queue, setQueue] = useState([]);
  const current = queue[0];

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    // One-off sound (focus timer, sound preview)
    window.playAlarm = () => {
      if (cfg.enabled !== false) playTone(cfg.tone, cfg.volume ?? 0.8);
    };
    return () => {
      window.removeEventListener('pointerdown', unlock);
      delete window.playAlarm;
    };
  }, [cfg]);

  const ring = useCallback((alarm) => setQueue((q) => (q.some((a) => a.id === alarm.id) ? q : [...q, alarm])), []);
  const close = useCallback(() => setQueue((q) => q.slice(1)), []);

  useEffect(() => {
    if (!current) return;
    if (current.loud && cfg.enabled !== false) startRinging(cfg.tone, cfg.volume ?? 0.8);
    const popBack = pushBackHandler(close);
    return () => {
      stopRinging();
      popBack();
    };
  }, [current, cfg.enabled, cfg.tone, cfg.volume, close]);

  const Icon = current?.kind === 'diary' ? NotebookPen : BellRing;
  const [primary, ...rest] = current?.actions || [];

  return (
    <AlarmContext.Provider value={{ ring }}>
      {children}
      {current && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" aria-describedby="alarm-body">
          <div className="absolute inset-0 bg-black/60 anim-fade" />
          <div className="relative w-full max-w-lg bg-surface rounded-t-3xl border-t border-line px-5 pt-7 pb-5 safe-bottom anim-sheet text-center">
            <span className={cn('mx-auto grid place-items-center w-16 h-16 rounded-full bg-accent text-on-accent', current.loud && 'anim-ring')}>
              <Icon className="w-7 h-7" />
            </span>
            <p className="eyebrow mt-4">{current.kind === 'diary' ? 'Diary' : current.loud ? 'Reminder' : 'Missed reminder'}</p>
            <h2 id="alarm-title" className="font-display text-xl font-semibold mt-1 break-words">{current.title}</h2>
            {current.body && <p id="alarm-body" className="text-sm text-muted mt-1">{current.body}</p>}

            <div className="mt-6 space-y-2">
              {primary && (
                <button
                  type="button"
                  className="btn btn-primary w-full h-12 text-base"
                  onClick={() => {
                    close();
                    primary.onClick?.();
                  }}
                >
                  {primary.icon && <primary.icon className="w-5 h-5" />}
                  {primary.label}
                </button>
              )}
              {rest.length > 0 && (
                <div className={cn('grid gap-2', rest.length > 1 && 'grid-cols-2')}>
                  {rest.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className="btn btn-ghost h-12"
                      onClick={() => {
                        close();
                        a.onClick?.();
                      }}
                    >
                      {a.icon && <a.icon className="w-4 h-4" />}
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className={primary ? 'w-full py-2.5 text-sm font-semibold text-muted' : 'btn btn-primary w-full h-12 text-base'} onClick={close}>
                {primary ? 'Dismiss' : 'Stop'}
              </button>
            </div>
            {queue.length > 1 && <p className="text-xs text-subtle">{queue.length - 1} more waiting</p>}
          </div>
        </div>
      )}
    </AlarmContext.Provider>
  );
}
