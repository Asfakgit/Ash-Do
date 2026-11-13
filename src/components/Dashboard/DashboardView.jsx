import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Flame, Target, Swords, Activity, Flag, Minus, X, Trash2, CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, TrendingDown, Timer, CalendarClock, Zap, Gauge, Plus, ArrowRight,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { PRIORITY_RANK, isDone, sortTasks, taskXP, todayISO } from '../../lib/tasks';
import { QuickAdd } from '../Tasks/QuickAdd';
import { TaskItem } from '../Tasks/TaskItem';
import { Card, CardHeader, EmptyState, ProgressBar, ProgressRing, Segmented, TaskCheck, cn } from '../ui';

const greeting = (h) => (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

// SVG presentation attributes can't read CSS variables, so resolve them for recharts.
function useCssVars(names) {
  const { accentColor, effectiveTheme } = useTheme();
  const [vals, setVals] = useState({});
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    setVals(Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accentColor, effectiveTheme]);
  return vals;
}

function Welcome() {
  const { settings } = useApp();
  const { stats } = useTasks();
  const now = new Date();
  const name = settings.profile?.userName && settings.profile.userName !== 'User' ? settings.profile.userName.split(' ')[0] : '';
  return (
    <Card className="relative overflow-hidden p-6 md:p-7">
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 right-32 w-64 h-64 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="eyebrow">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-2">
          {greeting(now.getHours())}
          {name ? `, ${name}` : ''}
          <span className="text-accent-ink">.</span>
        </h1>
        <p className="text-muted mt-2 max-w-xl">{stats.message}</p>
        <QuickAdd className="mt-5 max-w-2xl" />
        <p className="mt-4 text-[11px] font-semibold tracking-[0.2em] text-subtle">PLAN SMART · FOCUS DEEP · LEVEL UP</p>
      </div>
    </Card>
  );
}

function ScoreWidget() {
  const { stats } = useTasks();
  const { navigate } = useUI();
  return (
    <Card className="flex flex-col">
      <CardHeader icon={Gauge} title="Productivity score" subtitle="Tasks 70% · Focus 30%" />
      <div className="flex items-center gap-5">
        <ProgressRing value={stats.score / 100} size={112} stroke={10}>
          <div>
            <p className="font-display text-3xl font-semibold leading-none">{stats.score}</p>
            <p className="text-[10px] text-subtle mt-1 font-semibold tracking-wider">TODAY</p>
          </div>
        </ProgressRing>
        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Tasks</span>
              <span className="font-semibold">{stats.completedToday}/{stats.dailyGoal}</span>
            </div>
            <ProgressBar value={stats.completedToday / stats.dailyGoal} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Focus</span>
              <span className="font-semibold">{stats.focusToday}/{stats.focusGoal}m</span>
            </div>
            <ProgressBar value={stats.focusToday / stats.focusGoal} barClass="bg-violet-500" />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('achievements')}
        className="mt-auto pt-4 grid grid-cols-3 gap-2 text-center"
        aria-label="View streaks and achievements"
      >
        <div className="rounded-2xl bg-surface-2 py-2.5 hover:bg-surface-3 transition-colors">
          <p className="font-display font-semibold flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            {stats.streak}
          </p>
          <p className="text-[10px] text-subtle font-semibold tracking-wider">STREAK</p>
        </div>
        <div className="rounded-2xl bg-surface-2 py-2.5 hover:bg-surface-3 transition-colors">
          <p className="font-display font-semibold">{stats.consistency}/7</p>
          <p className="text-[10px] text-subtle font-semibold tracking-wider">THIS WEEK</p>
        </div>
        <div className="rounded-2xl bg-surface-2 py-2.5 hover:bg-surface-3 transition-colors">
          <p className="font-display font-semibold flex items-center justify-center gap-1">
            <Zap className="w-4 h-4 text-accent-ink" />
            {stats.level}
          </p>
          <p className="text-[10px] text-subtle font-semibold tracking-wider">LEVEL</p>
        </div>
      </button>
    </Card>
  );
}

