import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lock, AtSign, Eye, EyeOff, ShieldCheck, Loader2, Download, User, LogIn, UserPlus, CheckCircle2, ArrowLeft, Hourglass, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeUsername, validatePassword, validateUsername } from '../../lib/db';
import { Segmented, cn } from '../ui';
import { AdminContact } from '../AdminContact';
import { FlashlightBoy } from './FlashlightBoy';
import { BOY_LENS_R, BOY_REACH, BOY_SHOULDER, BOY_VIEW } from './boyGeometry';
import './authScene.css';

const INTRO_FALLBACK_MS = 3800; // in case animationend never arrives (e.g. backgrounded tab)

function Field({ icon: Icon, label, error, right, inputRef, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input ref={inputRef} {...props} className={cn('field pl-9', right && 'pr-10')} aria-invalid={Boolean(error)} />
        {right}
      </span>
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const RAYS = 24;

// Distance along a ray (origin o, unit direction d) to where it enters the rectangle, or null.
function rayToRect(ox, oy, dx, dy, l, t, r, b) {
  let tmin = 0;
  let tmax = Infinity;
  for (const [o, d, lo, hi] of [[ox, dx, l, r], [oy, dy, t, b]]) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

// Where the flashlight points and the light cone from its lens to the card, in scene coordinates.
// Uses the boy's static slot (not the walking element), so it is already right during the walk-in.
function measureBeam(scene, slot, card) {
  const s = scene.getBoundingClientRect();
  const b = slot.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  if (!b.width || !c.width) return null;
  const k = b.width / BOY_VIEW.w;
  const sx = b.left - s.left + BOY_SHOULDER.x * k;
  const sy = b.top - s.top + BOY_SHOULDER.y * k;
  const l = c.left - s.left;
  const t = c.top - s.top;
  const r = l + c.width;
  const btm = t + c.height;
  // Kid above the card (phones): point the torch down at the top of the card.
  // Kid beside the card (wide screens): point it at the middle of the card.
  const above = b.bottom <= c.top + 1;
  const target = { x: l + c.width / 2, y: above ? t + Math.min(c.height * 0.3, 100) : t + c.height / 2 };
  const ang = clamp(Math.atan2(target.y - sy, target.x - sx), -0.5, above ? 1.35 : 0.8);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const lens = { x: sx + cos * BOY_REACH * k, y: sy + sin * BOY_REACH * k };
  // The light cone is exactly as tall as the card seen from the lens (top-left to bottom-left
  // corner), so the card fills the light. Each ray stops where it meets the card (plus a little,
  // hidden under the card, so the blur leaves no gap).
  const cornerAngles = [[l, t], [r, t], [r, btm], [l, btm]].map(([x, y]) => wrapAngle(Math.atan2(y - lens.y, x - lens.x) - ang));
  const from = Math.min(...cornerAngles) + 0.005;
  const to = Math.max(...cornerAngles) - 0.005;
  const fallback = Math.hypot(target.x - lens.x, target.y - lens.y);
  const edge = [];
  for (let i = 0; from < to && i <= RAYS; i++) {
    const a = ang + from + ((to - from) * i) / RAYS;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hit = (rayToRect(lens.x, lens.y, dx, dy, l, t, r, btm) ?? fallback) + 10;
    edge.push([lens.x + dx * hit, lens.y + dy * hit]);
  }
  const half = BOY_LENS_R * k;
  const pts = edge.length ? [[lens.x + sin * half, lens.y - cos * half], ...edge, [lens.x - sin * half, lens.y + cos * half]] : [];
  return {
    deg: (ang * 180) / Math.PI,
    lens,
    target,
    points: pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' '),
    w: s.width,
    h: s.height,
    walkFrom: b.right + 12,
  };
}

function useBeam(sceneRef, slotRef, cardRef) {
  const [geo, setGeo] = useState(null);
  const update = useCallback(() => {
    const [scene, slot, card] = [sceneRef.current, slotRef.current, cardRef.current];
    if (scene && slot && card) setGeo(measureBeam(scene, slot, card));
  }, [sceneRef, slotRef, cardRef]);

  useLayoutEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    [sceneRef.current, slotRef.current, cardRef.current].forEach((el) => el && ro.observe(el));
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update, sceneRef, slotRef, cardRef]);

  return geo;
}

