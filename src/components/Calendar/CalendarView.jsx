import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarX2 } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useUI } from '../../context/UIContext';
import { PRIORITY_MAP, PRIORITY_RANK, addDays, isDone, isOverdue, relativeDayLabel, sortTasks, startOfWeek, toISODate } from '../../lib/tasks';
import { TaskItem } from '../Tasks/TaskItem';
import { cn, EmptyState } from '../ui';

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(new Date(2026, 0, 5)), i).toLocaleDateString([], { weekday: 'short' }));

export function CalendarView() {
  const { tasks } = useTasks();
  const { openEditor } = useUI();
  const today = toISODate(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const m = {};
    for (const t of tasks) {
      if (t.archived || !t.due_date) continue;
      (m[t.due_date] ||= []).push(t);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    return m;
  }, [tasks]);

  const days = useMemo(() => {
    const start = startOfWeek(cursor);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const end = addDays(startOfWeek(last), 6);
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor]);

  const monthTasks = days.filter((d) => d.getMonth() === cursor.getMonth()).flatMap((d) => byDay[toISODate(d)] || []);
  const monthOpen = monthTasks.filter((t) => !isDone(t)).length;
  const selectedTasks = sortTasks(byDay[selected] || [], 'due');

  const move = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => {
    const d = new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelected(today);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <button className="icon-btn" aria-label="Previous month" onClick={() => move(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-display font-semibold">
            {cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-muted">{monthOpen} open · {monthTasks.length - monthOpen} done</p>
        </div>
        <button className="icon-btn" aria-label="Next month" onClick={() => move(1)}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <section className="card p-2">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wider text-subtle py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = toISODate(d);
              const list = byDay[iso] || [];
              const inMonth = d.getMonth() === cursor.getMonth();
              const isSel = iso === selected;
              const isToday = iso === today;
              const overdue = list.some((t) => isOverdue(t));
              const open = list.filter((t) => !isDone(t));
              return (
                <div
                  key={iso}
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.toDateString()}, ${list.length} tasks`}
                  aria-pressed={isSel}
                  onClick={() => setSelected(iso)}
                  onDoubleClick={() => openEditor({ draft: { due_date: iso } })}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(iso)}
                  className={cn(
                    'relative rounded-xl p-1 min-h-[48px] flex flex-col items-center transition-all cursor-pointer border',
                    inMonth ? '' : 'opacity-40',
                    isSel ? 'border-accent-ink/50 bg-accent/10' : 'border-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'grid place-items-center w-7 h-7 rounded-full text-sm font-medium',
                      isToday ? 'bg-accent text-on-accent font-semibold' : 'text-fg'
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 h-1.5">
                    {list.slice(0, 3).map((t) => (
                      <span
                        key={t.task_id}
                        className={cn('w-1.5 h-1.5 rounded-full', isDone(t) ? 'bg-subtle/50' : overdue && isOverdue(t) ? 'bg-rose-500' : PRIORITY_MAP[t.priority].dot)}
                      />
                    ))}
                  </div>
                  {open.length > 0 && <span className="sr-only">{open.length} open</span>}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
              {relativeDayLabel(selected)} <span className="font-medium opacity-70">{selectedTasks.length || ''}</span>
            </p>
            <div className="flex items-center gap-3">
              {selected !== today && (
                <button className="text-xs font-semibold text-accent-ink" onClick={goToday}>Today</button>
              )}
              <button className="icon-btn w-7 h-7" aria-label={`Add task on ${relativeDayLabel(selected)}`} onClick={() => openEditor({ draft: { due_date: selected } })}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {selectedTasks.length ? (
            <div className="card p-1">
              {selectedTasks.map((t) => (
                <TaskItem key={t.task_id} task={t} showDate={false} />
              ))}
            </div>
          ) : (
            <EmptyState className="py-8" icon={CalendarX2} title="Nothing scheduled" text="Tap + to add something." />
          )}
        </section>
      </div>
    </div>
  );
}