function OverviewWidget() {
  const { stats } = useTasks();
  const { navigate } = useUI();
  const tiles = [
    { label: 'Total', value: stats.total, icon: ListTodo, to: 'tasks' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, to: 'tasks', cls: 'text-accent-ink' },
    { label: 'Pending', value: stats.pending, icon: Clock, to: 'tasks' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, to: 'today', cls: stats.overdue ? 'text-rose-500' : '' },
  ];
  return (
    <Card>
      <CardHeader
        icon={Activity}
        title="Productivity overview"
        subtitle={`${stats.today} due today · ${stats.upcoming} coming up this week`}
      />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate(t.to)}
            className="text-left rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors p-3.5"
          >
            <t.icon className={cn('w-4 h-4 text-subtle', t.cls)} />
            <p className={cn('font-display text-2xl font-semibold mt-2 leading-none', t.cls)}>{t.value}</p>
            <p className="text-xs text-muted mt-1">{t.label}</p>
          </button>
        ))}
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-accent/12 border border-accent/25 p-3.5">
          <Target className="w-4 h-4 text-accent-ink" />
          <p className="font-display text-2xl font-semibold mt-2 leading-none">{stats.completionPct}%</p>
          <p className="text-xs text-muted mt-1">Completion</p>
          <ProgressBar value={stats.completionPct / 100} className="mt-2 h-1.5" />
        </div>
      </div>
    </Card>
  );
}

function QuestWidget() {
  const { stats, toggleComplete } = useTasks();
  const { openEditor } = useUI();
  const quests = [...stats.questTasks].sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const total = quests.length;
  const xpLeft = quests.filter((t) => !isDone(t)).reduce((a, t) => a + taskXP(t), 0);
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Swords}
        title="Daily quest"
        subtitle={total ? (stats.questDone === total ? 'Quest cleared — legendary.' : `+${xpLeft} XP up for grabs`) : 'No quest yet'}
        action={total ? <span className="chip">{stats.questDone}/{total}</span> : null}
      />
      {total ? (
        <>
          <ProgressBar value={stats.questDone / total} className="mb-3" />
          <ul className="space-y-1 -mx-1">
            {quests.slice(0, 5).map((t) => (
              <li key={t.task_id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                <TaskCheck checked={isDone(t)} onToggle={() => toggleComplete(t.task_id)} priority={t.priority} size="sm" />
                <button type="button" onClick={() => openEditor({ task: t })} className={cn('flex-1 text-left text-sm truncate', isDone(t) && 'line-through text-muted')}>
                  {t.title}
                </button>
                <span className={cn('text-[11px] font-semibold', isDone(t) ? 'text-accent-ink' : 'text-subtle')}>+{taskXP(t)}</span>
              </li>
            ))}
          </ul>
          {total > 5 && <p className="text-xs text-subtle mt-2 px-1">+{total - 5} more on Today</p>}
        </>
      ) : (
        <EmptyState
          className="py-4"
          icon={Swords}
          title="Start today's quest"
          text="Tasks due today become quests."
          action={
            <button className="btn btn-ghost" onClick={() => openEditor({ draft: { due_date: todayISO() } })}>
              <Plus className="w-4 h-4" /> Add a quest
            </button>
          }
        />
      )}
    </Card>
  );
}

function FocusTodayWidget() {
  const { tasks, stats } = useTasks();
  const { navigate } = useUI();
  const [tab, setTab] = useState('priority');
  const today = todayISO();
  const priority = useMemo(
    () => sortTasks(tasks.filter((t) => !t.archived && !isDone(t) && t.due_date && t.due_date <= today), 'priority').slice(0, 5),
    [tasks, today]
  );
  const deadlines = useMemo(() => sortTasks(stats.upcomingTasks, 'due').slice(0, 5), [stats.upcomingTasks]);
  const list = tab === 'priority' ? priority : deadlines;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Target}
        title="Focus today"
        action={
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { id: 'priority', label: 'Priority' },
              { id: 'deadlines', label: 'Deadlines' },
            ]}
          />
        }
      />
      {list.length ? (
        <div className="-mx-2 stagger">
          {list.map((t) => (
            <TaskItem key={t.task_id} task={t} compact />
          ))}
        </div>
      ) : (
        <EmptyState
          className="py-6"
          icon={tab === 'priority' ? CheckCircle2 : CalendarClock}
          title={tab === 'priority' ? 'Nothing urgent right now' : 'No deadlines this week'}
          text={tab === 'priority' ? 'Everything due today is handled.' : 'Your next 7 days are clear.'}
        />
      )}
      <div className="mt-auto pt-3 flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={() => navigate('focus')}>
          <Timer className="w-4 h-4" /> Start focus
        </button>
        <button className="btn btn-ghost flex-1" onClick={() => navigate(tab === 'priority' ? 'today' : 'upcoming')}>
          View all <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}