// What the admin is asked for, per sign-in problem (pre-filled WhatsApp message).
const contactMessage = (code, username) =>
  ({
    pending: `Hi, I registered on Ash Do as @${username}. Please approve my account.`,
    rejected: `Hi, my Ash Do registration @${username} was rejected. Please review it.`,
    disabled: `Hi, my Ash Do account @${username} is disabled. Please enable it.`,
    reset: `Hi, I asked for a password reset for my Ash Do account @${username}. Please approve it.`,
  })[code];

// Sign-in problems: pending approval (amber), rejected / disabled (red, with the admin's WhatsApp),
// anything else (red).
function FormNotice({ error, username }) {
  const needsAdmin = ['pending', 'rejected', 'disabled'].includes(error.code);
  const pending = error.code === 'pending';
  return (
    <div
      role="alert"
      className={cn('rounded-xl px-3 py-2.5 text-sm', pending ? 'bg-amber-500/12 border border-amber-500/40 text-amber-800' : 'bg-rose-500/10 text-rose-600')}
    >
      {pending && (
        <p className="font-semibold flex items-center gap-1.5 mb-0.5">
          <Hourglass className="w-3.5 h-3.5" /> Account pending approval
        </p>
      )}
      <p>{error.message}</p>
      {needsAdmin && <AdminContact className="mt-2.5 text-fg" message={contactMessage(error.code, username)} />}
    </div>
  );
}

// After a sign-up that needs approval, or a password-reset request.
function DonePanel({ done, onBack }) {
  const registered = done.kind === 'registered';
  return (
    <div className="text-center anim-fade">
      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 mx-auto mb-3">
        <CheckCircle2 className="w-6 h-6" />
      </span>
      <h1 className="font-display text-xl font-semibold tracking-tight">{registered ? 'Registration submitted!' : 'Reset requested'}</h1>
      <p className="text-sm text-muted mt-1.5">
        {registered ? (
          <>
            <strong className="text-fg">@{done.username}</strong> is{' '}
            <span className="rounded-md bg-amber-500/15 text-amber-700 font-semibold px-1.5 py-0.5">PENDING</span> admin approval. An admin of this
            phone approves it in Settings → Admin; then you can sign in.
          </>
        ) : (
          <>
            When an admin of this phone approves it, sign in as <strong className="text-fg">@{done.username}</strong> with your new password. The
            account starts fresh, because the old tasks were locked with the old password.
          </>
        )}
      </p>
      <AdminContact
        className="mt-4"
        title="Need it sooner? Contact admin on WhatsApp"
        message={contactMessage(registered ? 'pending' : 'reset', done.username)}
      />
      <button type="button" className="btn btn-primary w-full h-11 mt-5" onClick={onBack}>
        Back to sign in
      </button>
    </div>
  );
}

const TITLES = {
  login: ['Welcome back', 'Follow the light to your account.'],
  register: ['Create account', 'Follow the light into Ash Do.'],
  forgot: ['Forgot password', 'Choose a new one; an admin approves it.'],
};

