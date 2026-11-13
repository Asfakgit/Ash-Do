import React, { createContext, useContext, useCallback } from 'react';
import { usePersistentState } from './AuthContext';
import { todayISO, uid } from '../lib/tasks';

const AppContext = createContext();

export const DEFAULT_WIDGETS = [
  { id: 'score', visible: true },
  { id: 'overview', visible: true },
  { id: 'focus', visible: true },
  { id: 'quest', visible: true },
  { id: 'activity', visible: true },
  { id: 'goals', visible: true },
];

export const initialSettings = {
  profile: { profileImage: null, userName: 'User' },
  goals_v2: { dailyTasks: 5, dailyFocusMinutes: 50 },
  focus: { work: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4, autoStartBreaks: false },
  dashboard: { widgets: DEFAULT_WIDGETS },
  taskDisplay: { density: 'comfortable', defaultSort: 'smart', groupBy: 'date' },
  taskNotifications: { reminders: true, defaultReminder: '0' },
  customCategories: [],
  alarm: { enabled: true, volume: 0.8 },
  about: {
    appName: 'Ash Do',
    appVersion: '2.0.0',
    developer: 'Ashfak',
    description: 'Plan smart. Focus deep. Level up. A productivity companion for everyone.',
  },
};

const initialGoals = [
  {
    id: 'goal-book',
    title: 'Read one book this month',
    category: 'Learning',
    progress: 0,
    targetDate: (() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    })(),
    milestones: [],
  },
];

// Merge stored settings over defaults so new sections appear and unknown/invalid ones are dropped.
export const mergeSettings = (saved, defaults = initialSettings) => {
  if (!saved || typeof saved !== 'object') return defaults;
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const d = defaults[key];
    const v = saved[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(d)) out[key] = Array.isArray(v) ? v : d;
    else if (typeof d === 'object') out[key] = typeof v === 'object' && !Array.isArray(v) ? { ...d, ...v } : d;
    else out[key] = typeof v === typeof d ? v : d;
  }
  out.about = defaults.about;
  const widgets = Array.isArray(out.dashboard.widgets) ? out.dashboard.widgets : DEFAULT_WIDGETS;
  const known = widgets.filter((w) => w && DEFAULT_WIDGETS.some((d) => d.id === w.id));
  out.dashboard = { ...out.dashboard, widgets: [...known, ...DEFAULT_WIDGETS.filter((d) => !known.some((w) => w.id === d.id))] };
  out.customCategories = out.customCategories.filter((c) => c && typeof c.name === 'string' && c.name.trim());
  return out;
};

const reviveGoals = (v, base) => (Array.isArray(v) ? v.filter((g) => g && g.id && g.title) : base);
const reviveJournal = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = usePersistentState('settings', initialSettings, (v) => mergeSettings(v));
  const [goals, setGoals] = usePersistentState('goals', initialGoals, reviveGoals);
  const [journal, setJournal] = usePersistentState('journal', {}, reviveJournal);

  const today = todayISO();
  const dailyJournal = journal[today] || {};

  const updateJournalField = useCallback(
    (field, value) => setJournal((prev) => ({ ...prev, [today]: { ...(prev[today] || {}), [field]: value } })),
    [setJournal, today]
  );

  const updateSettingsSection = useCallback(
    (section, key, value) => setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } })),
    [setSettings]
  );
  const setSettingsValue = useCallback((key, value) => setSettings((prev) => ({ ...prev, [key]: value })), [setSettings]);

  // ---- long-term goals ----
  const addGoal = useCallback(
    (goal) => setGoals((prev) => [...prev, { id: 'goal-' + uid(), progress: 0, milestones: [], category: '', targetDate: '', ...goal }]),
    [setGoals]
  );
  const updateGoal = useCallback((id, patch) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g))), [setGoals]);
  const deleteGoal = useCallback((id) => setGoals((prev) => prev.filter((g) => g.id !== id)), [setGoals]);
  const updateGoalProgress = useCallback(
    (id, progress) => updateGoal(id, { progress: Math.min(100, Math.max(0, Math.round(progress))) }),
    [updateGoal]
  );
  const toggleMilestone = useCallback(
    (goalId, milestoneId) =>
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const milestones = g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m));
          const progress = milestones.length ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100) : g.progress;
          return { ...g, milestones, progress };
        })
      ),
    [setGoals]
  );

  return (
    <AppContext.Provider
      value={{
        settings,
        goals,
        journal,
        dailyJournal,
        updateJournalField,
        updateSettingsSection,
        setSettingsValue,
        addGoal,
        updateGoal,
        deleteGoal,
        updateGoalProgress,
        toggleMilestone,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