function ActivityWidget() {
  const { stats } = useTasks();
  const c = useCssVars(['--accent', '--subtle', '--line', '--surface', '--fg', '--surface-3']);
  const up = stats.trend >= 0;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Activity}
        title="Weekly activity"
        subtitle={`${stats.thisWeek} completed in the last 7 days`}
        action={
          <span className={cn('chip border-transparent', up ? 'bg-accent/15 text-accent-ink' : 'bg-rose-500/12 text-rose-500')}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? '+' : ''}
            {stats.trend}%
          </span>
        }
      />
      <div className="h-48 -ml-3" role="img" aria-label={`Completed tasks per day: ${stats.week.map((d) => `${d.label} ${d.completed}`).join(', ')}`}>
        {c['--accent'] && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.week} barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={c['--line']} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c['--subtle'], fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fill: c['--subtle'], fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: c['--surface-3'], opacity: 0.5 }}
                contentStyle={{ background: c['--surface'], border: `1px solid ${c['--line']}`, borderRadius: 12, fontSize: 12, color: c['--fg'] }}
                labelStyle={{ color: c['--fg'], fontWeight: 600 }}
              />
              <Bar dataKey="created" name="Created" fill={c['--surface-3']} radius={[6, 6, 2, 2]} maxBarSize={16} />
              <Bar dataKey="completed" name="Completed" fill={c['--accent']} radius={[6, 6, 2, 2]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted mt-2 pl-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-accent" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-surface-3" /> Created</span>
        <span className="ml-auto">{Math.max(...stats.week.map((d) => d.completed))} best day</span>
      </div>
    </Card>
  );
}

function GoalsWidget() {
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useApp();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', targetDate: '' });
  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    addGoal({ title: title.slice(0, 80), targetDate: form.targetDate });
    setForm({ title: '', targetDate: '' });
    setAdding(false);
  };
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Flag}
        title="Goals"
        subtitle={goals.length ? `${goals.filter((g) => g.progress >= 100).length} of ${goals.length} achieved` : 'Your bigger picture'}
        action={
          <button type="button" className="icon-btn" aria-label="Add goal" onClick={() => setAdding((a) => !a)}>
            {adding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        }
      />
      {adding && (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mb-3 anim-pop">
          <input className="field flex-1" placeholder="e.g. Run 5K, Ship side project" value={form.title} maxLength={80} autoFocus onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Goal title" />
          <input type="date" className="field sm:w-40" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} aria-label="Target date" />
          <button className="btn btn-primary" disabled={!form.title.trim()}>Add</button>
        </form>
      )}
      {goals.length ? (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="group">
              <div className="flex items-center gap-2">
                <span className={cn('flex-1 text-sm font-medium truncate', g.progress >= 100 && 'text-accent-ink')}>{g.title}</span>
                {g.targetDate && <span className="text-[11px] text-subtle">by {new Date(g.targetDate + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                <span className="text-xs font-semibold tabular-nums w-9 text-right">{g.progress}%</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <button type="button" className="icon-btn w-7 h-7 border border-line" aria-label={`Decrease progress of ${g.title}`} onClick={() => updateGoalProgress(g.id, g.progress - 10)}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <ProgressBar value={g.progress / 100} className="flex-1" />
                <button type="button" className="icon-btn w-7 h-7 border border-line" aria-label={`Increase progress of ${g.title}`} onClick={() => updateGoalProgress(g.id, g.progress + 10)}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="icon-btn w-7 h-7 md:opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-500" aria-label={`Delete goal ${g.title}`} onClick={() => deleteGoal(g.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="py-4" icon={Flag} title="No goals yet" text="Add something you're working towards." />
      )}
    </Card>
  );
}

const WIDGETS = {
  score: { el: ScoreWidget, span: 'md:col-span-6 xl:col-span-4' },
  overview: { el: OverviewWidget, span: 'md:col-span-6 xl:col-span-12' },
  focus: { el: FocusTodayWidget, span: 'md:col-span-6 xl:col-span-7' },
  quest: { el: QuestWidget, span: 'md:col-span-6 xl:col-span-5' },
  activity: { el: ActivityWidget, span: 'md:col-span-6 xl:col-span-5' },
  goals: { el: GoalsWidget, span: 'md:col-span-6 xl:col-span-7' },
};

export const WIDGET_LABELS = {
  overview: 'Productivity overview',
  score: 'Productivity score & streak',
  focus: 'Focus today',
  quest: 'Daily quest',
  activity: 'Weekly activity',
  goals: 'Goals',
};

export const DashboardView = () => {
  const { settings } = useApp();
  const widgets = (settings.dashboard?.widgets || []).filter((w) => w.visible && WIDGETS[w.id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 stagger">
      <div className="md:col-span-6 xl:col-span-8 [&>section]:h-full">
        <Welcome />
      </div>
      {widgets.map((w) => {
        const { el: El, span } = WIDGETS[w.id];
        return (
          <div key={w.id} className={cn('min-w-0 [&>section]:h-full', span)}>
            <El />
          </div>
        );
      })}
    </div>
  );
};
