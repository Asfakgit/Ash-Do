import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, CalendarX2 } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useUI } from '../../context/UIContext';
import { PRIORITY_MAP, PRIORITY_RANK, addDays, isDone, isOverdue, relativeDayLabel, sortTasks, startOfWeek, toISODate } from '../../lib/tasks';
import { TaskItem } from '../Tasks/TaskItem';
import { cn, EmptyState } from '../ui';

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(new Date(2026, 0, 5)), i).toLocaleDateString([], { weekday: 'short' }));

export function CalendarView() {
  const { tasks, updateTask } = useTasks();
  const { openEditor, toast } = useUI();
  const today = toISODate(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);
  const [dragOver, setDragOver] = useState(null);

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

  const onDrop = (e, iso) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/task-id');
    const t = tasks.find((x) => x.task_id === id);
    if (!t || t.due_date === iso) return;
    const prev = t.due_date;
    updateTask(id, { due_date: iso });
    setSelected(iso);
    toast({ title: 'Rescheduled', description: `${t.title} → ${relativeDayLabel(iso)}`, action: { label: 'Undo', onClick: () => updateTask(id, { due_date: prev }) } });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> {monthOpen} open · {monthTasks.length - monthOpen} done this month
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
            {cursor.toLocaleDateString([], { month: 'long' })} <span className="text-subtle">{cursor.getFullYear()}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={goToday}>Today</button>
          <button className="icon-btn border border-line" aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="icon-btn border border-line" aria-label="Next month" onClick={() => move(1)}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_340px] gap-4 items-start">
        <section className="card p-2 sm:p-3">
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(iso);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === iso ? null : v))}
                  onDrop={(e) => onDrop(e, iso)}
                  className={cn(
                    'relative rounded-2xl p-1.5 sm:p-2 min-h-[56px] sm:min-h-[104px] text-left transition-all cursor-pointer border',
                    inMonth ? 'bg-surface-2/60' : 'bg-transparent opacity-45',
                    isSel ? 'border-accent-ink/60 bg-accent/10' : 'border-transparent hover:border-line-strong',
                    dragOver === iso && 'border-accent bg-accent/20 scale-[1.02]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'grid place-items-center w-6 h-6 rounded-full text-xs font-semibold',
                        isToday ? 'bg-accent text-on-accent' : 'text-muted'
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {overdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Overdue tasks" />}
                  </div>
                  {/* mobile: dots */}
                  <div className="flex gap-0.5 mt-1 sm:hidden flex-wrap">
                    {list.slice(0, 4).map((t) => (
                      <span key={t.task_id} className={cn('w-1.5 h-1.5 rounded-full', isDone(t) ? 'bg-subtle/50' : PRIORITY_MAP[t.priority].dot)} />
                    ))}
                  </div>
                  {/* desktop: pills */}
                  <div className="hidden sm:block space-y-1 mt-1">
                    {list.slice(0, 3).map((t) => (
                      <div
                        key={t.task_id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/task-id', t.task_id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor({ task: t });
                        }}
                        title={t.title}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[11px] font-medium truncate cursor-grab active:cursor-grabbing',
                          isDone(t) ? 'text-subtle line-through' : cn(PRIORITY_MAP[t.priority].soft, 'text-fg')
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_MAP[t.priority].dot)} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {list.length > 3 && <p className="text-[11px] text-subtle px-1.5">+{list.length - 3} more</p>}
                  </div>
                  {open.length > 0 && <span className="sr-only">{open.length} open</span>}
                </div>
              );
            })}
          </div>
          <p className="hidden sm:block text-xs text-subtle mt-3 px-1">Drag a task onto another day to reschedule · double-click a day to add a task</p>
        </section>

        <section className="card p-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 className="font-display font-semibold text-lg">{relativeDayLabel(selected)}</h2>
            </div>
            <button className="btn btn-primary px-3" onClick={() => openEditor({ draft: { due_date: selected } })}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {selectedTasks.length ? (
            <div className="-mx-2 stagger">
              {selectedTasks.map((t) => (
                <TaskItem key={t.task_id} task={t} showDate={false} draggable compact />
              ))}
            </div>
          ) : (
            <EmptyState className="py-8" icon={CalendarX2} title="Nothing scheduled" text="A free day. Add something or enjoy it." />
          )}
        </section>
      </div>
    </div>
  );
}
