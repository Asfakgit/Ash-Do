import React, { useRef, useState } from 'react';
import { Lock, AtSign, Eye, EyeOff, ShieldCheck, Loader2, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeUsername, validatePassword, validateUsername } from '../../lib/db';
import { Avatar, cn } from '../ui';

function Field({ icon: Icon, label, error, hint, right, inputRef, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input ref={inputRef} {...props} className={cn('field pl-9', right && 'pr-10')} aria-invalid={Boolean(error)} />
        {right}
      </span>
      {error ? <span className="block text-xs text-rose-500 mt-1">{error}</span> : hint && <span className="block text-xs text-subtle mt-1">{hint}</span>}
    </label>
  );
}

export function AuthScreen() {
  const { users, register, login, legacyAvailable } = useAuth();
  const [mode, setMode] = useState(users.length ? 'login' : 'register');
  // Most recently used account on this phone is pre-filled, so usually only the password is needed.
  const [form, setForm] = useState({ username: users[0]?.username || '', password: '', confirm: '' });
  const [remember, setRemember] = useState(true);
  const [importLegacy, setImportLegacy] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isRegister = mode === 'register';

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (isRegister) {
      const u = validateUsername(form.username);
      if (u) errs.username = u;
      else if (users.some((x) => x.username === normalizeUsername(form.username))) errs.username = 'That username is already taken on this phone';
      const pw = validatePassword(form.password);
      if (pw) errs.password = pw;
      else if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    } else {
      if (!form.username.trim()) errs.username = 'Enter your username';
      if (!form.password) errs.password = 'Enter your password';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (isRegister) await register({ username: form.username, password: form.password, remember, importLegacy: legacyAvailable && importLegacy });
      else await login({ username: form.username, password: form.password, remember });
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong' });
      setForm((f) => ({ ...f, password: '', confirm: '' }));
      setBusy(false);
    }
  };

  const switchTo = (m) => {
    setMode(m);
    setErrors({});
    setShowPw(false);
    setForm({ username: m === 'login' ? users[0]?.username || '' : '', password: '', confirm: '' });
  };

  const pickUser = (u) => {
    setErrors({});
    setForm((f) => ({ ...f, username: u.username, password: '' }));
    passwordRef.current?.focus();
  };

  const eye = (
    <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-8 h-8" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((s) => !s)}>
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
  const selected = normalizeUsername(form.username);

  return (
    <div className="h-[100dvh] overflow-y-auto safe-top-bar">
      <div className="min-h-full w-full max-w-sm mx-auto flex flex-col justify-center px-4 py-8 anim-page">
        <div className="text-center mb-6">
          <img src="/icons/logo-128.png" alt="" className="w-14 h-14 rounded-2xl mx-auto" />
          <h1 className="font-display text-2xl font-semibold tracking-tight mt-3">{isRegister ? 'Create account' : 'Sign in'}</h1>
          <p className="text-sm text-muted mt-1">{isRegister ? 'Your own tasks, settings and pages.' : 'Welcome back to Ash Do.'}</p>
        </div>

        {!isRegister && users.length > 0 && (
          <div className="mb-4">
            <p className="label">On this phone</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pickUser(u)}
                  aria-pressed={selected === u.username}
                  className={cn(
                    'flex items-center gap-2 shrink-0 rounded-full border pl-1 pr-3 py-1 text-sm transition-colors',
                    selected === u.username ? 'border-accent-ink/60 bg-accent/10 text-fg' : 'border-line bg-surface text-muted'
                  )}
                >
                  <Avatar name={u.name} size={26} className="rounded-full" />@{u.username}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="card p-5 space-y-4" noValidate>
          <Field
            icon={AtSign}
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            value={form.username}
            onChange={set('username')}
            error={errors.username}
            hint={isRegister ? '3–20 letters or numbers. You can also use . _ -' : ''}
            autoFocus={isRegister || !form.username}
          />
          <Field
            icon={Lock}
            label="Password"
            inputRef={passwordRef}
            type={showPw ? 'text' : 'password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint={isRegister ? 'At least 8 characters, with letters and numbers.' : ''}
            autoFocus={!isRegister && Boolean(form.username)}
            right={eye}
          />
          {isRegister && (
            <Field icon={Lock} label="Confirm password" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          )}

          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in
          </label>
          {isRegister && legacyAvailable && (
            <label className="flex items-start gap-2.5 text-sm rounded-2xl bg-accent/10 border border-accent/30 p-3">
              <input type="checkbox" className="w-4 h-4 mt-0.5 accent-[var(--accent)]" checked={importLegacy} onChange={(e) => setImportLegacy(e.target.checked)} />
              <span>
                <span className="font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Import tasks from the previous version</span>
                <span className="block text-xs text-muted mt-0.5">Moves them into this account and encrypts them.</span>
              </span>
            </label>
          )}

          {errors.form && <p className="text-sm text-rose-500 rounded-xl bg-rose-500/10 px-3 py-2" role="alert">{errors.form}</p>}

          <button type="submit" className="btn btn-primary w-full h-11" disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {isRegister ? (
          users.length > 0 && (
            <button type="button" className="mt-4 text-sm text-muted" onClick={() => switchTo('login')}>
              Already have an account? <span className="font-semibold text-accent-ink">Sign in</span>
            </button>
          )
        ) : (
          <button type="button" className="mt-4 text-sm text-muted" onClick={() => switchTo('register')}>
            New here? <span className="font-semibold text-accent-ink">Create an account</span>
          </button>
        )}

        <p className="mt-6 flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="w-4 h-4 shrink-0 text-subtle" />
          <span>
            Each account has its own tasks, settings and pages. Everything stays on this phone, encrypted with the account's password. A forgotten
            password can't be reset, so keep a backup (Settings → Data &amp; backup).
          </span>
        </p>
      </div>
    </div>
  );
}
