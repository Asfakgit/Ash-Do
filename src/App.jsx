import React, { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { UIProvider, useUI } from './context/UIContext';
import { AuthProvider, SessionProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TaskProvider } from './context/TaskContext';
import { FocusProvider } from './context/FocusContext';
import { ResponsiveLayout } from './components/ResponsiveLayout';
import { DashboardView } from './components/Dashboard/DashboardView';
import { TasksView } from './components/Tasks/TasksView';
import { TaskEditor } from './components/Tasks/TaskEditor';
import { CalendarView } from './components/Calendar/CalendarView';
import { FocusView } from './components/Focus/FocusView';
import { AchievementsView } from './components/Achievements/AchievementsView';
import { SettingsView } from './components/MobileViews/SettingsView';
import { AuthScreen } from './components/Auth/AuthScreen';
import { AlarmManager } from './components/AlarmManager';
import { TaskAlarmManager } from './components/TaskAlarmManager';
import { Confetti, Toaster } from './components/ui';
import { hideSplash, initNative, minimizeApp, setStatusBarTheme } from './lib/native';

function CurrentView() {
  const { route } = useUI();
  switch (route) {
    case 'tasks':
    case 'today':
    case 'upcoming':
      return <TasksView key={route} preset={route} />;
    case 'calendar':
      return <CalendarView />;
    case 'focus':
      return <FocusView />;
    case 'achievements':
      return <AchievementsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

function Shell() {
  const { route, navigate, openEditor, editor } = useUI();
  const { notice } = useAuth();
  const { toast } = useUI();

  useEffect(() => {
    if (notice) toast({ title: notice, duration: 6000 });
  }, [notice, toast]);

  // "N" opens a new task (when not typing)
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || editor) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openEditor({});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openEditor, editor]);

  // Android hardware back: overlays close first (see pushBackHandler), then pages, then minimise.
  useEffect(() => {
    let cleanup = () => {};
    initNative({
      onRootBack: () => (window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard') !== 'dashboard' ? navigate('dashboard') : minimizeApp(),
      onPause: () => window.__ashdoFlush?.(),
    }).then((fn) => (cleanup = fn));
    return () => cleanup();
  }, [navigate]);

  return (
    <>
      <AlarmManager />
      <TaskAlarmManager />
      <ResponsiveLayout>
        <CurrentView key={route} />
      </ResponsiveLayout>
      <TaskEditor />
    </>
  );
}

function Splash({ children }) {
  return (
    <div className="min-h-[100dvh] grid place-items-center p-6 text-center">
      <div className="anim-fade">
        <img src="/icons/logo-128.png" alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

function Gate() {
  const auth = useAuth();
  const { toast } = useUI();
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    setStatusBarTheme(effectiveTheme === 'dark');
  }, [effectiveTheme]);

  useEffect(() => {
    const onUpdate = (e) =>
      toast({
        title: 'A new version of Ash Do is ready',
        duration: 0,
        action: { label: 'Reload', onClick: () => e.detail?.postMessage('SKIP_WAITING') },
      });
    window.addEventListener('ashdo:update-ready', onUpdate);
    return () => window.removeEventListener('ashdo:update-ready', onUpdate);
  }, [toast]);

  useEffect(() => {
    if (auth.status !== 'booting') hideSplash();
  }, [auth.status]);

  if (auth.status === 'booting') {
    return (
      <Splash>
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-subtle" aria-label="Loading" />
      </Splash>
    );
  }
  if (auth.status === 'unsupported' || auth.status === 'error') {
    return (
      <Splash>
        <ShieldAlert className="w-6 h-6 mx-auto text-rose-500 mb-2" />
        <p className="font-display font-semibold text-lg">Local storage isn't available</p>
        <p className="text-sm text-muted mt-1 max-w-sm">
          {auth.error ||
            'Ash Do needs a secure context (https:// or the installed app) with IndexedDB. Private browsing or blocked site data can also prevent saving.'}
        </p>
      </Splash>
    );
  }
  if (auth.status === 'signedOut') return <AuthScreen />;

  return (
    <SessionProvider
      key={`${auth.user.id}:${auth.version}`}
      onSaveError={(e) => toast({ title: "Couldn't save to this device", description: `${e?.message || 'Storage error'}. Your changes are kept and will be retried.`, tone: 'error', duration: 8000 })}
    >
      <AppProvider>
        <TaskProvider>
          <FocusProvider>
            <Shell />
          </FocusProvider>
        </TaskProvider>
      </AppProvider>
    </SessionProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UIProvider>
        <AuthProvider>
          <Gate />
          <Toaster />
          <Confetti />
        </AuthProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
