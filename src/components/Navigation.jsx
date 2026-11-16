import React from 'react';
import { Sun, ListTodo, CalendarDays, Timer, NotebookPen, Trophy, Settings, Plus } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useTasks } from '../context/TaskContext';
import { cn } from './ui';

// Bottom tabs. "Today" is the home screen (route id stays 'dashboard').
export const NAV_TABS = [
  { id: 'dashboard', label: 'Today', icon: Sun },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'focus', label: 'Focus', icon: Timer },
];
// Reached from the profile menu in the top bar.
export const NAV_EXTRA = [
  { id: 'diary', label: 'Diary', icon: NotebookPen },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'settings', label: 'Settings', icon: Settings },
];
export const ALL_NAV = [...NAV_TABS, ...NAV_EXTRA];

function Tab({ item, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn('relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors', active ? 'text-fg' : 'text-subtle')}
    >
      <item.icon className={cn('w-[22px] h-[22px]', active && 'text-accent-ink')} strokeWidth={active ? 2.25 : 1.75} />
      {item.label}
      {badge > 0 && (
        <span className="absolute top-2 left-1/2 ml-1.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-semibold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

export function BottomNav() {
  const { route, navigate, openEditor } = useUI();
  const { stats } = useTasks();
  const [a, b, c, d] = NAV_TABS;
  const tab = (item, badge) => <Tab key={item.id} item={item} active={route === item.id} badge={badge} onClick={() => navigate(item.id)} />;

  return (
    <nav className="hide-on-keyboard shrink-0 bg-surface border-t border-line safe-bottom" aria-label="Main">
      <div className="grid grid-cols-5 h-16">
        {tab(a, stats.overdue)}
        {tab(b)}
        <div className="grid place-items-center">
          <button
            type="button"
            onClick={() => openEditor({})}
            aria-label="New task"
            className="grid place-items-center w-12 h-12 rounded-full bg-accent text-on-accent active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
        {tab(c)}
        {tab(d)}
      </div>
    </nav>
  );
}
