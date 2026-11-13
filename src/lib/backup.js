// Backup / restore format for a single local profile (plain JSON the user owns).
import { newTask, normalizeTask } from './tasks';

export const BACKUP_FORMAT = 2;
const MAX_TASKS = 20000;

export function buildBackup({ user, tasks, sessions, settings, goals, journal, achievementsSeen }) {
  return {
    app: 'ash-do',
    format: BACKUP_FORMAT,
    exported_at: new Date().toISOString(),
    profile: { name: user?.name || '' },
    data: { tasks, focusSessions: sessions, settings, goals, journal, achievementsSeen },
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Returns { summary, puts } or throws with a readable message.
export function parseBackup(text, mode, current) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isObj(raw)) throw new Error("That file isn't an Ash Do backup.");

  let data;
  if (raw.app === 'ash-do' && isObj(raw.data)) {
    if (raw.format > BACKUP_FORMAT) throw new Error('This backup was made by a newer version of Ash Do.');
    data = raw.data;
  } else if (Array.isArray(raw.routineItems)) {
    // Export from the original Ash Do (v1)
    data = {
      tasks: raw.routineItems
        .filter((i) => i && i.text)
        .map((i) =>
          newTask({
            task_id: `legacy-${i.id}`,
            title: i.text,
            due_date: i.date || '',
            due_time: i.time || '',
            status: i.completed ? 'completed' : 'pending',
            completed_at: i.completed ? raw.exportDate || new Date().toISOString() : '',
          })
        ),
      goals: raw.goals,
      settings: isObj(raw.settings) ? { profile: raw.settings.profile } : undefined,
    };
  } else throw new Error("That file isn't an Ash Do backup.");

  const tasks = (Array.isArray(data.tasks) ? data.tasks : [])
    .filter((t) => isObj(t) && typeof t.task_id === 'string' && t.task_id && String(t.title || '').trim())
    .slice(0, MAX_TASKS)
    .map(normalizeTask);
  const sessions = (Array.isArray(data.focusSessions) ? data.focusSessions : []).filter(
    (s) => isObj(s) && s.id && s.ended_at && Number.isFinite(Number(s.minutes))
  );
  const goals = Array.isArray(data.goals) ? data.goals.filter((g) => isObj(g) && g.id && g.title) : null;
  const journal = isObj(data.journal) ? data.journal : null;
  const settings = isObj(data.settings) ? data.settings : null;
  const seen = isObj(data.achievementsSeen) ? data.achievementsSeen : null;

  const puts = [
    ...tasks.map((t) => ({ kind: 'task', rid: t.task_id, value: t })),
    ...sessions.map((s) => ({ kind: 'session', rid: s.id, value: s })),
  ];
  if (mode === 'replace') {
    if (settings) puts.push({ kind: 'kv', rid: 'settings', value: settings });
    if (goals) puts.push({ kind: 'kv', rid: 'goals', value: goals });
    if (journal) puts.push({ kind: 'kv', rid: 'journal', value: journal });
    if (seen) puts.push({ kind: 'kv', rid: 'achievementsSeen', value: seen });
  } else {
    if (goals) {
      const byId = new Map(current.goals.map((g) => [g.id, g]));
      goals.forEach((g) => byId.set(g.id, g));
      puts.push({ kind: 'kv', rid: 'goals', value: [...byId.values()] });
    }
    if (journal) puts.push({ kind: 'kv', rid: 'journal', value: { ...journal, ...current.journal } });
  }
  return {
    puts,
    summary: { tasks: tasks.length, sessions: sessions.length, goals: goals?.length || 0, exportedAt: raw.exported_at || raw.exportDate || '', name: raw.profile?.name || '' },
  };
}
