import React, { useMemo, useState } from 'react';
import {
  Search, X, ListTodo, Sun, CalendarClock, Columns3, List, Filter, CheckCircle2, Archive, Sparkles, NotebookPen, ChevronDown, PartyPopper,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import {
  PRIORITIES, PRIORITY_MAP, STATUSES, addDays, categoryColor, isDone, isOverdue, isoToLocalDate, matchesSearch, relativeDayLabel, sortTasks, toISODate,
} from '../../lib/tasks';
import { TaskItem } from './TaskItem';
import { QuickAdd } from './QuickAdd';
import { cn, EmptyState, ProgressRing, Segmented, Skeleton } from '../ui';

const SORTS = [
  { id: 'smart', label: 'Smart' },
  { id: 'due', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status' },
  { id: 'created', label: 'Newest' },
  { id: 'title', label: 'A–Z' },
];
const GROUPS = [
  { id: 'date', label: 'Date' },
  { id: 'priority', label: 'Priority' },
  { id: 'category', label: 'Category' },
  { id: 'none', label: 'None' },
];

function groupTasks(list, mode, cats) {
  const now = new Date();
  if (mode === 'none') return [{ key: 'all', label: null, items: list }];
  const groups = new Map();
  const push = (key, label, t, extra) => {
    if (!groups.has(key)) groups.set(key, { key, label, items: [], ...extra });
    groups.get(key).items.push(t);
  };
  const today = toISODate(now);
  const tomorrow = toISODate(addDays(now, 1));
  const week = toISODate(addDays(now, 7));
  for (const t of list) {
    if (mode === 'priority') push(t.priority, PRIORITY_MAP[t.priority].label, t, { dot: PRIORITY_MAP[t.priority].dot });
    else if (mode === 'category') push(t.category || '~', t.category || 'No category', t, { color: t.category ? categoryColor(t.category, cats) : null });
    else if (isDone(t)) push('z-done', 'Completed', t);
    else if (isOverdue(t, now)) push('a-overdue', 'Overdue', t, { danger: true });
    else if (!t.due_date) push('y-none', 'No date', t);
    else if (t.due_date === today) push('b-today', 'Today', t);
    else if (t.due_date === tomorrow) push('c-tomorrow', 'Tomorrow', t);
    else if (t.due_date <= week) push('d-week', 'Next 7 days', t);
    else push('e-later', 'Later', t);
  }
  const order = mode === 'priority' ? ['urgent', 'high', 'medium', 'low'] : null;
  return [...groups.values()].sort((a, b) => (order ? order.indexOf(a.key) - order.indexOf(b.key) : a.key.localeCompare(b.key)));
}

function GroupList({ groups, showDate = true, emptyNode }) {
  const [collapsed, setCollapsed] = useState({});
  if (!groups.some((g) => g.items.length)) return emptyNode;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
              className="flex items-center gap-2 px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-subtle hover:text-fg"
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', collapsed[g.key] && '-rotate-90')} />
              {g.dot && <span className={cn('w-2 h-2 rounded-full', g.dot)} />}
              {g.color && <span className="w-2 h-2 rounded-[3px]" style={{ background: g.color }} />}
              <span className={g.danger ? 'text-rose-500' : ''}>{g.label}</span>
              <span className="text-subtle font-medium">{g.items.length}</span>
            </button>
          )}
          {!collapsed[g.key] && (
            <div className="stagger">
              {g.items.map((t) => (
                <TaskItem key={t.task_id} task={t} showDate={showDate} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Board({ tasks }) {
  const { updateTask } = useTasks();
  const [over, setOver] = useState(null);
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {STATUSES.map((s) => {
        const items = tasks.filter((t) => t.status === s.id);
        return (
          <div
            key={s.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s.id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/task-id');
              if (id) updateTask(id, { status: s.id });
            }}
            className={cn('card p-2 min-h-[200px] transition-colors', over === s.id && 'bg-accent/10 border-accent/50')}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-subtle">{s.label}</span>
              <span className="chip">{items.length}</span>
            </div>
            {items.length ? (
              items.map((t) => <TaskItem key={t.task_id} task={t} draggable compact />)
            ) : (
              <p className="text-xs text-subtle text-center py-8">Drop tasks here</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Reflection() {
  const { dailyJournal, updateJournalField } = useApp();
  const [open, setOpen] = useState(false);
  const fields = [
    { id: 'ideas', label: 'Ideas', placeholder: 'Any sparks of inspiration today?' },
    { id: 'knowledge', label: 'Knowledge', placeholder: 'What did you learn today?' },
    { id: 'moral', label: 'Moral', placeholder: 'Reflections on character or behaviour' },
    { id: 'negatives', label: 'Negatives', placeholder: 'What could have gone better?' },
  ];
  const filled = fields.filter((f) => dailyJournal[f.id]?.trim()).length;
  return (
    <section className="card p-0 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2 transition-colors" aria-expanded={open}>
        <span className="grid place-items-center w-8 h-8 rounded-xl bg-violet-500/15 text-violet-500 dark:text-violet-300">
          <NotebookPen className="w-4 h-4" />
        </span>
        <span className="flex-1">
          <span className="block font-display font-semibold text-[15px]">Daily reflection</span>
          <span className="block text-xs text-muted">{filled ? `${filled} of 4 notes written` : 'Close the day with a short note to yourself'}</span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-3 p-4 pt-0 anim-fade">
          {fields.map((f) => (
            <label key={f.id} className="block">
              <span className="label">{f.label}</span>
              <textarea
                value={dailyJournal[f.id] || ''}
                onChange={(e) => updateJournalField(f.id, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="field resize-none"
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

const LoadingList = () => (
  <div className="space-y-3 p-3">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="w-5 h-5 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/3 h-3" />
        </div>
      </div>
    ))}
  </div>
);

export function TasksView({ preset = 'tasks' }) {
  const { tasks, stats, categories, allTags, syncStatus, archiveCompleted } = useTasks();
  const { settings, updateSettingsSection } = useApp();
  const { openEditor } = useUI();
  const display = settings.taskDisplay;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('active');
  const [category, setCategory] = useState('');
  const [priorities, setPriorities] = useState([]);
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [layout, setLayout] = useState('list');
  const sort = display.defaultSort || 'smart';
  const groupBy = display.groupBy || 'date';
  const today = toISODate(new Date());

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => matchesSearch(t, query));
    if (preset === 'tasks') {
      if (tab === 'archived') list = list.filter((t) => t.archived);
      else list = list.filter((t) => !t.archived && (tab === 'completed' ? isDone(t) : layout === 'board' || !isDone(t)));
    } else list = list.filter((t) => !t.archived);
    if (category) list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    if (priorities.length) list = list.filter((t) => priorities.includes(t.priority));
    if (status) list = list.filter((t) => t.status === status);
    if (tag) list = list.filter((t) => t.tags.includes(tag));
    return sortTasks(list, tab === 'completed' ? 'created' : sort);
  }, [tasks, query, preset, tab, layout, category, priorities, status, tag, sort]);

  const activeFilters = Boolean(category || priorities.length || status || tag);
  const clearFilters = () => {
    setCategory('');
    setPriorities([]);
    setStatus('');
    setTag('');
  };

  const counts = useMemo(() => {
    const c = {};
    tasks.filter((t) => !t.archived && !isDone(t)).forEach((t) => (c[t.category.toLowerCase()] = (c[t.category.toLowerCase()] || 0) + 1));
    return c;
  }, [tasks]);

  // ---- page header ----
  const header = {
    tasks: { icon: ListTodo, title: 'My Tasks', sub: `${stats.pending} open · ${stats.completed} done` },
    today: { icon: Sun, title: 'Today', sub: new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) },
    upcoming: { icon: CalendarClock, title: 'Upcoming', sub: `${stats.upcoming} due in the next 7 days` },
  }[preset];

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks, tags, notes…" aria-label="Search tasks" className="field pl-9 pr-8" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn w-7 h-7">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setShowFilters((s) => !s)} className={cn('btn btn-ghost', (showFilters || activeFilters) && 'border-accent-ink/50 text-accent-ink')} aria-expanded={showFilters}>
          <Filter className="w-4 h-4" /> Filters{activeFilters ? ' •' : ''}
        </button>
        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select id="sort" className="field w-auto py-2" value={sort} onChange={(e) => updateSettingsSection('taskDisplay', 'defaultSort', e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>Sort: {s.label}</option>
          ))}
        </select>
        {preset === 'tasks' && (
          <Segmented
            size="sm"
            options={[
              { id: 'list', label: 'List', icon: List },
              { id: 'board', label: 'Board', icon: Columns3 },
            ]}
            value={layout}
            onChange={setLayout}
          />
        )}
      </div>

      {showFilters && (
        <div className="card p-4 grid sm:grid-cols-3 gap-4 anim-pop">
          <div>
            <span className="label">Priority</span>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => {
                const on = priorities.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPriorities((ps) => (on ? ps.filter((x) => x !== p.id) : [...ps, p.id]))}
                    className={cn('chip py-1', on && cn(p.soft, p.text, 'border-current'))}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-status">Status</label>
            <select id="f-status" className="field py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-tag">Tag</label>
            <select id="f-tag" className="field py-2" value={tag} onChange={(e) => setTag(e.target.value)} disabled={!allTags.length}>
              <option value="">{allTags.length ? 'Any tag' : 'No tags yet'}</option>
              {allTags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              Group by
              <Segmented size="sm" options={GROUPS} value={groupBy} onChange={(v) => updateSettingsSection('taskDisplay', 'groupBy', v)} />
            </div>
            {activeFilters && (
              <button type="button" className="text-sm font-semibold text-accent-ink" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        <button type="button" onClick={() => setCategory('')} className={cn('chip py-1.5 px-3', !category && 'bg-fg text-bg border-fg')}>
          All
        </button>
        {categories.map((c) => {
          const on = category.toLowerCase() === c.name.toLowerCase();
          return (
            <button
              key={c.name}
              type="button"
              aria-pressed={on}
              onClick={() => setCategory(on ? '' : c.name)}
              className={cn('chip py-1.5 px-3', on && 'text-fg')}
              style={on ? { borderColor: c.color, background: `color-mix(in oklab, ${c.color} 16%, transparent)` } : undefined}
            >
              <span className="w-2 h-2 rounded-[3px]" style={{ background: c.color }} />
              {c.name}
              {counts[c.name.toLowerCase()] ? <span className="text-subtle">{counts[c.name.toLowerCase()]}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const noResults = (
    <EmptyState
      icon={Search}
      title="Nothing matches"
      text="Try a different search or clear your filters."
      action={
        <button className="btn btn-ghost" onClick={() => { clearFilters(); setQuery(''); }}>
          Reset view
        </button>
      }
    />
  );
  const filtering = Boolean(query) || activeFilters;

  // ---- per-preset body ----
  let body;
  if (syncStatus === 'loading') body = <div className="card"><LoadingList /></div>;
  else if (preset === 'today') {
    const overdue = filtered.filter((t) => isOverdue(t) && t.due_date < today);
    const todayOpen = filtered.filter((t) => t.due_date === today && !isDone(t));
    const doneToday = filtered.filter((t) => isDone(t) && (t.due_date === today || isoToLocalDate(t.completed_at) === today));
    const total = stats.questTasks.length;
    const pct = total ? stats.questDone / total : 0;
    body = (
      <>
        <section className="card p-5 flex items-center gap-5">
          <ProgressRing value={pct} size={84} stroke={8}>
            <span className="font-display text-lg font-semibold">{Math.round(pct * 100)}%</span>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-lg">
              {total === 0 ? 'A clear day ahead' : stats.questDone === total ? 'All clear for today!' : `${total - stats.questDone} to go today`}
            </p>
            <p className="text-sm text-muted">
              {stats.questDone} of {total} done · {stats.completedToday}/{stats.dailyGoal} daily goal
            </p>
            <QuickAdd defaults={{ due_date: today }} className="mt-3" placeholder="Add a task for today…" />
          </div>
        </section>
        <section className="card p-2">
          {filtering && !overdue.length && !todayOpen.length && !doneToday.length ? (
            noResults
          ) : (
            <GroupList
              showDate={false}
              groups={[
                { key: 'o', label: overdue.length ? 'Overdue' : null, danger: true, items: overdue },
                { key: 't', label: overdue.length || doneToday.length ? 'Today' : null, items: todayOpen },
                { key: 'd', label: 'Done today', items: doneToday },
              ].filter((g) => g.items.length)}
              emptyNode={
                <EmptyState
                  icon={PartyPopper}
                  title="Nothing due today"
                  text="Enjoy the space, or pull something forward from Upcoming."
                  action={<button className="btn btn-primary" onClick={() => openEditor({ draft: { due_date: today } })}>Plan a task</button>}
                />
              }
            />
          )}
        </section>
        <Reflection />
      </>
    );
  } else if (preset === 'upcoming') {
    const future = filtered.filter((t) => !isDone(t) && t.due_date > today);
    const byDay = new Map();
    future.forEach((t) => {
      if (!byDay.has(t.due_date)) byDay.set(t.due_date, []);
      byDay.get(t.due_date).push(t);
    });
    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    body = (
      <>
        <QuickAdd defaults={{ due_date: toISODate(addDays(new Date(), 1)) }} placeholder="Plan ahead — “Dentist next Tuesday 10am”" />
        <section className="card p-2">
          <GroupList
            groups={days.map(([d, items]) => ({ key: d, label: relativeDayLabel(d), items }))}
            emptyNode={filtering ? noResults : <EmptyState icon={CalendarClock} title="No upcoming deadlines" text="Tasks with a future due date will line up here." />}
          />
        </section>
      </>
    );
  } else {
    body = (
      <>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Segmented
            options={[
              { id: 'active', label: 'Active', icon: ListTodo },
              { id: 'completed', label: 'Completed', icon: CheckCircle2 },
              { id: 'archived', label: 'Archived', icon: Archive },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'completed' && stats.completed > 0 && (
            <button className="btn btn-ghost" onClick={archiveCompleted}>
              <Archive className="w-4 h-4" /> Archive all completed
            </button>
          )}
        </div>
        {tab === 'active' && <QuickAdd />}
        {layout === 'board' && tab === 'active' ? (
          <Board tasks={filtered} />
        ) : (
          <section className="card p-2">
            <GroupList
              groups={tab === 'active' ? groupTasks(filtered, groupBy, categories) : [{ key: 'all', label: null, items: filtered }]}
              emptyNode={
                filtering ? (
                  noResults
                ) : tab === 'archived' ? (
                  <EmptyState icon={Archive} title="Archive is empty" text="Archived tasks are hidden from your lists but kept for your stats." />
                ) : tab === 'completed' ? (
                  <EmptyState icon={CheckCircle2} title="No completed tasks yet" text="Finish one and it lands here, with XP." />
                ) : (
                  <EmptyState icon={Sparkles} title="Your universe is empty" text="Type a task above in plain words. Dates, times and priority are picked up automatically." />
                )
              }
            />
          </section>
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <header.icon className="w-3.5 h-3.5" /> {header.sub}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">{header.title}</h1>
        </div>
      </div>
      {toolbar}
      {body}
    </div>
  );
}
