import React from 'react';
import { Trophy, Flame, Zap, Crown, CalendarCheck, Lock, Sparkles, Target, Timer, Brain, Sunrise } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { XP_PER_LEVEL, addDays, startOfWeek, toISODate } from '../../lib/tasks';
import { Card, CardHeader, ProgressBar, cn } from '../ui';

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
                className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px]', c.future ? 'bg-transparent' : shade[level(c.n)])}
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
    <div className="space-y-5">
      <div>
        <p className="eyebrow flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> {unlocked} of {stats.achievements.length} unlocked
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Achievements</h1>
      </div>

      <div className="grid md:grid-cols-6 xl:grid-cols-12 gap-4 stagger">
        <Card className="md:col-span-6 xl:col-span-7 relative overflow-hidden">
          <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <div className="relative grid place-items-center w-24 h-24 rounded-[28px] bg-gradient-to-br from-accent to-cyan-400 text-on-accent shadow-lg shrink-0">
              <Crown className="absolute -top-3 w-6 h-6 text-amber-400 drop-shadow" />
              <span className="font-display text-4xl font-bold">{stats.level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">Level {stats.level} · {title}</p>
              <p className="font-display text-2xl font-semibold mt-1">{stats.totalXP.toLocaleString()} XP</p>
              <ProgressBar value={stats.levelXP / XP_PER_LEVEL} className="mt-3 h-2.5" />
              <p className="text-xs text-muted mt-1.5">{XP_PER_LEVEL - stats.levelXP} XP to level {stats.level + 1}</p>
            </div>
          </div>
          <p className="relative text-xs text-subtle mt-5">
            XP comes from completed tasks (Low 10 · Medium 20 · High 30 · Urgent 50, +2 per subtask) and focus time (1 XP per minute).
          </p>
        </Card>

        <Card className="md:col-span-6 xl:col-span-5">
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

        <Card className="md:col-span-6 xl:col-span-12">
          <CardHeader icon={CalendarCheck} title="Consistency" subtitle="Completed tasks per day, last 15 weeks" />
          <Heatmap perDay={stats.perDay} />
        </Card>
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg mb-3">Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 stagger">
          {stats.achievements.map((a) => {
            const Icon = ICONS[a.icon] || Trophy;
            return (
              <div
                key={a.id}
                className={cn('card p-4 flex flex-col items-center text-center transition-transform', a.unlocked ? 'hover:-translate-y-0.5' : 'opacity-70')}
              >
                <div
                  className={cn(
                    'relative grid place-items-center w-14 h-14 rounded-2xl mb-3',
                    a.unlocked ? 'bg-gradient-to-br from-accent to-violet-500 text-white shadow-lg' : 'bg-surface-3 text-subtle'
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
