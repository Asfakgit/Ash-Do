import React, { useState } from 'react';
import { Trophy, Flame, Zap, Crown, CalendarCheck, Lock, Sparkles, Target, Timer, Brain, Sunrise, Flag, Minus, Plus, X, Trash2 } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import { XP_PER_LEVEL, addDays, startOfWeek, toISODate } from '../../lib/tasks';
import { Card, CardHeader, EmptyState, ProgressBar, cn } from '../ui';

const ICONS = { Sparkles, Flame, Target, Zap, Timer, Brain, Sunrise, Crown, Trophy };
const LEVEL_TITLES = ['Rookie', 'Starter', 'Achiever', 'Pro', 'Expert', 'Master', 'Legend', 'Mythic'];

function Heatmap({ perDay }) {
  const weeks = 15;
  const start = addDays(startOfWeek(new Date()), -(weeks - 1) * 7);
  const today = toISODate(new Date());
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const iso = toISODate(date);
      return { iso, n: perDay[iso] || 0, future: iso > today };
    })
  );
  const level = (n) => (n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : n < 6 ? 3 : 4);
  const shade = ['bg-surface-3', 'bg-accent/30', 'bg-accent/55', 'bg-accent/80', 'bg-accent'];
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar" role="img" aria-label="Task completions over the last 15 weeks">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((c) => (
              <span
                key={c.iso}
                title={`${c.iso}: ${c.n} completed`}
                className={cn('w-3.5 h-3.5 rounded-[4px]', c.future ? 'bg-transparent' : shade[level(c.n)])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-subtle">
        Less
        {shade.map((s) => (
          <span key={s} className={cn('w-3 h-3 rounded-[3px]', s)} />
        ))}
        More
      </div>
    </div>
  );
}

function GoalsCard() {
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
    <Card>
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
        <form onSubmit={submit} className="flex flex-col gap-2 mb-3 anim-pop">
          <input className="field flex-1" placeholder="e.g. Run 5K, Ship side project" value={form.title} maxLength={80} autoFocus onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Goal title" />
          <input type="date" className="field" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} aria-label="Target date" />
          <button className="btn btn-primary" disabled={!form.title.trim()}>Add</button>
        </form>
      )}
      {goals.length ? (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id}>
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
                <button type="button" className="icon-btn w-7 h-7 hover:text-rose-500" aria-label={`Delete goal ${g.title}`} onClick={() => deleteGoal(g.id)}>
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

export function AchievementsView() {
  const { stats, achievementsSeen: seen } = useTasks();
  const unlocked = stats.achievements.filter((a) => a.unlocked).length;
  const title = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((stats.level - 1) / 2))];
  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const iso = toISODate(d);
    return { iso, label: d.toLocaleDateString([], { weekday: 'narrow' }), n: stats.perDay[iso] || 0, future: iso > toISODate(new Date()) };
  });

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="relative grid place-items-center w-16 h-16 rounded-2xl bg-accent text-on-accent shrink-0">
              <Crown className="absolute -top-2.5 w-5 h-5 text-amber-400" />
              <span className="font-display text-3xl font-bold">{stats.level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">Level {stats.level} · {title}</p>
              <p className="font-display text-2xl font-semibold mt-1">{stats.totalXP.toLocaleString()} XP</p>
              <ProgressBar value={stats.levelXP / XP_PER_LEVEL} className="mt-3 h-2.5" />
              <p className="text-xs text-muted mt-1.5">{XP_PER_LEVEL - stats.levelXP} XP to level {stats.level + 1}</p>
            </div>
          </div>
          <p className="text-xs text-subtle mt-4">
            Earn XP by finishing tasks and focusing.
          </p>
        </Card>

        <Card>
          <CardHeader icon={Flame} title="Streak" subtitle="Days in a row with at least one completed task" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-orange-500/10 p-4">
              <p className="font-display text-3xl font-semibold flex items-center gap-1.5">
                <Flame className="w-6 h-6 text-orange-500" /> {stats.streak}
              </p>
              <p className="text-xs text-muted mt-1">Current streak</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="font-display text-3xl font-semibold flex items-center gap-1.5">
                <Zap className="w-6 h-6 text-accent-ink" /> {stats.longestStreak}
              </p>
              <p className="text-xs text-muted mt-1">Personal record</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5" /> This week · {weekDays.filter((d) => d.n > 0).length}/7 productive days
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d) => (
                <div key={d.iso} className="text-center">
                  <div
                    className={cn(
                      'h-9 rounded-xl grid place-items-center text-xs font-semibold',
                      d.n > 0 ? 'bg-accent text-on-accent' : d.future ? 'border border-dashed border-line-strong text-subtle' : 'bg-surface-3 text-subtle'
                    )}
                  >
                    {d.n > 0 ? d.n : ''}
                  </div>
                  <span className="text-[10px] text-subtle">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <GoalsCard />

        <Card>
          <CardHeader icon={CalendarCheck} title="Consistency" subtitle="Completed tasks per day, last 15 weeks" />
          <Heatmap perDay={stats.perDay} />
        </Card>
      </div>

      <div>
        <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
          Badges <span className="font-medium opacity-70">{unlocked}/{stats.achievements.length}</span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.achievements.map((a) => {
            const Icon = ICONS[a.icon] || Trophy;
            return (
              <div
                key={a.id}
                className={cn('card p-4 flex flex-col items-center text-center', !a.unlocked && 'opacity-70')}
              >
                <div
                  className={cn(
                    'relative grid place-items-center w-14 h-14 rounded-2xl mb-3',
                    a.unlocked ? 'bg-accent text-on-accent' : 'bg-surface-3 text-subtle'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  {!a.unlocked && <Lock className="absolute -bottom-1 -right-1 w-4 h-4 p-0.5 rounded-full bg-surface border border-line" />}
                </div>
                <p className="font-display font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-muted mt-0.5">{a.desc}</p>
                {a.unlocked ? (
                  <p className="text-[11px] text-accent-ink font-semibold mt-2">
                    Unlocked{seen[a.id] ? ` · ${new Date(seen[a.id]).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}
                  </p>
                ) : (
                  <div className="w-full mt-2">
                    <ProgressBar value={a.value / a.target} className="h-1.5" />
                    <p className="text-[11px] text-subtle mt-1">
                      {a.value}/{a.target}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
