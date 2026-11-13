import React, { useEffect, useRef, useState } from 'react';
import {
  Sun, Moon, Laptop, Bell, Play, Trash2, User, Palette, LayoutDashboard, ListTodo, Target, Timer, Folder, Download, Upload, Info, ChevronUp, ChevronDown, Camera, Check, X, Plus, ShieldCheck, KeyRound, HardDrive, UserX, Loader2, Smartphone,
} from 'lucide-react';
import { useTheme, ACCENTS } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { useTasks } from '../../context/TaskContext';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { buildBackup, parseBackup } from '../../lib/backup';
import { storageInfo, validatePassword } from '../../lib/db';
import { exactAlarmStatus, isNative, notificationPermission, requestExactAlarms, requestNotificationPermission, saveTextFile, notifyNow } from '../../lib/native';
import { DEFAULT_CATEGORIES, REMINDERS } from '../../lib/tasks';
import { WIDGET_LABELS } from '../Dashboard/DashboardView';
import { Avatar, Card, CardHeader, Modal, Segmented, Toggle, cn } from '../ui';

const CATEGORY_COLORS = ['#5B8CFF', '#A78BFA', '#22D3EE', '#34D399', '#F5A524', '#F472B6', '#FB7185', '#C2F23D'];

const NumberField = ({ id, label, value, onChange, min, max, suffix }) => (
  <div>
    <label className="label" htmlFor={id}>{label}</label>
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, Math.round(n))));
        }}
        className="field pr-14"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle">{suffix}</span>}
    </div>
  </div>
);