export function AuthScreen() {
  const { users, register, login, requestPasswordReset, legacyAvailable } = useAuth();
  const [mode, setMode] = useState(users.length ? 'login' : 'register'); // login | register | forgot
  const firstAccount = users.length === 0; // the first account on this phone becomes its admin
  // Most recently used account on this phone is pre-filled, so usually only the password is needed.
  const [form, setForm] = useState({ name: '', username: users[0]?.username || '', password: '', confirm: '' });
  const [remember, setRemember] = useState(true);
  const [importLegacy, setImportLegacy] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { kind: 'registered' | 'reset', username }
  const [intro, setIntro] = useState('playing');
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const sceneRef = useRef(null);
  const slotRef = useRef(null);
  const cardRef = useRef(null);
  const geo = useBeam(sceneRef, slotRef, cardRef);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  const finishIntro = useCallback(() => setIntro('done'), []);
  useEffect(() => {
    if (intro !== 'playing') return;
    const t = setTimeout(finishIntro, INTRO_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [intro, finishIntro]);

  // Once the card is lit, put the cursor where it's needed. Skipped on touch screens so the
  // keyboard doesn't jump up over the scene before the user taps a field.
  const didAutoFocus = useRef(false);
  useEffect(() => {
    if (intro !== 'done' || didAutoFocus.current) return;
    didAutoFocus.current = true;
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    (mode === 'login' && form.username ? passwordRef : usernameRef).current?.focus({ preventScroll: true });
  }, [intro, mode, form.username]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (isRegister) {
      if (!form.name.trim()) errs.name = 'Enter your full name';
      const u = validateUsername(form.username);
      if (u) errs.username = u;
      else if (users.some((x) => x.username === normalizeUsername(form.username))) errs.username = 'That username is already taken on this phone';
    } else if (!form.username.trim()) errs.username = 'Enter your username';
    if (isRegister || isForgot) {
      const pw = validatePassword(form.password);
      if (pw) errs.password = pw;
      else if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    } else if (!form.password) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const username = normalizeUsername(form.username);
    try {
      if (isRegister) {
        const res = await register({
          name: form.name,
          username: form.username,
          password: form.password,
          remember,
          importLegacy: firstAccount && legacyAvailable && importLegacy,
        });
        if (!res?.pending) return; // signed straight in (first account)
        setDone({ kind: 'registered', username });
      } else if (isForgot) {
        await requestPasswordReset(form.username, form.password);
        setDone({ kind: 'reset', username });
      } else {
        await login({ username: form.username, password: form.password, remember });
        return;
      }
      setForm((f) => ({ ...f, password: '', confirm: '' }));
      setBusy(false);
    } catch (err) {
      setErrors({ form: { message: err.message || 'Something went wrong', code: err.code } });
      setForm((f) => ({ ...f, password: '', confirm: '' }));
      setBusy(false);
    }
  };

  const switchTo = (m, username) => {
    setMode(m);
    setErrors({});
    setShowPw(false);
    setDone(null);
    setForm({ name: '', username: username ?? (m === 'register' ? '' : users[0]?.username || ''), password: '', confirm: '' });
  };

  const eye = (
    <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-8 h-8" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((s) => !s)}>
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const [title, subtitle] = TITLES[mode];
  const submitLabel = isRegister ? (firstAccount ? 'Create admin account' : 'Request account') : isForgot ? 'Request reset' : 'Sign in';

  return (
    <div
      className={cn('auth-scene h-[100dvh] overflow-y-auto overflow-x-hidden safe-top-bar', intro === 'done' && 'is-static')}
      onPointerDown={intro === 'playing' ? finishIntro : undefined}
    >
      <div ref={sceneRef} className="relative min-h-full w-full flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 pt-6 pb-10 sm:py-8">

        {geo && (
          <svg className="auth-beam fb-anim" width={geo.w} height={geo.h} aria-hidden="true">
            <defs>
              <linearGradient id="auth-beam-fill" gradientUnits="userSpaceOnUse" x1={geo.lens.x} y1={geo.lens.y} x2={geo.target.x} y2={geo.target.y}>
                <stop offset="0" stopColor="#fff7e0" stopOpacity="0.6" />
                <stop offset="0.4" stopColor="#ffefd2" stopOpacity="0.24" />
                <stop offset="1" stopColor="#ffe8c4" stopOpacity="0.1" />
              </linearGradient>
              <filter id="auth-beam-soft" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            <polygon points={geo.points} fill="url(#auth-beam-fill)" filter="url(#auth-beam-soft)" />
          </svg>
        )}

        {/* Phones: the kid stands at the top and shines the torch down onto the card.
            Wider screens: he stands in the middle of the dark area, the card sits on the right. */}
        <div className="sm:flex-1 min-w-0 flex justify-start sm:justify-center pl-[2vw] sm:pl-0 sm:pr-[clamp(18px,7vw,64px)]">
          {/* Static slot (measured for the beam); the kid walks into it. On wide screens it is sized
              by screen height, but never wider than the space left of the card. */}
          <div ref={slotRef} className="relative z-[1] w-[clamp(110px,35vw,150px)] sm:w-full sm:max-w-[calc(min(36vh,290px)*0.858)]">
            <div className="fb-anim fb-walker" style={{ '--walk-from': `${geo?.walkFrom ?? 220}px` }}>
              <FlashlightBoy armDeg={geo?.deg ?? 0} className="block w-full h-auto" />
            </div>
          </div>
        </div>

        {/* Phones: spare height goes between the kid and the card, so the beam has room to travel. */}
        <div className="flex-1 min-h-8 sm:hidden" aria-hidden="true" />

        <div className="relative z-[2] shrink-0 w-full max-w-sm self-center sm:w-[22rem] sm:mr-[5vw]">
          <div className="auth-halo fb-anim" aria-hidden="true" />
          <div
            ref={cardRef}
            className="auth-card fb-anim relative p-5"
            onAnimationEnd={(e) => e.target === e.currentTarget && e.animationName === 'fb-reveal' && finishIntro()}
          >
            {done ? (
              <DonePanel done={done} onBack={() => switchTo('login', done.username)} />
            ) : (
              <>
                <div key={mode} className="text-center mb-4 anim-fade">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
                  <p className="text-sm text-muted mt-0.5">{subtitle}</p>
                </div>

                {/* Sign in / Register, as in Ash Flow */}
                {!isForgot && (
                  <Segmented
                    className="w-full mb-4"
                    value={mode}
                    onChange={(m) => m !== mode && switchTo(m)}
                    options={[
                      { id: 'login', label: 'Sign in', icon: LogIn },
                      { id: 'register', label: 'Register', icon: UserPlus },
                    ]}
                  />
                )}

                <form onSubmit={submit} className="space-y-3" noValidate>
                  {isRegister && (
                    <Field
                      icon={User}
                      label="Full name"
                      autoComplete="name"
                      maxLength={40}
                      placeholder="e.g. Adam"
                      value={form.name}
                      onChange={set('name')}
                      error={errors.name}
                    />
                  )}
                  <Field
                    icon={AtSign}
                    label="Username"
                    inputRef={usernameRef}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={20}
                    placeholder={isRegister ? '3–20 letters or numbers' : 'Your username'}
                    value={form.username}
                    onChange={set('username')}
                    error={errors.username}
                  />
                  <Field
                    icon={Lock}
                    label={isForgot ? 'New password' : 'Password'}
                    inputRef={passwordRef}
                    type={showPw ? 'text' : 'password'}
                    autoComplete={isRegister || isForgot ? 'new-password' : 'current-password'}
                    placeholder={isRegister || isForgot ? '8+ letters & numbers' : 'Enter your password'}
                    value={form.password}
                    onChange={set('password')}
                    error={errors.password}
                    right={eye}
                  />
                  {(isRegister || isForgot) && (
                    <Field
                      icon={Lock}
                      label="Confirm password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Type it again"
                      value={form.confirm}
                      onChange={set('confirm')}
                      error={errors.confirm}
                    />
                  )}

                  {mode === 'login' && (
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 text-sm">
                        <input type="checkbox" className="w-4 h-4 accent-[var(--ink-l)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                        Keep me signed in
                      </label>
                      <button type="button" className="text-xs font-semibold text-accent-ink" onClick={() => switchTo('forgot', form.username)}>
                        Forgot password?
                      </button>
                    </div>
                  )}
                  {isRegister && firstAccount && (
                    <label className="flex items-center gap-2.5 text-sm">
                      <input type="checkbox" className="w-4 h-4 accent-[var(--ink-l)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                      Keep me signed in
                    </label>
                  )}
                  {isRegister && firstAccount && legacyAvailable && (
                    <label className="flex items-start gap-2.5 text-sm rounded-2xl bg-accent/15 border border-accent-ink/25 p-3">
                      <input type="checkbox" className="w-4 h-4 mt-0.5 accent-[var(--ink-l)]" checked={importLegacy} onChange={(e) => setImportLegacy(e.target.checked)} />
                      <span>
                        <span className="font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Import tasks from the previous version</span>
                        <span className="block text-xs text-muted mt-0.5">Moves them into this account and encrypts them.</span>
                      </span>
                    </label>
                  )}

                  {isRegister && (
                    <p className="flex items-start gap-2 text-xs rounded-xl bg-sky-500/10 text-sky-800 px-3 py-2">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" />
                      {firstAccount
                        ? 'This is the first account on this phone, so it becomes the admin and can sign in right away.'
                        : "New accounts need an admin's approval before the first sign-in."}
                    </p>
                  )}
                  {isForgot && (
                    <p className="flex items-start gap-2 text-xs rounded-xl bg-amber-500/12 text-amber-800 px-3 py-2">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                      An admin of this phone must approve the new password. Your tasks are locked with the old password, so the account starts fresh.
                    </p>
                  )}

                  {errors.form && <FormNotice error={errors.form} username={normalizeUsername(form.username)} />}

                  <button type="submit" className="btn btn-primary w-full h-11" disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitLabel}
                  </button>
                </form>

                {isForgot && (
                  <button type="button" className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-muted" onClick={() => switchTo('login', form.username)}>
                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                  </button>
                )}

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-subtle">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Accounts and data stay on this phone.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
