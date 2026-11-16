import { useEffect, useMemo, useRef } from 'react';
import { Check, AlarmClock, SquarePen } from 'lucide-react';
import { useTasks, reminderKey } from '../context/TaskContext';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { usePersistentState } from '../context/AuthContext';
import { formatDue, isDone } from '../lib/tasks';
import { dismissDelivered, isNative, notificationId, notifyNow, onNotificationTap, syncScheduledReminders } from '../lib/native';
import { useAlarm } from './AlarmManager';

const MISSED_WINDOW = 6 * 3600 * 1000; // still show reminders missed up to 6h ago
const LOUD_WINDOW = 2 * 60 * 1000; // ring only when caught on time; older ones are shown silently
const reviveMap = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// When a task's reminder should fire (tasks without a time use 9:00 on the due date).
export const reminderTime = (t) => {
  if (!t.due_date || t.reminder === '' || t.reminder === undefined) return null;
  const at = new Date(`${t.due_date}T${t.due_time || '09:00'}`);
  at.setMinutes(at.getMinutes() - (Number(t.reminder) || 0));
  return at;
};

export const TaskAlarmManager = () => {
  const { tasks, toggleComplete } = useTasks();
  const { settings } = useApp();
  const { openEditor } = useUI();
  const { ring } = useAlarm();
  // fired[key] = when the alarm last went off; snoozed[key] = when it should go off again
  const [fired, setFired] = usePersistentState('remindersFired', {}, reviveMap);
  const [snoozed, setSnoozed] = usePersistentState('remindersSnoozed', {}, reviveMap);
  const enabled = settings.taskNotifications?.reminders !== false;
  const snoozeMin = Number(settings.alarm?.snooze) || 10;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const reminders = useMemo(() => {
    if (!enabled) return [];
    return tasks
      .filter((t) => !t.archived && !isDone(t))
      .map((t) => ({ t, at: reminderTime(t) }))
      .filter((r) => r.at)
      // never alert for a time that had already passed when the task was created/edited
      .filter(({ t, at }) => at.getTime() > new Date(t.updated_at || t.created_at).getTime() - 60000)
      .map(({ t, at }) => {
        const key = reminderKey(t);
        const snooze = snoozed[key];
        return {
          key,
          taskId: t.task_id,
          at: snooze && snooze > at.getTime() ? snooze : at.getTime(),
          title: t.title,
          body: `Due ${formatDue(t).toLowerCase()}`,
        };
      })
      .sort((a, b) => a.at - b.at);
  }, [tasks, enabled, snoozed]);

  // Android: let the OS deliver future reminders (with the alarm sound) even if the app is closed.
  useEffect(() => {
    const now = Date.now();
    syncScheduledReminders(reminders.filter((r) => r.at > now + 5000 && !(fired[r.key] >= r.at)));
  }, [reminders, fired]);

  // Tapping the system notification opens the task (and counts as seeing the alarm).
  useEffect(() => {
    let off = () => {};
    onNotificationTap((extra) => {
      if (extra.kind !== 'task') return;
      const t = tasksRef.current.find((x) => x.task_id === extra.taskId);
      if (!t) return;
      setFired((f) => ({ ...f, [reminderKey(t)]: Date.now() }));
      openEditor({ task: t });
    }).then((fn) => (off = fn));
    return () => off();
  }, [openEditor, setFired]);

  useEffect(() => {
    let timer;
    const check = () => {
      const now = Date.now();
      const due = reminders.filter((r) => r.at <= now && now - r.at < MISSED_WINDOW && !(fired[r.key] >= r.at));
      if (due.length) {
        const next = { ...fired };
        due.forEach((r) => {
          next[r.key] = now;
          const loud = now - r.at < LOUD_WINDOW;
          dismissDelivered(notificationId(r.key)); // the in-app alarm takes over from the system one
          const findTask = () => tasksRef.current.find((x) => x.task_id === r.taskId);
          ring({
            id: `task|${r.key}|${r.at}`,
            kind: 'task',
            title: r.title,
            body: r.body,
            loud,
            actions: [
              {
                label: 'Mark done',
                icon: Check,
                primary: true,
                onClick: () => {
                  const t = findTask();
                  if (t && !isDone(t)) toggleComplete(t.task_id);
                },
              },
              {
                label: `Snooze ${snoozeMin} min`,
                icon: AlarmClock,
                onClick: () =>
                  setSnoozed((s) => {
                    const keep = Object.fromEntries(Object.entries(s).filter(([, ts]) => ts > Date.now() - 2 * 86400000));
                    return { ...keep, [r.key]: Date.now() + snoozeMin * 60000 };
                  }),
              },
              {
                label: 'Open',
                icon: SquarePen,
                onClick: () => {
                  const t = findTask();
                  if (t) openEditor({ task: t });
                },
              },
            ],
          });
          // On Android the OS notification was already scheduled; in a browser show one now.
          if (!isNative) notifyNow(`Reminder: ${r.title}`, r.body);
        });
        // keep the map small: drop entries older than 30 days
        const cutoff = now - 30 * 86400000;
        setFired(Object.fromEntries(Object.entries(next).filter(([, ts]) => ts > cutoff)));
      }
      // Wake up right on time for the next reminder instead of waiting for the next poll.
      const upcoming = reminders.find((r) => r.at > now && !(fired[r.key] >= r.at));
      clearTimeout(timer);
      if (upcoming && upcoming.at - now < 3600000) timer = setTimeout(check, upcoming.at - now + 50);
    };
    check();
    const i = setInterval(check, 15000);
    return () => {
      clearInterval(i);
      clearTimeout(timer);
    };
  }, [reminders, fired, setFired, setSnoozed, ring, openEditor, toggleComplete, snoozeMin]);

  return null;
};
