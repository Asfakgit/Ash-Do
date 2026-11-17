import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lock, AtSign, Eye, EyeOff, ShieldCheck, Loader2, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { normalizeUsername, validatePassword, validateUsername } from '../../lib/db';
import { cn } from '../ui';
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

export function AuthScreen() {
  const { users, register, login, legacyAvailable } = useAuth();
  const [mode, setMode] = useState(users.length ? 'login' : 'register');
  // Most recently used account on this phone is pre-filled, so usually only the password is needed.
  const [form, setForm] = useState({ username: users[0]?.username || '', password: '' });
  const [remember, setRemember] = useState(true);
  const [importLegacy, setImportLegacy] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState('playing');
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const sceneRef = useRef(null);
  const slotRef = useRef(null);
  const cardRef = useRef(null);
  const geo = useBeam(sceneRef, slotRef, cardRef);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isRegister = mode === 'register';

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
      const u = validateUsername(form.username);
      if (u) errs.username = u;
      else if (users.some((x) => x.username === normalizeUsername(form.username))) errs.username = 'That username is already taken on this phone';
      const pw = validatePassword(form.password);
      if (pw) errs.password = pw;
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
      setForm((f) => ({ ...f, password: '' }));
      setBusy(false);
    }
  };

  const switchTo = (m) => {
    setMode(m);
    setErrors({});
    setShowPw(false);
    setForm({ username: m === 'login' ? users[0]?.username || '' : '', password: '' });
  };

  const eye = (
    <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-8 h-8" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((s) => !s)}>
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

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
            <div key={mode} className="text-center mb-4 anim-fade">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{isRegister ? 'Create account' : 'Welcome back'}</h1>
              <p className="text-sm text-muted mt-0.5">{isRegister ? 'Follow the light into Ash Do.' : 'Follow the light to your account.'}</p>
            </div>

            <form onSubmit={submit} className="space-y-3" noValidate>
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
                label="Password"
                inputRef={passwordRef}
                type={showPw ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? '8+ letters & numbers' : 'Enter your password'}
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                right={eye}
              />

              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-l)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Keep me signed in
              </label>
              {isRegister && legacyAvailable && (
                <label className="flex items-start gap-2.5 text-sm rounded-2xl bg-accent/15 border border-accent-ink/25 p-3">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-[var(--ink-l)]" checked={importLegacy} onChange={(e) => setImportLegacy(e.target.checked)} />
                  <span>
                    <span className="font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Import tasks from the previous version</span>
                    <span className="block text-xs text-muted mt-0.5">Moves them into this account and encrypts them.</span>
                  </span>
                </label>
              )}

              {errors.form && <p className="text-sm text-rose-600 rounded-xl bg-rose-500/10 px-3 py-2" role="alert">{errors.form}</p>}

              <button type="submit" className="btn btn-primary w-full h-11" disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRegister ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="mt-3 text-center text-sm text-muted">
              {isRegister ? (
                users.length > 0 && (
                  <button type="button" onClick={() => switchTo('login')}>
                    Already have an account? <span className="font-semibold text-accent-ink">Sign in</span>
                  </button>
                )
              ) : (
                <button type="button" onClick={() => switchTo('register')}>
                  New here? <span className="font-semibold text-accent-ink">Create an account</span>
                </button>
              )}
            </div>

            {isRegister && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-subtle">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Stays on this phone. No password reset.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
