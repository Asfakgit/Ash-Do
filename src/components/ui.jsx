import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Check, X, Trophy, CheckCircle2, Info } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { PRIORITY_MAP } from '../lib/tasks';
import { pushBackHandler } from '../lib/native';

export const cn = (...args) => twMerge(clsx(args));

export const Card = ({ className, children, as: Tag = 'section', ...rest }) => (
  <Tag className={cn('card p-5', className)} {...rest}>
    {children}
  </Tag>
);

export const CardHeader = ({ icon: Icon, title, subtitle, action, className }) => (
  <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <span className="grid place-items-center w-8 h-8 rounded-xl bg-accent/15 text-accent-ink shrink-0">
          <Icon className="w-4 h-4" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-[15px] leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

export function ProgressRing({ value = 0, size = 120, stroke = 10, className, trackClass = 'stroke-surface-3', color = 'var(--accent)', children }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          style={{ stroke: color }}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          className="ring-track"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export const ProgressBar = ({ value = 0, className, barClass = 'bg-accent' }) => (
  <div className={cn('h-2 rounded-full bg-surface-3 overflow-hidden', className)}>
    <div
      className={cn('h-full rounded-full transition-[width] duration-700 ease-out', barClass)}
      style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
    />
  </div>
);

export const PriorityBadge = ({ priority, compact }) => {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
  return (
    <span className={cn('chip border-transparent', p.soft, p.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
      {!compact && p.label}
    </span>
  );
};

export const TaskCheck = ({ checked, onToggle, priority, size = 'md', label }) => {
  const [pop, setPop] = useState(false);
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-[22px] h-[22px]';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label || (checked ? 'Mark as not done' : 'Mark as done')}
      onClick={(e) => {
        e.stopPropagation();
        setPop(true);
        onToggle?.();
      }}
      onAnimationEnd={() => setPop(false)}
      className={cn(
        'grid place-items-center rounded-full border-2 shrink-0 transition-colors',
        dim,
        pop && 'anim-check',
        checked ? 'bg-accent border-accent text-on-accent' : 'border-line-strong hover:border-accent-ink'
      )}
      style={!checked && (priority === 'urgent' || priority === 'high') ? { borderColor: priority === 'urgent' ? '#f43f5e' : '#f59e0b' } : undefined}
      title={p.label + ' priority'}
    >
      {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </button>
  );
};

export const EmptyState = ({ icon: Icon, title, text, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center text-center py-10 px-6', className)}>
    <div className="relative mb-4">
      <div className="absolute inset-0 rounded-3xl bg-accent/25 blur-xl" />
      <div className="relative grid place-items-center w-14 h-14 rounded-2xl bg-surface-2 border border-line">
        {Icon && <Icon className="w-6 h-6 text-accent-ink" />}
      </div>
    </div>
    <p className="font-display font-semibold">{title}</p>
    {text && <p className="text-sm text-muted mt-1 max-w-xs">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton = ({ className }) => <div className={cn('skeleton h-4', className)} />;

export const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <label className={cn('flex items-center justify-between gap-4 py-3', disabled && 'opacity-50')}>
    <span className="min-w-0">
      <span className="block text-sm font-medium">{label}</span>
      {description && <span className="block text-xs text-muted mt-0.5">{description}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', checked ? 'bg-accent' : 'bg-surface-3')}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform',
          checked ? 'translate-x-5 bg-on-accent' : 'bg-white dark:bg-zinc-400'
        )}
      />
    </button>
  </label>
);

export const Segmented = ({ options, value, onChange, className, size = 'md' }) => (
  <div className={cn('inline-flex p-1 rounded-2xl bg-surface-2 border border-line gap-1', className)} role="radiogroup">
    {options.map((o) => {
      const active = o.id === value;
      const Icon = o.icon;
      return (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all whitespace-nowrap',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            active ? 'bg-surface text-fg shadow-sm border border-line' : 'text-muted hover:text-fg border border-transparent'
          )}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {o.label}
        </button>
      );
    })}
  </div>
);

export function Modal({ open, onClose, children, className, labelledBy, fullOnMobile = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const popBack = pushBackHandler(() => onClose?.());
    const t = setTimeout(() => {
      const el = ref.current?.querySelector('[data-autofocus]') || ref.current?.querySelector('input, textarea, button');
      el?.focus();
    }, 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      popBack();
      clearTimeout(t);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          'relative w-full bg-surface border border-line shadow-[var(--shadow-lg)] flex flex-col max-h-[100dvh] sm:max-h-[90dvh]',
          fullOnMobile ? 'h-[100dvh] sm:h-auto rounded-none sm:rounded-3xl' : 'rounded-t-3xl sm:rounded-3xl max-h-[92dvh]',
          'modal-anim',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Menu({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    const popBack = pushBackHandler(() => setOpen(false));
    return () => {
      popBack();
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-1 min-w-[190px] p-1.5 rounded-2xl bg-surface border border-line shadow-[var(--shadow-lg)] anim-pop',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.filter(Boolean).map((it, i) =>
            it === 'divider' ? (
              <div key={i} className="h-px bg-line my-1" />
            ) : (
              <button
                key={it.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-colors hover:bg-surface-2',
                  it.danger ? 'text-rose-500' : 'text-fg'
                )}
              >
                {it.icon && <it.icon className="w-4 h-4 opacity-80" />}
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function Toaster() {
  const { toasts, dismissToast } = useUI();
  const icons = { success: CheckCircle2, reward: Trophy, default: Info, error: Info };
  return (
    <div className="fixed z-[90] top-[calc(env(safe-area-inset-top)+4rem)] md:top-auto md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 w-[calc(100%-2rem)] max-w-sm space-y-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.tone] || Info;
        return (
          <div key={t.id} className="pointer-events-auto anim-toast card rounded-2xl px-4 py-3 flex items-start gap-3 shadow-[var(--shadow-lg)]">
            <span
              className={cn(
                'grid place-items-center w-8 h-8 rounded-xl shrink-0',
                t.tone === 'reward' ? 'bg-accent text-on-accent' : t.tone === 'error' ? 'bg-rose-500/15 text-rose-500' : 'bg-accent/15 text-accent-ink'
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{t.description}</p>}
            </div>
            {t.action && (
              <button
                type="button"
                className="text-sm font-semibold text-accent-ink px-2 py-1 rounded-lg hover:bg-surface-2"
                onClick={() => {
                  t.action.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="text-subtle hover:text-fg p-1" onClick={() => dismissToast(t.id)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Lightweight canvas confetti (~1.4s, no dependency). Skipped for reduced motion.
export function Confetti() {
  const { celebration } = useUI();
  const ref = useRef(null);
  useEffect(() => {
    if (!celebration) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C2F23D';
    const colors = [accent, '#8B5CF6', '#22D3EE', '#5B8CFF', '#F5A524', '#F472B6'];
    const parts = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 18 * dpr,
      vy: (-Math.random() * 16 - 6) * dpr,
      s: (Math.random() * 6 + 4) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const start = performance.now();
    let raf;
    const frame = (t) => {
      const p = (t - start) / 1400;
      ctx.clearRect(0, 0, w, h);
      for (const q of parts) {
        q.vy += 0.55 * dpr;
        q.vx *= 0.985;
        q.x += q.vx;
        q.y += q.vy;
        q.r += q.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.r);
        ctx.fillStyle = q.c;
        ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2);
        ctx.restore();
      }
      if (p < 1) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [celebration]);
  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none z-[95]" aria-hidden="true" />;
}

export const Avatar = ({ src, name, size = 36, className }) => {
  const initials = (name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return src ? (
    <img src={src} alt="" className={cn('rounded-xl object-cover shrink-0', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn('grid place-items-center rounded-xl shrink-0 font-display font-semibold bg-gradient-to-br from-violet-500 to-cyan-400 text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
};
