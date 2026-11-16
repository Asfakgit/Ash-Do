import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { addDays, parseISODate, relativeDayLabel, toISODate, todayISO } from '../../lib/tasks';
import { LEGACY_FIELDS, countWords, entryPreview, formatClock, hasEntry } from '../../lib/diary';
import { notificationPermission, requestNotificationPermission, isNative } from '../../lib/native';
import { Toggle, cn } from '../ui';
import { MOODS } from './moods';

// Daily reminder on/off + time. Used on the Diary page and in Settings.
export function DiaryReminderSettings() {
  const { settings, updateSettingsSection } = useApp();
  const { reminder, time } = settings.diary;
  const [perm, setPerm] = useState('granted');
  useEffect(() => {
    notificationPermission().then(setPerm);
  }, []);

  const toggle = async (v) => {
    updateSettingsSection('diary', 'reminder', v);
    if (v && perm === 'default') setPerm(await requestNotificationPermission());
  };

  return (
    <div>
      <Toggle
        label="Daily diary reminder"
        description={reminder ? `Rings every day at ${formatClock(time)} until you write` : 'An alarm each day to remind you to write'}
        checked={reminder}
        onChange={toggle}
      />
      {reminder && (
        <div className="flex items-center justify-between gap-3 py-3 border-t border-line">
          <label htmlFor="diary-time" className="text-sm font-medium">Reminder time</label>
          <input
            id="diary-time"
            type="time"
            className="field w-auto py-2"
            value={time}
            onChange={(e) => e.target.value && updateSettingsSection('diary', 'time', e.target.value)}
          />
        </div>
      )}
      {reminder && perm === 'denied' && (
        <p className="text-xs text-rose-500 pb-3">
          Notifications are blocked, so the reminder can only ring while Ash Do is open. Turn them on in{' '}
          {isNative ? 'Android Settings → Apps → Ash Do → Notifications' : "your browser's site settings"}.
        </p>
      )}
    </div>
  );
}

export function DiaryView() {
  const { journal, updateDiary } = useApp();
  const { params, navigate } = useUI();
  const today = todayISO();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date || '') && params.date <= today ? params.date : today;
  const entry = journal[date] || {};
  const go = (d) => navigate('diary', d === today ? undefined : { date: d });
  const shift = (n) => go(toISODate(addDays(parseISODate(date), n)));
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [date]);
  const words = countWords(entry.text);
  const legacy = LEGACY_FIELDS.filter((f) => typeof entry[f.id] === 'string' && entry[f.id].trim());
  const past = Object.entries(journal)
    .filter(([d, e]) => d !== date && d <= today && hasEntry(e))
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 60);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => shift(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-display font-semibold">{relativeDayLabel(date)}</p>
          <p className="text-xs text-muted">{parseISODate(date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button type="button" className="icon-btn disabled:opacity-30" aria-label="Next day" disabled={date >= today} onClick={() => shift(1)}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => {
          const on = entry.mood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => updateDiary(date, 'mood', on ? '' : m.id)}
              className={cn('flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium border transition-colors', on ? 'bg-surface border-line-strong text-fg' : 'border-transparent text-subtle')}
            >
              <m.icon className={cn('w-7 h-7', on ? m.cls : 'opacity-60')} strokeWidth={on ? 2.25 : 1.75} />
              {m.label}
            </button>
          );
        })}
      </div>

      <section className="card">
        <textarea
          value={entry.text || ''}
          onChange={(e) => updateDiary(date, 'text', e.target.value)}
          placeholder={date === today ? 'How was your day?' : 'Write about this day…'}
          aria-label="Diary entry"
          className="block w-full min-h-[260px] bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-subtle"
          style={{ fieldSizing: 'content' }}
        />
        <p className="px-4 pb-3 text-xs text-subtle">
          {words} {words === 1 ? 'word' : 'words'} · saved on this phone
        </p>
      </section>

      {legacy.length > 0 && (
        <section className="card p-4 space-y-3">
          <p className="label mb-0">Reflection notes</p>
          {legacy.map((f) => (
            <label key={f.id} className="block">
              <span className="text-xs font-medium text-muted">{f.label}</span>
              <textarea value={entry[f.id]} onChange={(e) => updateDiary(date, f.id, e.target.value)} rows={2} className="field resize-none mt-1" />
            </label>
          ))}
        </section>
      )}

      <section className="card px-4">
        <DiaryReminderSettings />
      </section>

      {past.length > 0 && (
        <section>
          <p className="px-1 mb-1.5 text-xs font-semibold uppercase tracking-wider text-subtle">
            Past entries <span className="font-medium opacity-70">{past.length}</span>
          </p>
          <div className="card p-1">
            {past.map(([d, e]) => {
              const mood = MOODS.find((m) => m.id === e.mood);
              return (
                <button key={d} type="button" onClick={() => go(d)} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:bg-surface-2">
                  {mood ? <mood.icon className={cn('w-5 h-5 shrink-0', mood.cls)} /> : <NotebookPen className="w-5 h-5 shrink-0 text-subtle" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{relativeDayLabel(d)}</span>
                    <span className="block text-xs text-muted truncate">{entryPreview(e) || mood?.label}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-subtle shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
