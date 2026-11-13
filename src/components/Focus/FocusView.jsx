import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2, Timer, CheckCircle2, History, Coffee, Brain } from 'lucide-react';
import { useFocus, FOCUS_MODES } from '../../context/FocusContext';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import { isDone, isoToLocalDate, relativeDayLabel, sortTasks, startOfWeek, toISODate } from '../../lib/tasks';
import { Card, CardHeader, EmptyState, ProgressRing, Segmented, cn } from '../ui';
import { pushBackHandler } from '../../lib/native';

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function TimerPanel({ immersive, setImmersive }) {
  const { timer, remaining, start, pause, reset, skip, setMode, setTaskId } = useFocus();
  const { tasks, toggleComplete } = useTasks();
  const { settings } = useApp();
  const openTasks = useMemo(() => sortTasks(tasks.filter((t) => !t.archived && !isDone(t)), 'smart'), [tasks]);
  const task = tasks.find((t) => t.task_id === timer.taskId);
  const progress = timer.total ? 1 - remaining / timer.total : 0;
  const isBreak = timer.mode !== 'focus';
  const size = immersive ? 300 : 240;

  return (
    <div className={cn('flex flex-col items-center text-center', immersive && 'justify-center min-h-full')}>
      <Segmented options={FOCUS_MODES} value={timer.mode} onChange={setMode} size="sm" />
      <div className="relative my-8">
        {timer.running && <div className={cn('absolute inset-6 rounded-full blur-3xl opacity-40', isBreak ? 'bg-cyan-400' : 'bg-accent')} />}
        <ProgressRing value={progress} size={size} stroke={immersive ? 12 : 10} color={isBreak ? '#22d3ee' : 'var(--accent)'}>
          <div>
            <p className="font-display font-semibold tabular-nums tracking-tight" style={{ fontSize: immersive ? 72 : 56, lineHeight: 1 }} aria-live="off">
              {fmt(remaining)}
            </p>
            <p className="text-xs font-semibold tracking-[0.2em] text-subtle mt-2 uppercase flex items-center justify-center gap-1.5">
              {isBreak ? <Coffee className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
              {isBreak ? 'Recharge' : timer.running ? 'Deep focus' : 'Ready'}
            </p>
          </div>
        </ProgressRing>
      </div>

      <div className="flex items-center gap-3">
        <button className="icon-btn w-12 h-12 rounded-2xl border border-line" onClick={reset} aria-label="Reset timer" title="Reset">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          className={cn('btn btn-primary w-36 h-14 text-base rounded-2xl', !timer.running && 'anim-pulse')}
          onClick={timer.running ? pause : start}
        >
          {timer.running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {timer.running ? 'Pause' : remaining < timer.total ? 'Resume' : 'Start'}
        </button>
        <button className="icon-btn w-12 h-12 rounded-2xl border border-line" onClick={skip} aria-label="Skip to next phase" title="Skip">
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-md mt-8">
        <label className="label text-left" htmlFor="focus-task">Focusing on</label>
        <div className="flex gap-2">
          <select id="focus-task" className="field" value={timer.taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Free focus (no task)</option>
            {openTasks.map((t) => (
              <option key={t.task_id} value={t.task_id}>{t.title}</option>
            ))}
          </select>
          {task && !isDone(task) && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                toggleComplete(task.task_id);
                setTaskId('');
              }}
              title="Mark task complete"
            >
              <CheckCircle2 className="w-4 h-4" /> Done
            </button>
          )}
        </div>
        {task?.subtasks.length > 0 && (
          <ul className="mt-3 text-left space-y-1">
            {task.subtasks.map((s) => (
              <li key={s.id} className={cn('text-sm flex items-center gap-2', s.done && 'line-through text-muted')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', s.done ? 'bg-accent' : 'bg-subtle')} />
                {s.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 mt-6 text-xs text-muted">
        <span>
          Cycle {(timer.cycles % (settings.focus.longBreakEvery || 4)) + 1} of {settings.focus.longBreakEvery || 4}
        </span>
        <span>·</span>
        <button className="inline-flex items-center gap-1.5 font-semibold text-accent-ink" onClick={() => setImmersive(!immersive)}>
          {immersive ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {immersive ? 'Exit distraction-free' : 'Distraction-free mode'}
        </button>
      </div>
    </div>
  );
}

export function FocusView() {
  const { sessions, tasks, stats } = useTasks();
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    if (!immersive) return;
    const onKey = (e) => e.key === 'Escape' && setImmersive(false);
    window.addEventListener('keydown', onKey);
    const popBack = pushBackHandler(() => setImmersive(false));
    return () => {
      window.removeEventListener('keydown', onKey);
      popBack();
    };
  }, [immersive]);

  const today = toISODate(new Date());
  const weekStart = toISODate(startOfWeek(new Date()));
  const todaySessions = sessions.filter((s) => isoToLocalDate(s.ended_at) === today);
  const weekMinutes = sessions.filter((s) => isoToLocalDate(s.ended_at) >= weekStart).reduce((a, s) => a + (Number(s.minutes) || 0), 0);
  const history = sessions.slice(0, 30);
  const grouped = history.reduce((acc, s) => {
    const d = isoToLocalDate(s.ended_at);
    (acc[d] ||= []).push(s);
    return acc;
  }, {});

  if (immersive) {
    return (
      <div className="fixed inset-0 z-[60] bg-bg overflow-y-auto p-6 anim-fade">
        <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_50%_40%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent)] pointer-events-none" />
        <div className="relative h-full">
          <TimerPanel immersive setImmersive={setImmersive} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" /> {stats.focusToday} of {stats.focusGoal} minutes today
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Focus Mode</h1>
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-4 items-start">
        <Card className="py-8">
          <TimerPanel immersive={false} setImmersive={setImmersive} />
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { v: todaySessions.filter((s) => s.completed).length, l: 'Sessions today' },
                { v: `${stats.focusToday}m`, l: 'Focus today' },
                { v: `${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`, l: 'This week' },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-surface-2 p-3">
                  <p className="font-display text-xl font-semibold">{x.v}</p>
                  <p className="text-[11px] text-muted mt-0.5">{x.l}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader icon={History} title="Session history" subtitle="Partial sessions over a minute are kept too" />
            {history.length ? (
              <div className="space-y-4 max-h-[420px] overflow-y-auto -mr-2 pr-2">
                {Object.entries(grouped).map(([day, list]) => (
                  <div key={day}>
                    <p className="eyebrow mb-1.5">{relativeDayLabel(day)}</p>
                    <ul className="space-y-1">
                      {list.map((s) => {
                        const t = tasks.find((x) => x.task_id === s.task_id);
                        return (
                          <li key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                            <span className={cn('grid place-items-center w-7 h-7 rounded-lg shrink-0', s.completed ? 'bg-accent/15 text-accent-ink' : 'bg-surface-3 text-subtle')}>
                              <Timer className="w-3.5 h-3.5" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm truncate">{t?.title || 'Free focus'}</span>
                              <span className="block text-[11px] text-subtle">
                                {new Date(s.ended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                {!s.completed && ' · stopped early'}
                              </span>
                            </span>
                            <span className="text-sm font-semibold tabular-nums">{s.minutes}m</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState className="py-6" icon={History} title="No sessions yet" text="Finish your first focus block to start your history." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
