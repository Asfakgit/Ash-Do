import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, ListTodo, Sun, CalendarClock, CalendarDays, Timer, Trophy, Settings, PanelLeftClose, PanelLeftOpen, Plus, Menu as MenuIcon, X, Flame, Zap,
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useTasks } from '../context/TaskContext';
import { useApp } from '../context/AppContext';
import { Avatar, cn } from './ui';
import { pushBackHandler } from '../lib/native';

export const NAV_MAIN = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: ListTodo },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'focus', label: 'Focus Mode', icon: Timer },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
];
export const NAV_SECONDARY = [
  { id: 'settings', label: 'Settings', icon: Settings },
];
export const ALL_NAV = [...NAV_MAIN, ...NAV_SECONDARY];

const readCollapsed = () => {
  try {
    return localStorage.getItem('ashdo_sidebar_collapsed') === '1';
  } catch {
    return false;
  }
};

function NavButton({ item, active, collapsed, badge, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all',
        collapsed ? 'justify-center h-11' : 'px-3 h-10',
        active ? 'bg-surface-2 text-fg shadow-[inset_0_0_0_1px_var(--line)]' : 'text-muted hover:text-fg hover:bg-surface-2/60'
      )}
    >
      {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-accent" />}
      <Icon className={cn('w-[18px] h-[18px] shrink-0', active && 'text-accent-ink')} />
      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
      {badge > 0 && (
        <span className={cn('text-[10px] font-semibold rounded-full bg-accent text-on-accent', collapsed ? 'absolute top-1.5 right-1.5 w-4 h-4 grid place-items-center' : 'px-1.5 py-0.5')}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar() {
  const { route, navigate, openEditor } = useUI();
  const { stats } = useTasks();
  const { settings } = useApp();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  useEffect(() => {
    try {
      localStorage.setItem('ashdo_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  const badges = { today: stats.todayOpen + stats.overdue };

  return (
    <aside className={cn('hidden md:flex flex-col shrink-0 h-full border-r border-line bg-surface/60 backdrop-blur-xl transition-[width] duration-300', collapsed ? 'w-[76px]' : 'w-64')}>
      <div className={cn('flex items-center h-16 shrink-0', collapsed ? 'justify-center' : 'px-4 justify-between')}>
        <button type="button" onClick={() => navigate('dashboard')} className="flex items-center gap-2.5 min-w-0" aria-label="Ash Do home">
          <img src="/icons/logo-128.png" alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
          {!collapsed && (
            <span className="font-display font-semibold text-lg tracking-tight">
              Ash<span className="text-accent-ink">Do</span>
            </span>
          )}
        </button>
        {!collapsed && (
          <button type="button" className="icon-btn" aria-label="Collapse sidebar" onClick={() => setCollapsed(true)}>
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className={cn('px-3 pb-3', collapsed && 'px-2')}>
        <button type="button" onClick={() => openEditor({})} className={cn('btn btn-primary w-full', collapsed && 'px-0')} title="New task (N)">
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New task</span>}
          {!collapsed && <kbd className="ml-auto text-[10px] opacity-60 font-sans">N</kbd>}
        </button>
      </div>

      <nav className={cn('flex-1 overflow-y-auto no-scrollbar space-y-1', collapsed ? 'px-2' : 'px-3')} aria-label="Main">
        {NAV_MAIN.map((item) => (
          <NavButton key={item.id} item={item} active={route === item.id} collapsed={collapsed} badge={badges[item.id]} onClick={() => navigate(item.id)} />
        ))}
        <div className="h-px bg-line my-3" />
        {NAV_SECONDARY.map((item) => (
          <NavButton key={item.id} item={item} active={route === item.id} collapsed={collapsed} onClick={() => navigate(item.id)} />
        ))}
      </nav>

      <div className={cn('p-3 shrink-0', collapsed && 'px-2')}>
        {collapsed ? (
          <button type="button" className="icon-btn w-full h-10" aria-label="Expand sidebar" onClick={() => setCollapsed(false)}>
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={() => navigate('achievements')} className="w-full flex items-center gap-3 rounded-2xl bg-surface-2 border border-line p-2.5 text-left hover:bg-surface-3 transition-colors">
            <Avatar src={settings.profile?.profileImage} name={settings.profile?.userName} size={36} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate">{settings.profile?.userName || 'You'}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-0.5"><Zap className="w-3 h-3 text-accent-ink" />Lv {stats.level}</span>
                <span className="inline-flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" />{stats.streak}d</span>
              </span>
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}

const BOTTOM = ['dashboard', 'today', 'calendar', 'focus'];

export function BottomNav() {
  const { route, navigate, openEditor } = useUI();
  const [more, setMore] = useState(false);
  const items = BOTTOM.map((id) => ALL_NAV.find((n) => n.id === id));
  const moreActive = !BOTTOM.includes(route);
  useEffect(() => (more ? pushBackHandler(() => setMore(false)) : undefined), [more]);

  return (
    <>
      <button
        type="button"
        onClick={() => openEditor({})}
        aria-label="New task"
        className="hide-on-keyboard md:hidden fixed z-40 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] grid place-items-center w-14 h-14 rounded-2xl bg-accent text-on-accent shadow-[0_12px_30px_-8px_color-mix(in_oklab,var(--accent)_80%,transparent)] active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
      <nav className="hide-on-keyboard md:hidden fixed z-30 bottom-0 inset-x-0 glass border-t border-line safe-bottom" aria-label="Main">
        <div className="grid grid-cols-5 h-16">
          {items.map((item) => {
            const active = route === item.id;
            return (
              <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={active ? 'page' : undefined} className={cn('flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors', active ? 'text-fg' : 'text-subtle')}>
                <span className={cn('grid place-items-center w-11 h-7 rounded-full transition-all', active && 'bg-accent/20')}>
                  <item.icon className={cn('w-5 h-5', active && 'text-accent-ink')} />
                </span>
                {item.label.replace(' Mode', '')}
              </button>
            );
          })}
          <button type="button" onClick={() => setMore(true)} aria-expanded={more} className={cn('flex flex-col items-center justify-center gap-1 text-[10px] font-semibold', moreActive ? 'text-fg' : 'text-subtle')}>
            <span className={cn('grid place-items-center w-11 h-7 rounded-full', moreActive && 'bg-accent/20')}>
              <MenuIcon className={cn('w-5 h-5', moreActive && 'text-accent-ink')} />
            </span>
            More
          </button>
        </div>
      </nav>

      {more && (
        <div className="md:hidden fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="More pages">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade" onClick={() => setMore(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-surface rounded-t-3xl border-t border-line p-4 pb-6 anim-sheet safe-bottom">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="font-display font-semibold">All pages</p>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setMore(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.id);
                    setMore(false);
                  }}
                  className={cn('flex flex-col items-center gap-2 rounded-2xl p-3 text-xs font-semibold border transition-colors', route === item.id ? 'bg-accent/15 border-accent/40 text-fg' : 'bg-surface-2 border-line text-muted')}
                >
                  <item.icon className={cn('w-5 h-5', route === item.id && 'text-accent-ink')} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
