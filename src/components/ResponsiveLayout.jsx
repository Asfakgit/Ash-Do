import React, { useEffect, useRef, useState } from 'react';
import { Bell, WifiOff, Timer, User, Settings, LogOut, AlertTriangle, Clock, CloudOff, HardDrive } from 'lucide-react';
import { Sidebar, BottomNav, ALL_NAV } from './Navigation';
import { useUI } from '../context/UIContext';
import { useTasks } from '../context/TaskContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useFocus } from '../context/FocusContext';
import { formatDue, isDone } from '../lib/tasks';
import { pushBackHandler } from '../lib/native';
import { reminderTime } from './TaskAlarmManager';
import { Avatar, Menu, cn } from './ui';

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function NotificationsButton() {
  const { tasks, stats } = useTasks();
  const { openEditor } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    const pop = pushBackHandler(() => setOpen(false));
    return () => {
      document.removeEventListener('pointerdown', close);
      pop();
    };
  }, [open]);

  const now = Date.now();
  const soon = tasks
    .filter((t) => !t.archived && !isDone(t))
    .map((t) => ({ t, at: reminderTime(t) }))
    .filter(({ at }) => at && at.getTime() > now && at.getTime() - now < 24 * 3600 * 1000)
    .sort((a, b) => a.at - b.at)
    .map(({ t }) => t);
  const items = [...stats.overdueTasks.map((t) => ({ t, kind: 'overdue' })), ...soon.map((t) => ({ t, kind: 'soon' }))].slice(0, 12);
  const count = stats.overdue + soon.length;

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="icon-btn relative" aria-label={`Notifications${count ? `, ${count} items` : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell className="w-[18px] h-[18px]" />
        {count > 0 && <span className={cn('absolute top-1.5 right-1.5 w-2 h-2 rounded-full', stats.overdue ? 'bg-rose-500' : 'bg-accent')} />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] z-50 card p-2 shadow-[var(--shadow-lg)] anim-pop">
          <p className="px-3 pt-2 pb-1 font-display font-semibold">Notifications</p>
          {items.length ? (
            <ul className="max-h-[60dvh] overflow-y-auto">
              {items.map(({ t, kind }) => (
                <li key={t.task_id + kind}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openEditor({ task: t });
                    }}
                    className="w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
                  >
                    <span className={cn('grid place-items-center w-8 h-8 rounded-lg shrink-0', kind === 'overdue' ? 'bg-rose-500/12 text-rose-500' : 'bg-accent/15 text-accent-ink')}>
                      {kind === 'overdue' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{t.title}</span>
                      <span className="block text-xs text-muted">{kind === 'overdue' ? 'Overdue · ' : 'Reminder · '}{formatDue(t)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-6 text-sm text-muted text-center">You're all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}

function FocusPill() {
  const { timer, remaining } = useFocus();
  const { route, navigate } = useUI();
  if (!timer.running || route === 'focus') return null;
  const s = Math.ceil(remaining / 1000);
  return (
    <button type="button" onClick={() => navigate('focus')} className="chip py-1.5 px-3 border-accent/40 bg-accent/12 text-fg tabular-nums">
      <Timer className="w-3.5 h-3.5 text-accent-ink" />
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </button>
  );
}

function TopBar() {
  const { route, navigate } = useUI();
  const { settings } = useApp();
  const { logout, user } = useAuth();
  const { syncStatus } = useTasks();
  const online = useOnline();
  const page = ALL_NAV.find((n) => n.id === route);

  return (
    <header className="sticky top-0 z-20 glass border-b border-line safe-top-bar">
      <div className="flex items-center gap-2 h-14 md:h-16 px-4 md:px-8 max-w-7xl mx-auto">
        <img src="/icons/logo-128.png" alt="" className="md:hidden w-8 h-8 rounded-xl object-cover" />
        <p className="font-display font-semibold text-base md:text-lg truncate flex-1">{page?.label || 'Ash Do'}</p>
        {!online && (
          <span className="chip py-1 px-2.5" title="You're offline. Everything still works and is saved on this device.">
            <WifiOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        {syncStatus === 'error' && (
          <span className="chip py-1 px-2.5 border-transparent bg-rose-500/12 text-rose-500" title="Couldn't save to device storage. Retrying automatically.">
            <CloudOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Not saved</span>
          </span>
        )}
        <FocusPill />
        <NotificationsButton />
        <Menu
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} aria-label="Profile menu" className="rounded-xl hover:ring-2 hover:ring-line-strong transition">
              <Avatar src={settings.profile?.profileImage} name={settings.profile?.userName || user?.name} size={34} />
            </button>
          )}
          items={[
            { label: 'Profile', icon: User, onClick: () => navigate('settings', { section: 'profile' }) },
            { label: 'Settings', icon: Settings, onClick: () => navigate('settings') },
            { label: 'Data & backup', icon: HardDrive, onClick: () => navigate('settings', { section: 'data' }) },
            'divider',
            { label: 'Sign out', icon: LogOut, danger: true, onClick: logout },
          ]}
        />
      </div>
    </header>
  );
}

export const ResponsiveLayout = ({ children }) => {
  const { route } = useUI();
  const mainRef = useRef(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route]);
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <TopBar />
          <div key={route} className="anim-page max-w-7xl mx-auto px-4 md:px-8 pt-5 md:pt-7 pb-36 md:pb-12">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
