import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { useTasks } from './TaskContext';
import { usePersistentState } from './AuthContext';
import { useUI } from './UIContext';
import { notifyNow } from '../lib/native';

const FocusContext = createContext();

export const FOCUS_MODES = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
];

export const FocusProvider = ({ children }) => {
  const { settings } = useApp();
  const { addFocusSession, tasks } = useTasks();
  const { toast } = useUI();
  const cfg = settings.focus;
  const durationOf = useCallback(
    (mode) => Math.max(1, Number(mode === 'focus' ? cfg.work : mode === 'short' ? cfg.shortBreak : cfg.longBreak) || 1) * 60000,
    [cfg]
  );

  const [timer, setTimer] = usePersistentState(
    'focusTimer',
    () => {
      const total = (Number(settings.focus.work) || 25) * 60000;
      return { mode: 'focus', running: false, endsAt: null, remaining: total, total, cycles: 0, taskId: '', startedAt: null };
    },
    (v, base) => (v && ['focus', 'short', 'long'].includes(v.mode) && Number.isFinite(v.total) ? v : base)
  );
  const [tick, setTick] = useState(() => Date.now());
  const completing = useRef(null);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  // Keep an idle timer in sync with changed durations
  useEffect(() => {
    setTimer((t) => {
      const total = durationOf(t.mode);
      if (!t.running && t.remaining === t.total && t.total !== total) return { ...t, total, remaining: total };
      return t;
    });
  }, [durationOf, setTimer]);

  const remaining = timer.running ? Math.max(0, timer.endsAt - tick) : timer.remaining;

  const recordPartial = useCallback(
    (t, endedAt = Date.now()) => {
      if (t.mode !== 'focus' || !t.startedAt) return;
      const elapsedMs = t.total - (t.running ? Math.max(0, t.endsAt - endedAt) : t.remaining);
      if (elapsedMs >= 60000) {
        addFocusSession({
          task_id: t.taskId || '',
          minutes: Math.round(elapsedMs / 60000),
          started_at: t.startedAt,
          ended_at: new Date(endedAt).toISOString(),
          completed: false,
        });
      }
    },
    [addFocusSession]
  );

  const finishPhase = useCallback(
    (t) => {
      const endedAt = t.endsAt || Date.now();
      let mode = 'focus';
      let cycles = t.cycles;
      if (t.mode === 'focus') {
        addFocusSession({
          task_id: t.taskId || '',
          minutes: Math.round(t.total / 60000),
          started_at: t.startedAt || new Date(endedAt - t.total).toISOString(),
          ended_at: new Date(endedAt).toISOString(),
          completed: true,
        });
        cycles += 1;
        mode = cycles % Math.max(1, Number(cfg.longBreakEvery) || 4) === 0 ? 'long' : 'short';
        const taskTitle = tasks.find((x) => x.task_id === t.taskId)?.title;
        toast({ title: 'Focus session complete', description: taskTitle ? `Nice work on “${taskTitle}”. Take a breather.` : 'Take a breather.', tone: 'reward' });
      } else {
        toast({ title: 'Break over', description: 'Ready for the next focus block?' });
      }
      if (window.playAlarm) window.playAlarm();
      if (document.visibilityState !== 'visible') notifyNow(t.mode === 'focus' ? 'Focus session complete' : 'Break over', 'Ash Do');
      const total = durationOf(mode);
      const autoStart = mode !== 'focus' && cfg.autoStartBreaks;
      const nowMs = Date.now();
      setTimer({
        ...t,
        mode,
        cycles,
        total,
        remaining: total,
        running: autoStart,
        endsAt: autoStart ? nowMs + total : null,
        startedAt: autoStart ? new Date(nowMs).toISOString() : null,
      });
    },
    [addFocusSession, cfg, durationOf, tasks, toast, setTimer]
  );

  useEffect(() => {
    if (!timer.running) return;
    const check = () => {
      const now = Date.now();
      setTick(now);
      if (now >= timer.endsAt && completing.current !== timer.endsAt) {
        completing.current = timer.endsAt;
        finishPhase(timer);
      }
    };
    check();
    const i = setInterval(check, 500);
    return () => clearInterval(i);
  }, [timer, finishPhase]);

  // Show the countdown in the tab title while running
  useEffect(() => {
    if (!timer.running) {
      document.title = 'Ash Do';
      return;
    }
    const s = Math.ceil(remaining / 1000);
    document.title = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} — Ash Do`;
  }, [remaining, timer.running, timer.mode]);

  const start = useCallback(() => {
    const t = timerRef.current;
    if (t.running) return;
    const nowMs = Date.now();
    setTick(nowMs);
    setTimer({ ...t, running: true, endsAt: nowMs + t.remaining, startedAt: t.startedAt || new Date(nowMs).toISOString() });
  }, [setTimer]);

  const pause = useCallback(() => {
    setTimer((t) => (t.running ? { ...t, running: false, remaining: Math.max(0, t.endsAt - Date.now()), endsAt: null } : t));
  }, [setTimer]);

  // Switch phase; any focus time already spent (>= 1 min) is still logged.
  const switchTo = useCallback(
    (modeFor) => {
      const t = timerRef.current;
      recordPartial(t);
      const mode = modeFor(t);
      const total = durationOf(mode);
      setTimer({ ...t, mode, running: false, endsAt: null, remaining: total, total, startedAt: null });
    },
    [durationOf, recordPartial, setTimer]
  );
  const reset = useCallback(() => switchTo((t) => t.mode), [switchTo]);
  const skip = useCallback(() => switchTo((t) => (t.mode === 'focus' ? 'short' : 'focus')), [switchTo]);
  const setMode = useCallback(
    (mode) => {
      if (timerRef.current.mode !== mode) switchTo(() => mode);
    },
    [switchTo]
  );

  const setTaskId = useCallback((taskId) => setTimer((t) => ({ ...t, taskId })), [setTimer]);

  return (
    <FocusContext.Provider value={{ timer, remaining, start, pause, reset, skip, setMode, setTaskId }}>{children}</FocusContext.Provider>
  );
};

export const useFocus = () => useContext(FocusContext);
