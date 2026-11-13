// Core task model + pure helpers (dates, stats, streaks, XP, achievements).
// The task shape mirrors the planned Google Sheets columns so the storage
// layer can later be swapped for the Apps Script API without UI changes.

export const PRIORITIES = [
  { id: 'low', label: 'Low', xp: 10, dot: 'bg-sky-400', text: 'text-sky-600 dark:text-sky-300', soft: 'bg-sky-400/12' },
  { id: 'medium', label: 'Medium', xp: 20, dot: 'bg-violet-400', text: 'text-violet-600 dark:text-violet-300', soft: 'bg-violet-400/12' },
  { id: 'high', label: 'High', xp: 30, dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-300', soft: 'bg-amber-400/15' },
  { id: 'urgent', label: 'Urgent', xp: 50, dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', soft: 'bg-rose-500/12' },
];
export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]));
export const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

export const STATUSES = [
  { id: 'pending', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Done' },
];

export const RECURRENCE = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Every weekday' },
  { id: 'weekly', label: 'Every week' },
  { id: 'monthly', label: 'Every month' },
];
export const RECURRENCE_LABEL = Object.fromEntries(RECURRENCE.map((r) => [r.id, r.label]));

export const REMINDERS = [
  { id: '', label: 'No reminder' },
  { id: '0', label: 'At due time' },
  { id: '5', label: '5 min before' },
  { id: '15', label: '15 min before' },
  { id: '30', label: '30 min before' },
  { id: '60', label: '1 hour before' },
  { id: '1440', label: '1 day before' },
];

export const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#5B8CFF' },
  { name: 'Personal', color: '#A78BFA' },
  { name: 'Learning', color: '#22D3EE' },
  { name: 'Health', color: '#34D399' },
  { name: 'Shopping', color: '#F5A524' },
];

export const categoryColor = (name, categories = DEFAULT_CATEGORIES) =>
  categories.find((c) => c.name.toLowerCase() === String(name || '').toLowerCase())?.color || '#8B8B9E';

// ---------- ids ----------
export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

// ---------- dates (always local time) ----------
export const pad = (n) => String(n).padStart(2, '0');
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(new Date());
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const parseISODate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const isoToLocalDate = (iso) => (iso ? toISODate(new Date(iso)) : '');
export const startOfWeek = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -day);
};

export const dueDateTime = (t) =>
  t.due_date ? new Date(`${t.due_date}T${t.due_time || '23:59'}`) : null;

export const formatTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const formatDue = (t, now = new Date()) => {
  if (!t.due_date) return '';
  const today = toISODate(now);
  const tomorrow = toISODate(addDays(now, 1));
  const yesterday = toISODate(addDays(now, -1));
  let label;
  if (t.due_date === today) label = 'Today';
  else if (t.due_date === tomorrow) label = 'Tomorrow';
  else if (t.due_date === yesterday) label = 'Yesterday';
  else {
    const d = parseISODate(t.due_date);
    const diff = (d - parseISODate(today)) / 86400000;
    label =
      diff > 0 && diff < 7
        ? d.toLocaleDateString([], { weekday: 'long' })
        : d.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
          });
  }
  return t.due_time ? `${label}, ${formatTime(t.due_time)}` : label;
};

