import React, { useMemo, useState } from 'react';
import { Search, X, SlidersHorizontal, CheckCircle2, Archive, Sparkles, ChevronDown } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import {
  PRIORITIES, PRIORITY_MAP, STATUSES, addDays, categoryColor, isDone, isOverdue, matchesSearch, sortTasks, toISODate,
} from '../../lib/tasks';
import { TaskItem } from './TaskItem';
import { cn, EmptyState, Segmented, Skeleton } from '../ui';

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
              className="flex items-center gap-1.5 px-1 mb-1.5 text-xs font-semibold uppercase tracking-wider text-subtle"
              aria-expanded={!collapsed[g.key]}
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', collapsed[g.key] && '-rotate-90')} />
              {g.dot && <span className={cn('w-2 h-2 rounded-full', g.dot)} />}
              {g.color && <span className="w-2 h-2 rounded-[3px]" style={{ background: g.color }} />}
              <span className={g.danger ? 'text-rose-500' : ''}>{g.label}</span>
              <span className="font-medium opacity-70">{g.items.length}</span>
            </button>
          )}
          {!collapsed[g.key] && (
            <div className="card p-1">
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

export function TasksView() {
  const { tasks, stats, categories, allTags, syncStatus, archiveCompleted } = useTasks();
  const { settings } = useApp();
  const display = settings.taskDisplay;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('active');
  const [category, setCategory] = useState('');
  const [priorities, setPriorities] = useState([]);
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const sort = display.defaultSort || 'smart';
  const groupBy = display.groupBy || 'date';

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => matchesSearch(t, query));
    if (tab === 'archived') list = list.filter((t) => t.archived);
    else list = list.filter((t) => !t.archived && (tab === 'completed' ? isDone(t) : !isDone(t)));
    if (category) list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    if (priorities.length) list = list.filter((t) => priorities.includes(t.priority));
    if (status) list = list.filter((t) => t.status === status);
    if (tag) list = list.filter((t) => t.tags.includes(tag));
    return sortTasks(list, tab === 'completed' ? 'created' : sort);
  }, [tasks, query, tab, category, priorities, status, tag, sort]);

  const activeFilters = Boolean(priorities.length || status || tag);
  const filtering = Boolean(query || category) || activeFilters;
  const resetAll = () => {
    setCategory('');
    setPriorities([]);
    setStatus('');
    setTag('');
    setQuery('');
  };

  const emptyNode = filtering ? (
    <EmptyState icon={Search} title="Nothing matches" text="Try a different search or filter." action={<button className="btn btn-ghost" onClick={resetAll}>Reset</button>} />
  ) : tab === 'archived' ? (
    <EmptyState icon={Archive} title="Archive is empty" text="Archived tasks are hidden from your lists." />
  ) : tab === 'completed' ? (
    <EmptyState icon={CheckCircle2} title="No completed tasks yet" text="Finished tasks show up here." />
  ) : (
    <EmptyState icon={Sparkles} title="No tasks yet" text="Tap + below to add your first task." />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search tasks" className="field pl-9 pr-8" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-8 h-8">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-label="Filters"
          aria-expanded={showFilters}
          className={cn('relative icon-btn w-[42px] h-[42px] rounded-[14px] border border-line bg-surface-2', (showFilters || activeFilters) && 'text-accent-ink border-accent-ink/50')}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilters && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent-ink" />}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 space-y-4 anim-pop">
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
                    className={cn('chip py-1.5 px-3', on && cn(p.soft, p.text, 'border-current'))}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="f-status">Status</label>
              <select id="f-status" className="field py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Any</option>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-tag">Tag</label>
              <select id="f-tag" className="field py-2" value={tag} onChange={(e) => setTag(e.target.value)} disabled={!allTags.length}>
                <option value="">{allTags.length ? 'Any' : 'No tags'}</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </div>
          </div>
          {activeFilters && (
            <button
              type="button"
              className="text-sm font-semibold text-accent-ink"
              onClick={() => {
                setPriorities([]);
                setStatus('');
                setTag('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
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
              </button>
            );
          })}
        </div>
      )}

      <Segmented
        className="flex w-full"
        options={[
          { id: 'active', label: `Active${stats.pending ? ` ${stats.pending}` : ''}` },
          { id: 'completed', label: 'Done' },
          { id: 'archived', label: 'Archived' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'completed' && stats.completed > 0 && (
        <button className="btn btn-ghost w-full" onClick={archiveCompleted}>
          <Archive className="w-4 h-4" /> Archive all done
        </button>
      )}

      {syncStatus === 'loading' ? (
        <div className="card"><LoadingList /></div>
      ) : (
        <GroupList groups={tab === 'active' ? groupTasks(filtered, groupBy, categories) : [{ key: 'all', label: null, items: filtered }]} emptyNode={emptyNode} />
      )}
    </div>
  );
}
