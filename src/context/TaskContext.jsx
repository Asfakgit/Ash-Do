import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { useUI } from './UIContext';
import { useSession, usePersistentState } from './AuthContext';
import {
  DEFAULT_CATEGORIES,
  computeStats,
  formatDue,
  isDone,
  newTask,
  nextOccurrence,
  normalizeTask,
  taskXP,
  uid,
} from '../lib/tasks';

const TaskContext = createContext();

export const reminderKey = (t) => `${t.task_id}|${t.due_date}|${t.due_time}|${t.reminder}`;

const validSession = (x) => x && x.id && x.ended_at && Number.isFinite(Number(x.minutes));

export const TaskProvider = ({ children }) => {
  const { settings } = useApp();
  const { toast, celebrate } = useUI();
  const { snapshot, syncCollection, saveState } = useSession();
  const [tasks, setTasks] = useState(() => snapshot.tasks.filter((t) => t && t.task_id).map(normalizeTask));
  const [sessions, setSessions] = useState(() => snapshot.sessions.filter(validSession).sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at))));
  const [seen, setSeen] = usePersistentState('achievementsSeen', null);
  const [now, setNow] = useState(() => new Date());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Persist only changed rows (diffed), each write is one IndexedDB transaction.
  useEffect(() => syncCollection('task', tasks, 'task_id'), [tasks, syncCollection]);
  useEffect(() => syncCollection('session', sessions, 'id'), [sessions, syncCollection]);
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(i);
  }, []);

  const categories = useMemo(
    () => [
      ...DEFAULT_CATEGORIES,
      ...(settings.customCategories || []).filter((c) => !DEFAULT_CATEGORIES.some((d) => d.name.toLowerCase() === c.name.toLowerCase())),
    ],
    [settings.customCategories]
  );
  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags))].sort(), [tasks]);
  const stats = useMemo(() => computeStats(tasks, sessions, settings.goals_v2, now), [tasks, sessions, settings.goals_v2, now]);

  // ---- celebrations for real milestones (derived from stored data) ----
  const milestoneRef = useRef(null);
  useEffect(() => {
    const unlocked = stats.achievements.filter((a) => a.unlocked);
    if (seen === null) {
      // first run for this profile: record what is already earned without fanfare
      setSeen(Object.fromEntries(unlocked.map((a) => [a.id, new Date().toISOString()])));
    } else {
      const fresh = unlocked.filter((a) => !seen[a.id]);
      if (fresh.length) {
        const stamp = new Date().toISOString();
        setSeen({ ...seen, ...Object.fromEntries(fresh.map((a) => [a.id, stamp])) });
        celebrate();
        fresh.forEach((a) => toast({ title: `Achievement unlocked · ${a.title}`, description: a.desc, tone: 'reward', duration: 6000 }));
      }
    }

    const snap = { done: stats.completedToday, quest: stats.questDone, questTotal: stats.questTasks.length };
    const prev = milestoneRef.current;
    milestoneRef.current = snap;
    if (!prev) return;
    if (prev.done < stats.dailyGoal && snap.done >= stats.dailyGoal) {
      celebrate();
      toast({ title: 'Daily goal reached', description: `${snap.done} tasks done today. Everything else is bonus XP.`, tone: 'reward' });
    } else if (snap.questTotal > 0 && prev.quest < prev.questTotal && snap.quest === snap.questTotal && prev.questTotal === snap.questTotal) {
      celebrate();
      toast({ title: 'Daily quest cleared', description: 'Every task for today is done.', tone: 'reward' });
    }
  }, [stats, seen, setSeen, celebrate, toast]);

  // ---- actions ----
  const addTask = useCallback(
    (fields = {}) => {
      const withDefaults = { ...fields };
      if (withDefaults.reminder === undefined && withDefaults.due_time) {
        withDefaults.reminder = settings.taskNotifications?.defaultReminder ?? '0';
      }
      const task = newTask(withDefaults);
      if (isDone(task) && !task.completed_at) task.completed_at = new Date().toISOString();
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [settings.taskNotifications]
  );

  const updateTask = useCallback((id, patch) => {
    const cur = tasksRef.current.find((t) => t.task_id === id);
    if (!cur) return null;
    const stamp = new Date().toISOString();
    let next = { ...cur, ...patch, updated_at: stamp };
    let spawned = null;
    if (patch.status && patch.status !== cur.status) {
      if (patch.status === 'completed') {
        next.completed_at = stamp;
        if (cur.is_recurring && cur.recurring_type) {
          spawned = newTask({
            title: next.title,
            description: next.description,
            category: next.category,
            priority: next.priority,
            due_date: nextOccurrence(next),
            due_time: next.due_time,
            reminder: next.reminder,
            is_recurring: true,
            recurring_type: next.recurring_type,
            tags: next.tags,
            attachments: next.attachments,
            subtasks: next.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
          });
          // the recurrence moves to the new occurrence, so re-completing can't spawn twice
          next.is_recurring = false;
        }
      } else if (cur.status === 'completed') {
        next.completed_at = '';
      }
    }
    next = normalizeTask(next);
    tasksRef.current = tasksRef.current.map((t) => (t.task_id === id ? next : t));
    if (spawned) tasksRef.current = [spawned, ...tasksRef.current];
    setTasks(tasksRef.current);
    return { task: next, spawned, previous: cur };
  }, []);

  const restoreTask = useCallback((task, index = 0) => {
    setTasks((prev) => {
      if (prev.some((t) => t.task_id === task.task_id)) return prev.map((t) => (t.task_id === task.task_id ? task : t));
      const arr = [...prev];
      arr.splice(Math.min(index, arr.length), 0, task);
      return arr;
    });
  }, []);

  const toggleComplete = useCallback(
    (id) => {
      const cur = tasksRef.current.find((t) => t.task_id === id);
      if (!cur) return;
      const res = updateTask(id, { status: isDone(cur) ? 'pending' : 'completed' });
      if (res && isDone(res.task)) {
        toast({
          title: 'Task completed',
          description: res.spawned ? `+${taskXP(res.task)} XP · next one ${formatDue(res.spawned).toLowerCase()}` : `+${taskXP(res.task)} XP`,
          tone: 'success',
          action: {
            label: 'Undo',
            onClick: () => {
              restoreTask(res.previous);
              if (res.spawned) setTasks((prev) => prev.filter((t) => t.task_id !== res.spawned.task_id));
            },
          },
        });
      }
    },
    [updateTask, restoreTask, toast]
  );

  const deleteTask = useCallback(
    (id) => {
      const index = tasksRef.current.findIndex((t) => t.task_id === id);
      if (index < 0) return;
      const removed = tasksRef.current[index];
      setTasks((prev) => prev.filter((t) => t.task_id !== id));
      toast({ title: 'Task deleted', description: removed.title, action: { label: 'Undo', onClick: () => restoreTask(removed, index) } });
    },
    [toast, restoreTask]
  );

  const duplicateTask = useCallback(
    (id) => {
      const src = tasksRef.current.find((t) => t.task_id === id);
      if (!src) return null;
      const copy = newTask({
        ...src,
        task_id: uid(),
        title: `${src.title} (copy)`.slice(0, 200),
        status: 'pending',
        completed_at: '',
        archived: false,
        created_at: undefined,
        updated_at: undefined,
        subtasks: src.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
      });
      copy.created_at = copy.updated_at = new Date().toISOString();
      setTasks((prev) => {
        const i = prev.findIndex((t) => t.task_id === id);
        const arr = [...prev];
        arr.splice(i + 1, 0, copy);
        return arr;
      });
      toast({ title: 'Task duplicated', tone: 'success' });
      return copy;
    },
    [toast]
  );

  const archiveTask = useCallback(
    (id, archived = true) => {
      const res = updateTask(id, { archived });
      if (res && archived) {
        toast({ title: 'Task archived', description: res.task.title, action: { label: 'Undo', onClick: () => restoreTask(res.previous) } });
      }
    },
    [updateTask, restoreTask, toast]
  );

  const archiveCompleted = useCallback(() => {
    const ids = tasksRef.current.filter((t) => isDone(t) && !t.archived).map((t) => t.task_id);
    if (!ids.length) return 0;
    const stamp = new Date().toISOString();
    setTasks((prev) => prev.map((t) => (ids.includes(t.task_id) ? { ...t, archived: true, updated_at: stamp } : t)));
    toast({ title: `Archived ${ids.length} completed ${ids.length === 1 ? 'task' : 'tasks'}` });
    return ids.length;
  }, [toast]);

  const toggleSubtask = useCallback(
    (taskId, subId) => {
      const cur = tasksRef.current.find((t) => t.task_id === taskId);
      if (!cur) return;
      updateTask(taskId, { subtasks: cur.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) });
    },
    [updateTask]
  );

  const addFocusSession = useCallback((session) => {
    setSessions((prev) => [{ id: uid(), ...session }, ...prev].slice(0, 1000));
  }, []);

  const resetTasks = useCallback(() => {
    setTasks([]);
    setSessions([]);
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        sessions,
        stats,
        categories,
        allTags,
        syncStatus: saveState,
        achievementsSeen: seen || {},
        now,
        addTask,
        updateTask,
        toggleComplete,
        deleteTask,
        restoreTask,
        duplicateTask,
        archiveTask,
        archiveCompleted,
        toggleSubtask,
        addFocusSession,
        resetTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => useContext(TaskContext);