export const SettingsView = () => {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { settings, updateSettingsSection, setSettingsValue } = useApp();
  const { renameUser, user } = useAuth();
  const { toast, params } = useUI();
  const [newCat, setNewCat] = useState({ name: '', color: CATEGORY_COLORS[0] });
  const [permission, setPermission] = useState('default');
  const [exact, setExact] = useState('unsupported');
  const fileRef = useRef(null);

  useEffect(() => {
    notificationPermission().then(setPermission);
    exactAlarmStatus().then(setExact);
  }, []);
  useEffect(() => {
    if (params.section) document.getElementById(params.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [params.section]);

  const widgets = settings.dashboard.widgets;
  const moveWidget = (i, dir) => {
    const arr = [...widgets];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateSettingsSection('dashboard', 'widgets', arr);
  };
  const toggleWidget = (id) =>
    updateSettingsSection('dashboard', 'widgets', widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast({ title: 'Please choose an image file', tone: 'error' });
    // Downscale to keep localStorage small
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      updateSettingsSection('profile', 'profileImage', canvas.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(url);
      toast({ title: 'Profile photo updated', tone: 'success' });
    };
    img.onerror = () => toast({ title: 'Could not read that image', tone: 'error' });
    img.src = url;
    e.target.value = '';
  };

  const addCategory = (e) => {
    e.preventDefault();
    const name = newCat.name.trim().slice(0, 24);
    if (!name) return;
    const all = [...DEFAULT_CATEGORIES, ...(settings.customCategories || [])];
    if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) return toast({ title: 'That category already exists', tone: 'error' });
    setSettingsValue('customCategories', [...(settings.customCategories || []), { name, color: newCat.color }]);
    setNewCat({ name: '', color: CATEGORY_COLORS[(CATEGORY_COLORS.indexOf(newCat.color) + 1) % CATEGORY_COLORS.length] });
  };

  const requestPermission = async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
    if (p === 'granted') notifyNow('Ash Do', 'Notifications are on. You will be reminded about tasks.');
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <p className="eyebrow">Preferences</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Settings</h1>
      </div>

      {/* Profile */}
      <Card className="scroll-mt-24" id="profile">
        <CardHeader icon={User} title="Profile" subtitle="How Ash Do greets you" />
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative group shrink-0" aria-label="Change profile photo">
            <Avatar src={settings.profile.profileImage} name={settings.profile.userName} size={72} className="rounded-2xl" />
            <span className="absolute inset-0 rounded-2xl bg-black/50 grid place-items-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <div className="flex-1 min-w-0">
            <label className="label" htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              className="field"
              maxLength={40}
              value={settings.profile.userName === 'User' ? '' : settings.profile.userName}
              placeholder="Your name"
              onChange={(e) => updateSettingsSection('profile', 'userName', e.target.value || 'User')}
              onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== user?.name && renameUser(e.target.value)}
            />
            <p className="text-xs text-subtle mt-1.5">Signed in as {user?.email} · local profile on this device</p>
            {settings.profile.profileImage && (
              <button type="button" className="text-xs text-rose-500 font-semibold mt-2" onClick={() => updateSettingsSection('profile', 'profileImage', null)}>
                Remove photo
              </button>
            )}
          </div>
        </div>
        <PasswordForm />
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader icon={Palette} title="Appearance" subtitle="Theme and accent colour" />
        <span className="label">Theme</span>
        <Segmented
          className="w-full"
          value={theme}
          onChange={setTheme}
          options={[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Laptop },
          ]}
        />
        <span className="label mt-5">Accent</span>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={accentColor === a.id}
              onClick={() => setAccentColor(a.id)}
              className={cn('flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-all', accentColor === a.id ? 'border-fg/40 bg-surface-2' : 'border-line hover:bg-surface-2')}
            >
              <span className="grid place-items-center w-5 h-5 rounded-full" style={{ background: a.swatch }}>
                {accentColor === a.id && <Check className="w-3 h-3 text-black/70" strokeWidth={3} />}
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Dashboard widgets */}
      <Card>
        <CardHeader icon={LayoutDashboard} title="Dashboard widgets" subtitle="Show, hide and reorder your bento" />
        <ul className="divide-y divide-line">
          {widgets.map((w, i) => (
            <li key={w.id} className="flex items-center gap-3">
              <div className="flex flex-col">
                <button type="button" className="icon-btn w-6 h-5 rounded-md" aria-label="Move up" disabled={i === 0} onClick={() => moveWidget(i, -1)}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="icon-btn w-6 h-5 rounded-md" aria-label="Move down" disabled={i === widgets.length - 1} onClick={() => moveWidget(i, 1)}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className={cn('flex-1', !w.visible && 'opacity-60')}>
                <Toggle checked={w.visible} onChange={() => toggleWidget(w.id)} label={WIDGET_LABELS[w.id]} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Task display */}
      <Card>
        <CardHeader icon={ListTodo} title="Task display" />
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <span className="label">Density</span>
            <Segmented
              size="sm"
              className="w-full"
              value={settings.taskDisplay.density}
              onChange={(v) => updateSettingsSection('taskDisplay', 'density', v)}
              options={[
                { id: 'comfortable', label: 'Comfy' },
                { id: 'compact', label: 'Compact' },
              ]}
            />
          </div>
          <div>
            <label className="label" htmlFor="set-sort">Default sort</label>
            <select id="set-sort" className="field py-2" value={settings.taskDisplay.defaultSort} onChange={(e) => updateSettingsSection('taskDisplay', 'defaultSort', e.target.value)}>
              <option value="smart">Smart</option>
              <option value="due">Due date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="created">Newest</option>
              <option value="title">A–Z</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="set-group">Group My Tasks by</label>
            <select id="set-group" className="field py-2" value={settings.taskDisplay.groupBy} onChange={(e) => updateSettingsSection('taskDisplay', 'groupBy', e.target.value)}>
              <option value="date">Date</option>
              <option value="priority">Priority</option>
              <option value="category">Category</option>
              <option value="none">No grouping</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Goals + Focus */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardHeader icon={Target} title="Productivity goals" subtitle="Drives your score and quest" />
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="goal-tasks" label="Tasks / day" min={1} max={50} value={settings.goals_v2.dailyTasks} onChange={(v) => updateSettingsSection('goals_v2', 'dailyTasks', v)} />
            <NumberField id="goal-focus" label="Focus / day" min={5} max={600} suffix="min" value={settings.goals_v2.dailyFocusMinutes} onChange={(v) => updateSettingsSection('goals_v2', 'dailyFocusMinutes', v)} />
          </div>
        </Card>
        <Card>
          <CardHeader icon={Timer} title="Focus timer" />
          <div className="grid grid-cols-3 gap-3">
            <NumberField id="f-work" label="Focus" min={1} max={180} suffix="m" value={settings.focus.work} onChange={(v) => updateSettingsSection('focus', 'work', v)} />
            <NumberField id="f-short" label="Short" min={1} max={60} suffix="m" value={settings.focus.shortBreak} onChange={(v) => updateSettingsSection('focus', 'shortBreak', v)} />
            <NumberField id="f-long" label="Long" min={1} max={90} suffix="m" value={settings.focus.longBreak} onChange={(v) => updateSettingsSection('focus', 'longBreak', v)} />
          </div>
          <Toggle label="Auto-start breaks" checked={settings.focus.autoStartBreaks} onChange={(v) => updateSettingsSection('focus', 'autoStartBreaks', v)} />
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader icon={Folder} title="Categories" subtitle="Smart categories plus your own" />
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((c) => (
            <span key={c.name} className="chip py-1.5 px-3">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: c.color }} /> {c.name}
            </span>
          ))}
          {(settings.customCategories || []).map((c) => (
            <span key={c.name} className="chip py-1.5 pl-3 pr-1.5 text-fg">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: c.color }} /> {c.name}
              <button
                type="button"
                aria-label={`Delete category ${c.name}`}
                className="grid place-items-center w-5 h-5 rounded-full hover:bg-surface-3"
                onClick={() => setSettingsValue('customCategories', settings.customCategories.filter((x) => x.name !== c.name))}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addCategory} className="flex flex-wrap items-center gap-2 mt-4">
          <input className="field flex-1 min-w-[160px]" placeholder="New category name" value={newCat.name} maxLength={24} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} aria-label="New category name" />
          <div className="flex gap-1.5" role="radiogroup" aria-label="Category colour">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={newCat.color === c}
                aria-label={c}
                onClick={() => setNewCat({ ...newCat, color: c })}
                className={cn('w-6 h-6 rounded-full transition-transform', newCat.color === c && 'ring-2 ring-offset-2 ring-offset-surface ring-fg/50 scale-110')}
                style={{ background: c }}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-primary" disabled={!newCat.name.trim()}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
        <p className="text-xs text-subtle mt-2">Deleting a category keeps it on existing tasks.</p>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader icon={Bell} title="Notifications & sounds" />
        <div className="divide-y divide-line">
          <Toggle label="Task reminders" description="Alarm and notification at the reminder time" checked={settings.taskNotifications.reminders} onChange={(v) => updateSettingsSection('taskNotifications', 'reminders', v)} />
          <div className="flex items-center justify-between gap-4 py-3">
            <label htmlFor="def-rem" className="text-sm font-medium">Default reminder for timed tasks</label>
            <select id="def-rem" className="field w-auto py-2" value={settings.taskNotifications.defaultReminder} onChange={(e) => updateSettingsSection('taskNotifications', 'defaultReminder', e.target.value)}>
              {REMINDERS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <Toggle label="Alarm sound" checked={settings.alarm.enabled} onChange={(v) => updateSettingsSection('alarm', 'enabled', v)} />
          {exact !== 'unsupported' && (
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Precise reminder times</span>
                <span className="block text-xs text-muted mt-0.5">
                  {exact === 'granted' ? 'On — reminders fire at the exact minute.' : 'Off — Android may deliver reminders a few minutes late to save battery.'}
                </span>
              </span>
              {exact !== 'granted' && (
                <button type="button" className="btn btn-ghost shrink-0" onClick={async () => setExact(await requestExactAlarms())}>
                  Allow
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <button type="button" className="btn btn-ghost" onClick={() => window.playAlarm?.()} disabled={!settings.alarm.enabled}>
              <Play className="w-4 h-4" /> Test sound
            </button>
            {permission === 'granted' ? (
              <span className="chip py-1.5 px-3 text-accent-ink"><ShieldCheck className="w-3.5 h-3.5" /> Notifications on</span>
            ) : permission === 'denied' ? (
              <span className="text-xs text-muted">Notifications are blocked — enable them in {isNative ? 'Android Settings → Apps → Ash Do → Notifications' : "your browser's site settings"}.</span>
            ) : permission === 'unsupported' ? (
              <span className="text-xs text-muted">This browser doesn't support notifications.</span>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={requestPermission}>
                <Bell className="w-4 h-4" /> Enable notifications
              </button>
            )}
          </div>
        </div>
      </Card>

      <DataCard />

      {/* About */}
      <Card className="flex items-center gap-4">
        <img src="/icons/logo-128.png" alt="" className="w-12 h-12 rounded-2xl object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold">{settings.about.appName}</p>
          <p className="text-xs text-muted">v{settings.about.appVersion} · by {settings.about.developer}</p>
          <p className="text-xs text-subtle mt-1">{settings.about.description}</p>
        </div>
        <Info className="w-4 h-4 text-subtle shrink-0" />
      </Card>

    </div>
  );
};

function PasswordForm() {
  const { changePassword } = useAuth();
  const { toast } = useUI();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const v = validatePassword(f.next);
    if (v) return setErr(v);
    if (f.next !== f.confirm) return setErr("New passwords don't match");
    setBusy(true);
    setErr('');
    try {
      await changePassword(f.current, f.next);
      toast({ title: 'Password changed', description: 'Your data was re-encrypted with the new password.', tone: 'success' });
      setF({ current: '', next: '', confirm: '' });
      setOpen(false);
    } catch (ex) {
      setErr(ex.message || 'Could not change password');
    } finally {
      setBusy(false);
    }
  };
  if (!open)
    return (
      <button type="button" className="btn btn-ghost mt-4" onClick={() => setOpen(true)}>
        <KeyRound className="w-4 h-4" /> Change password
      </button>
    );
  return (
    <form onSubmit={submit} className="mt-4 grid sm:grid-cols-3 gap-2 anim-pop">
      <input type="password" className="field" placeholder="Current password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} aria-label="Current password" />
      <input type="password" className="field" placeholder="New password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} aria-label="New password" />
      <input type="password" className="field" placeholder="Confirm new" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} aria-label="Confirm new password" />
      {err && <p className="sm:col-span-3 text-xs text-rose-500">{err}</p>}
      <div className="sm:col-span-3 flex gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !f.current || !f.next}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Update password
        </button>
      </div>
    </form>
  );
}

const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function DataCard() {
  const auth = useAuth();
  const { settings, goals, journal } = useApp();
  const { tasks, sessions, achievementsSeen } = useTasks();
  const { toast } = useUI();
  const [info, setInfo] = useState(null);
  const [pending, setPending] = useState(null); // { text, summary }
  const [confirm, setConfirm] = useState(null); // 'profile' | 'device'
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    storageInfo().then(setInfo);
  }, [tasks.length]);

  const exportBackup = async () => {
    try {
      const json = JSON.stringify(buildBackup({ user: auth.user, tasks, sessions, settings, goals, journal, achievementsSeen }), null, 2);
      await saveTextFile(`ash-do-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
      toast({ title: 'Backup ready', description: `${tasks.length} tasks exported. Keep the file somewhere safe.`, tone: 'success' });
    } catch (e) {
      if (!/cancel/i.test(e?.message || '')) toast({ title: 'Export failed', description: e.message, tone: 'error' });
    }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1048576) return toast({ title: 'That file is too large to be a backup', tone: 'error' });
    try {
      const text = await file.text();
      const { summary } = parseBackup(text, 'merge', { goals, journal });
      setPending({ text, summary });
    } catch (err) {
      toast({ title: 'Could not read backup', description: err.message, tone: 'error' });
    }
  };

  const restore = async (mode) => {
    setBusy(true);
    try {
      const { puts, summary } = parseBackup(pending.text, mode, { goals, journal });
      await auth.restore(puts, mode);
      toast({ title: 'Backup restored', description: `${summary.tasks} tasks ${mode === 'replace' ? 'restored' : 'merged'}.`, tone: 'success' });
    } catch (err) {
      toast({ title: 'Restore failed — nothing was changed', description: err.message, tone: 'error' });
      setBusy(false);
    }
  };

  const destroy = async () => {
    setBusy(true);
    try {
      if (confirm === 'profile') await auth.deleteProfile();
      else await auth.wipeDevice();
    } catch (err) {
      toast({ title: 'Could not delete data', description: err.message, tone: 'error' });
      setBusy(false);
    }
  };
  const confirmWord = confirm === 'device' ? 'DELETE' : auth.user?.email || '';

  return (
    <Card id="data" className="scroll-mt-24">
      <CardHeader icon={HardDrive} title="Data & backup" subtitle={`${tasks.length} tasks · ${sessions.length} focus sessions · stored only on this device`} />
      <div className="rounded-2xl bg-surface-2 p-3 text-xs text-muted flex items-start gap-2 mb-4">
        <Smartphone className="w-4 h-4 shrink-0 text-subtle" />
        <span>
          Everything is saved locally and encrypted with your password. Nothing is sent to a server, and it isn't synced to other devices.
          {info ? ` Using ${fmtBytes(info.usage || 0)}.` : ''}
          {info && !info.persisted && !isNative ? ' Your browser may clear site data under storage pressure — install the app or export backups regularly.' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" onClick={exportBackup}>
          <Download className="w-4 h-4" /> Export backup
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" /> Restore from backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} aria-label="Backup file" />
      </div>
      <div className="border-t border-line mt-5 pt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-danger" onClick={() => { setTyped(''); setConfirm('profile'); }}>
          <UserX className="w-4 h-4" /> Delete my profile
        </button>
        <button type="button" className="btn btn-danger" onClick={() => { setTyped(''); setConfirm('device'); }}>
          <Trash2 className="w-4 h-4" /> Delete all app data on this device
        </button>
      </div>

      <Modal open={Boolean(pending)} onClose={() => !busy && setPending(null)} className="sm:max-w-md" labelledBy="restore-title">
        {pending && (
          <div className="p-6">
            <h2 id="restore-title" className="font-display font-semibold text-lg">Restore this backup?</h2>
            <p className="text-sm text-muted mt-1">
              {pending.summary.tasks} tasks · {pending.summary.sessions} focus sessions · {pending.summary.goals} goals
              {pending.summary.exportedAt && ` · saved ${new Date(pending.summary.exportedAt).toLocaleDateString()}`}
              {pending.summary.name && ` · from ${pending.summary.name}`}
            </p>
            <div className="grid gap-2 mt-5">
              <button className="btn btn-primary justify-start h-auto py-3 text-left whitespace-normal" disabled={busy} onClick={() => restore('merge')}>
                <span>
                  <span className="block">Merge</span>
                  <span className="block text-xs font-normal opacity-80">Adds backup items and updates matching tasks. Your settings stay as they are.</span>
                </span>
              </button>
              <button className="btn btn-ghost justify-start h-auto py-3 text-left whitespace-normal" disabled={busy} onClick={() => restore('replace')}>
                <span>
                  <span className="block">Replace everything</span>
                  <span className="block text-xs font-normal text-muted">Removes this profile's current data and uses the backup instead.</span>
                </span>
              </button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(confirm)} onClose={() => !busy && setConfirm(null)} className="sm:max-w-sm" labelledBy="delete-title">
        <div className="p-6">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-rose-500/12 text-rose-500 mb-3">
            <Trash2 className="w-6 h-6" />
          </span>
          <h2 id="delete-title" className="font-display font-semibold text-lg">
            {confirm === 'device' ? 'Delete all Ash Do data?' : 'Delete your profile?'}
          </h2>
          <p className="text-sm text-muted mt-1">
            {confirm === 'device'
              ? 'Every profile, task, setting and cached file on this device will be permanently erased.'
              : 'Your profile and all of its tasks, goals and history will be permanently erased from this device.'}{' '}
            This can't be undone. Export a backup first if you might need it.
          </p>
          <label className="block mt-4">
            <span className="label">Type {confirm === 'device' ? 'DELETE' : 'your email'} to confirm</span>
            <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <div className="flex gap-2 mt-5">
            <button className="btn btn-ghost flex-1" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn flex-1 bg-rose-500 text-white" disabled={busy || typed.trim().toLowerCase() !== confirmWord.toLowerCase()} onClick={destroy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
