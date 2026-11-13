// One-time import of data saved by earlier Ash Do versions (plain localStorage),
// into a new encrypted local profile.
import { newTask, normalizeTask, todayISO } from './tasks';

const KEYS = {
  tasksV2: 'ashdo_tasks_v2',
  routine: 'daily_mentor_routine',
  settings: 'daily_mentor_settings',
  goals: 'daily_mentor_goals',
  journal: 'daily_mentor_journal',
  sessions: 'ashdo_focus_sessions',
};

const read = (k) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function collectLegacyData() {
  let tasks = [];
  const v2 = read(KEYS.tasksV2);
  const routine = read(KEYS.routine);
  if (Array.isArray(v2)) tasks = v2.map(normalizeTask);
  else if (Array.isArray(routine)) {
    tasks = routine
      .filter((i) => i && i.text)
      .map((i) => {
        const created = /^\d{10,}$/.test(String(i.id)) ? new Date(Number(i.id)).toISOString() : new Date().toISOString();
        return newTask({
          task_id: `legacy-${i.id}`,
          title: i.text,
          due_date: i.date || '',
          due_time: i.time || '',
          reminder: i.time && !i.alarmTriggered ? '0' : '',
          status: i.completed ? 'completed' : 'pending',
          completed_at: i.completed ? created : '',
          created_at: created,
          updated_at: created,
        });
      });
  }
  const settings = read(KEYS.settings);
  const goals = read(KEYS.goals);
  const journal = read(KEYS.journal);
  const sessions = read(KEYS.sessions);
  const kv = {};
  if (settings && typeof settings === 'object') {
    kv.settings = {
      ...(settings.profile ? { profile: settings.profile } : {}),
      ...(settings.alarm ? { alarm: { enabled: settings.alarm.enabled !== false, volume: settings.alarm.volume ?? 1 } } : {}),
    };
  }
  if (Array.isArray(goals)) kv.goals = goals;
  if (journal && typeof journal === 'object' && Object.values(journal).some((v) => String(v || '').trim())) {
    kv.journal = { [todayISO()]: journal };
  }
  const hasAnything = tasks.length || Object.keys(kv).length || (Array.isArray(sessions) && sessions.length);
  if (!hasAnything) return null;
  return { tasks, sessions: Array.isArray(sessions) ? sessions.filter((s) => s && s.id) : [], kv };
}

export function clearLegacyData() {
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    ['ashdo_achievements_seen', 'ashdo_reminders_fired', 'ashdo_focus_timer'].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