export const relativeDayLabel = (iso, now = new Date()) => {
  const today = toISODate(now);
  if (iso === today) return 'Today';
  if (iso === toISODate(addDays(now, 1))) return 'Tomorrow';
  if (iso === toISODate(addDays(now, -1))) return 'Yesterday';
  return parseISODate(iso).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

// ---------- task model ----------
export function newTask(fields = {}) {
  const now = new Date().toISOString();
  return normalizeTask({
    task_id: uid(),
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    due_time: '',
    reminder: '',
    is_recurring: false,
    recurring_type: '',
    tags: [],
    subtasks: [],
    attachments: [],
    created_at: now,
    updated_at: now,
    completed_at: '',
    archived: false,
    ...fields,
  });
}

export function normalizeTask(t) {
  return {
    ...t,
    title: String(t.title || '').trim().slice(0, 200),
    description: String(t.description || ''),
    category: String(t.category || ''),
    priority: PRIORITY_MAP[t.priority] ? t.priority : 'medium',
    status: ['pending', 'in_progress', 'completed'].includes(t.status) ? t.status : 'pending',
    due_date: t.due_date || '',
    due_time: t.due_time || '',
    reminder: t.reminder === undefined || t.reminder === null ? '' : String(t.reminder),
    is_recurring: Boolean(t.is_recurring) && Boolean(t.recurring_type),
    recurring_type: t.recurring_type || '',
    tags: Array.isArray(t.tags) ? [...new Set(t.tags.map((x) => String(x).trim()).filter(Boolean))] : [],
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
    archived: Boolean(t.archived),
  };
}

export const isDone = (t) => t.status === 'completed';
export const isOverdue = (t, now = new Date()) => {
  if (isDone(t) || t.archived) return false;
  const due = dueDateTime(t);
  return Boolean(due && due < now);
};

export function nextOccurrence(task, now = new Date()) {
  const step = (d) => {
    const x = new Date(d);
    switch (task.recurring_type) {
      case 'weekly':
        x.setDate(x.getDate() + 7);
        break;
      case 'monthly': {
        const day = x.getDate();
        x.setDate(1);
        x.setMonth(x.getMonth() + 1);
        const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
        x.setDate(Math.min(day, last));
        break;
      }
      case 'weekdays':
        do x.setDate(x.getDate() + 1);
        while (x.getDay() === 0 || x.getDay() === 6);
        break;
      default:
        x.setDate(x.getDate() + 1);
    }
    return x;
  };
  const today = parseISODate(toISODate(now));
  let d = step(task.due_date ? parseISODate(task.due_date) : today);
  while (d <= today) d = step(d);
  return toISODate(d);
}

// ---------- sorting / filtering ----------
export function sortTasks(list, mode = 'smart') {
  const byDue = (a, b) => {
    const da = dueDateTime(a);
    const db = dueDateTime(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  };
  const byPriority = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  const doneLast = (a, b) => Number(isDone(a)) - Number(isDone(b));
  const sorted = [...list];
  sorted.sort((a, b) => {
    const d = doneLast(a, b);
    if (d) return d;
    switch (mode) {
      case 'due':
        return byDue(a, b) || byPriority(a, b);
      case 'priority':
        return byPriority(a, b) || byDue(a, b);
      case 'status': {
        const rank = { in_progress: 0, pending: 1, completed: 2 };
        return rank[a.status] - rank[b.status] || byDue(a, b);
      }
      case 'created':
        return String(b.created_at).localeCompare(String(a.created_at));
      case 'title':
        return a.title.localeCompare(b.title);
      default: {
        // smart: overdue first, then due soon, weighted by priority
        const now = new Date();
        const oa = isOverdue(a, now);
        const ob = isOverdue(b, now);
        if (oa !== ob) return oa ? -1 : 1;
        return byDue(a, b) || byPriority(a, b);
      }
    }
  });
  return sorted;
}

export function matchesSearch(t, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    t.title.toLowerCase().includes(s) ||
    t.description.toLowerCase().includes(s) ||
    t.category.toLowerCase().includes(s) ||
    t.tags.some((x) => x.toLowerCase().includes(s))
  );
}

// ---------- gamification ----------
export const XP_PER_LEVEL = 500;
export const taskXP = (t) => (PRIORITY_MAP[t.priority]?.xp || 20) + t.subtasks.filter((s) => s.done).length * 2;
export const focusXP = (s) => Math.round(Number(s.minutes) || 0);

export const ACHIEVEMENTS = [
  { id: 'first_task', title: 'First Step', desc: 'Complete your first task', icon: 'Sparkles', target: 1, metric: 'totalCompleted' },
  { id: 'streak_3', title: 'Warming Up', desc: 'Reach a 3-day streak', icon: 'Flame', target: 3, metric: 'longestStreak' },
  { id: 'daily_goal', title: 'Goal Getter', desc: 'Hit your daily task goal', icon: 'Target', target: 1, metric: 'goalDays' },
  { id: 'streak_7', title: 'On Fire', desc: 'Keep a 7-day streak', icon: 'Zap', target: 7, metric: 'longestStreak' },
  { id: 'focus_first', title: 'Deep Diver', desc: 'Finish a full focus session', icon: 'Timer', target: 1, metric: 'focusCompleted' },
  { id: 'focus_10', title: 'Zen Mode', desc: 'Finish 10 focus sessions', icon: 'Brain', target: 10, metric: 'focusCompleted' },
  { id: 'early_bird', title: 'Early Bird', desc: 'Complete a task before 8 AM', icon: 'Sunrise', target: 1, metric: 'earlyBird' },
  { id: 'level_5', title: 'Level Five', desc: 'Reach level 5', icon: 'Crown', target: 5, metric: 'level' },
  { id: 'tasks_100', title: 'Centurion', desc: 'Complete 100 tasks', icon: 'Trophy', target: 100, metric: 'totalCompleted' },
];

const DAILY_MESSAGES = [
  'Small steps, every day. That is how big things get done.',
  'Pick one thing that matters and give it your full attention.',
  'Progress beats perfection. Ship the next small piece.',
  'Your future self is cheering for what you do in the next hour.',
  'Clear the urgent, protect the important.',
  'Momentum is a habit. Start with the easiest win.',
  'Focus is a superpower. Spend it on purpose.',
];

export function computeStats(tasks, sessions, goals, now = new Date()) {
  const today = toISODate(now);
  const dailyGoal = Math.max(1, Number(goals?.dailyTasks) || 5);
  const focusGoal = Math.max(1, Number(goals?.dailyFocusMinutes) || 50);

  const active = tasks.filter((t) => !t.archived);
  const completed = active.filter(isDone);
  const open = active.filter((t) => !isDone(t));
  const overdue = open.filter((t) => isOverdue(t, now));
  const dueToday = active.filter((t) => t.due_date === today);
  const in7 = toISODate(addDays(now, 7));
  const upcoming = open.filter((t) => t.due_date > today && t.due_date <= in7);

  // completions per local day (archived tasks still count as history)
  const perDay = {};
  let earlyBird = 0;
  let totalXP = 0;
  for (const t of tasks) {
    if (!isDone(t) || !t.completed_at) continue;
    const c = new Date(t.completed_at);
    const day = toISODate(c);
    perDay[day] = (perDay[day] || 0) + 1;
    if (c.getHours() < 8) earlyBird = 1;
    totalXP += taskXP(t);
  }
  const focusPerDay = {};
  let focusCompleted = 0;
  for (const s of sessions) {
    const day = isoToLocalDate(s.ended_at || s.started_at);
    focusPerDay[day] = (focusPerDay[day] || 0) + (Number(s.minutes) || 0);
    if (s.completed) focusCompleted += 1;
    totalXP += focusXP(s);
  }

  // streaks
  let streak = 0;
  let cursor = perDay[today] ? now : addDays(now, -1);
  while (perDay[toISODate(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  const days = Object.keys(perDay).sort();
  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && toISODate(addDays(parseISODate(prev), 1)) === d ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }
  const goalDays = Object.values(perDay).filter((n) => n >= dailyGoal).length;

  // last 7 days activity
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    const iso = toISODate(d);
    week.push({
      date: iso,
      label: d.toLocaleDateString([], { weekday: 'short' }),
      completed: perDay[iso] || 0,
      created: tasks.filter((t) => isoToLocalDate(t.created_at) === iso).length,
      focus: focusPerDay[iso] || 0,
    });
  }
  const thisWeek = week.reduce((a, d) => a + d.completed, 0);
  let lastWeek = 0;
  for (let i = 7; i < 14; i++) lastWeek += perDay[toISODate(addDays(now, -i))] || 0;
  const trend = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  const consistency = week.filter((d) => d.completed > 0).length;

  const completedToday = perDay[today] || 0;
  const focusToday = focusPerDay[today] || 0;
  const score = Math.round(Math.min(1, completedToday / dailyGoal) * 70 + Math.min(1, focusToday / focusGoal) * 30);

  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const levelXP = totalXP % XP_PER_LEVEL;

  // Daily quest: today's tasks + overdue + overdue cleared today
  const questTasks = active.filter(
    (t) =>
      t.due_date === today ||
      isOverdue(t, now) ||
      (isDone(t) && t.due_date && t.due_date < today && isoToLocalDate(t.completed_at) === today)
  );
  const questDone = questTasks.filter(isDone).length;

  const metrics = {
    totalCompleted: Object.values(perDay).reduce((a, b) => a + b, 0),
    longestStreak,
    goalDays,
    focusCompleted,
    earlyBird,
    level,
  };
  const achievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    value: Math.min(metrics[a.metric], a.target),
    unlocked: metrics[a.metric] >= a.target,
  }));

  const dayIndex = Math.floor((parseISODate(today) - new Date(now.getFullYear(), 0, 0)) / 86400000);
  let message = DAILY_MESSAGES[dayIndex % DAILY_MESSAGES.length];
  if (overdue.length) message = `${overdue.length} overdue ${overdue.length === 1 ? 'task needs' : 'tasks need'} you. Clear ${overdue.length === 1 ? 'it' : 'them'} first and the rest gets lighter.`;
  else if (completedToday >= dailyGoal) message = 'Daily goal smashed. Anything else today is bonus XP.';

  return {
    total: active.length,
    completed: completed.length,
    pending: open.length,
    inProgress: open.filter((t) => t.status === 'in_progress').length,
    overdue: overdue.length,
    overdueTasks: overdue,
    today: dueToday.length,
    todayOpen: dueToday.filter((t) => !isDone(t)).length,
    upcoming: upcoming.length,
    upcomingTasks: upcoming,
    completionPct: active.length ? Math.round((completed.length / active.length) * 100) : 0,
    completedToday,
    focusToday,
    dailyGoal,
    focusGoal,
    score,
    streak,
    longestStreak,
    consistency,
    week,
    thisWeek,
    lastWeek,
    trend,
    perDay,
    totalXP,
    level,
    levelXP,
    questTasks,
    questDone,
    achievements,
    message,
  };
}
