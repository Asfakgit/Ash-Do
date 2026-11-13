import { useEffect, useMemo } from 'react';
import { useTasks, reminderKey } from '../context/TaskContext';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { usePersistentState } from '../context/AuthContext';
import { formatDue, isDone } from '../lib/tasks';
import { isNative, notifyNow, onNotificationTap, syncScheduledReminders } from '../lib/native';

const MISSED_WINDOW = 6 * 3600 * 1000; // still alert for reminders missed up to 6h ago

// When a task's reminder should fire (tasks without a time use 9:00 on the due date).
export const reminderTime = (t) => {
  if (!t.due_date || t.reminder === '' || t.reminder === undefined) return null;
  const at = new Date(`${t.due_date}T${t.due_time || '09:00'}`);
  at.setMinutes(at.getMinutes() - (Number(t.reminder) || 0));
  return at;
};

export const TaskAlarmManager = () => {
  const { tasks } = useTasks();
  const { settings } = useApp();
  const { toast, openEditor } = useUI();
  const [fired, setFired] = usePersistentState('remindersFired', {}, (v) => (v && typeof v === 'object' ? v : {}));
  const enabled = settings.taskNotifications?.reminders !== false;

  const reminders = useMemo(() => {
    if (!enabled) return [];
    return tasks
      .filter((t) => !t.archived && !isDone(t))
      .map((t) => ({ t, at: reminderTime(t) }))
      .filter((r) => r.at)
      // never alert for a time that had already passed when the task was created/edited
      .filter(({ t, at }) => at.getTime() > new Date(t.updated_at || t.created_at).getTime() - 60000)
      .map(({ t, at }) => ({
        key: reminderKey(t),
        taskId: t.task_id,
        at: at.getTime(),
        title: t.title,
        body: `Due ${formatDue(t).toLowerCase()}`,
      }))
      .sort((a, b) => a.at - b.at);
  }, [tasks, enabled]);

  // Android: let the OS deliver future reminders even if the app is closed.
  useEffect(() => {
    const now = Date.now();
    syncScheduledReminders(reminders.filter((r) => r.at > now + 5000 && !fired[r.key]));
  }, [reminders, fired]);

  useEffect(() => {
    let off = () => {};
    onNotificationTap((taskId) => {
      const t = tasks.find((x) => x.task_id === taskId);
      if (t) openEditor({ task: t });
    }).then((fn) => (off = fn));
    return () => off();
  }, [tasks, openEditor]);

  // In-app check (both platforms): chime + toast; on web also a browser notification.
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = reminders.filter((r) => r.at <= now && now - r.at < MISSED_WINDOW && !fired[r.key]);
      if (!due.length) return;
      const next = { ...fired };
      due.forEach((r) => {
        next[r.key] = now;
        if (settings.alarm?.enabled !== false) window.playAlarm?.();
        toast({
          title: `Reminder · ${r.title}`,
          description: r.body,
          duration: 10000,
          action: {
            label: 'Open',
            onClick: () => {
              const t = tasks.find((x) => x.task_id === r.taskId);
              if (t) openEditor({ task: t });
            },
          },
        });
        // On Android the OS notification was already scheduled; on web show one now.
        if (!isNative) notifyNow(`Reminder: ${r.title}`, r.body);
      });
      // keep the map small: drop entries older than 30 days
      const cutoff = now - 30 * 86400000;
      setFired(Object.fromEntries(Object.entries(next).filter(([, ts]) => ts > cutoff)));
    };
    check();
    const i = setInterval(check, 15000);
    return () => clearInterval(i);
  }, [reminders, fired, setFired, toast, openEditor, tasks, settings.alarm]);

  return null;
};
