import React, { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, Smartphone, ArrowLeft, Plus, Loader2, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EMAIL_RE, validatePassword } from '../../lib/db';
import { Avatar, cn } from '../ui';

function Field({ icon: Icon, label, error, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input {...props} className={cn('field pl-9', props.className)} aria-invalid={Boolean(error)} />
      </span>
      {error && <span className="block text-xs text-rose-500 mt-1">{error}</span>}
    </label>
  );
}

export function AuthScreen() {
  const { users, register, login, legacyAvailable } = useAuth();
  const [mode, setMode] = useState(users.length ? 'pick' : 'register');
  const [picked, setPicked] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [remember, setRemember] = useState(true);
  const [importLegacy, setImportLegacy] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const email = mode === 'login' && picked ? picked.email : form.email;
    if (mode === 'register') {
      if (!form.name.trim()) errs.name = 'Enter your name';
      if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email';
      const pw = validatePassword(form.password);
      if (pw) errs.password = pw;
      else if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    } else {
      if (!EMAIL_RE.test(String(email).trim())) errs.email = 'Enter a valid email';
      if (!form.password) errs.password = 'Enter your password';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (mode === 'register') await register({ name: form.name, email: form.email, password: form.password, remember, importLegacy: legacyAvailable && importLegacy });
      else await login({ email, password: form.password, remember });
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong' });
      setForm((f) => ({ ...f, password: '', confirm: '' }));
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (m, user = null) => {
    setMode(m);
    setPicked(user);
    setErrors({});
    setForm({ name: '', email: user?.email || '', password: '', confirm: '' });
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto flex items-center justify-center p-4 safe-top-bar">
      <div className="w-full max-w-md anim-page">
        <div className="text-center mb-8">
          <img src="/icons/logo-128.png" alt="" className="w-16 h-16 rounded-2xl mx-auto shadow-lg" />
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-4">
            Ash<span className="text-accent-ink">Do</span>
          </h1>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-subtle mt-2">PLAN SMART · FOCUS DEEP · LEVEL UP</p>
        </div>

        <div className="card p-6">
          {mode === 'pick' && (
            <>
              <h2 className="font-display font-semibold text-lg">Who's planning today?</h2>
              <p className="text-sm text-muted mt-1">Choose your profile on this device.</p>
              <ul className="mt-5 space-y-2">
                {users.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => switchTo('login', u)} className="w-full flex items-center gap-3 rounded-2xl border border-line bg-surface-2 hover:bg-surface-3 p-3 text-left transition-colors">
                      <Avatar name={u.name} size={40} />
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">{u.name}</span>
                        <span className="block text-xs text-muted truncate">{u.email}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => switchTo('register')} className="btn btn-ghost w-full mt-3">
                <Plus className="w-4 h-4" /> Add a profile
              </button>
            </>
          )}

          {mode !== 'pick' && (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="flex items-center gap-2">
                {users.length > 0 && (
                  <button type="button" className="icon-btn -ml-2" aria-label="Back to profiles" onClick={() => switchTo('pick')}>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h2 className="font-display font-semibold text-lg">
                    {mode === 'register' ? 'Create your profile' : `Welcome back${picked ? `, ${picked.name.split(' ')[0]}` : ''}`}
                  </h2>
                  <p className="text-sm text-muted">{mode === 'register' ? 'Stored only on this device.' : 'Unlock your tasks.'}</p>
                </div>
              </div>

              {mode === 'register' && <Field icon={User} label="Name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={40} error={errors.name} autoFocus />}
              {(mode === 'register' || !picked) && (
                <Field icon={Mail} label="Email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={errors.email} />
              )}
              <label className="block">
                <span className="label">Password</span>
                <span className="relative block">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={form.password}
                    onChange={set('password')}
                    autoFocus={mode === 'login'}
                    className="field pl-9 pr-10"
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-8 h-8" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((s) => !s)}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </span>
                {errors.password ? (
                  <span className="block text-xs text-rose-500 mt-1">{errors.password}</span>
                ) : (
                  mode === 'register' && <span className="block text-xs text-subtle mt-1">At least 8 characters, with letters and numbers.</span>
                )}
              </label>
              {mode === 'register' && (
                <Field icon={Lock} label="Confirm password" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
              )}

              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Keep me signed in on this device
              </label>
              {mode === 'register' && legacyAvailable && (
                <label className="flex items-start gap-2.5 text-sm rounded-2xl bg-accent/10 border border-accent/30 p-3">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-[var(--accent)]" checked={importLegacy} onChange={(e) => setImportLegacy(e.target.checked)} />
                  <span>
                    <span className="font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Import tasks from the previous version</span>
                    <span className="block text-xs text-muted mt-0.5">Moves them into this profile and encrypts them.</span>
                  </span>
                </label>
              )}

              {errors.form && <p className="text-sm text-rose-500 rounded-xl bg-rose-500/10 px-3 py-2" role="alert">{errors.form}</p>}

              <button type="submit" className="btn btn-primary w-full h-11" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'register' ? 'Create profile' : 'Unlock'}
              </button>
              {mode === 'login' && !picked && (
                <button type="button" className="w-full text-sm text-accent-ink font-semibold" onClick={() => switchTo('register')}>
                  New here? Create a profile
                </button>
              )}
              {mode === 'register' && users.length === 0 && (
                <button type="button" className="w-full text-sm text-muted" onClick={() => switchTo('login')}>
                  Already have a profile on this device? Sign in
                </button>
              )}
            </form>
          )}
        </div>

        <div className="mt-5 grid gap-2 text-xs text-muted">
          <p className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 shrink-0 text-subtle" />
            Profiles live on this device only and are not synced to other devices. Use Settings → Data & backup to move your data.
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-subtle" />
            Your tasks are encrypted with your password. If you forget it, the data can't be recovered — keep a backup.
          </p>
        </div>
      </div>
    </div>
  );
}
