import { useEffect, useRef } from 'react';
import { NotebookPen, AlarmClock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { usePersistentState } from '../../context/AuthContext';
import { addDays, toISODate, todayISO } from '../../lib/tasks';
import { diaryDueAt, hasEntry } from '../../lib/diary';
import { diaryNotificationId, dismissDelivered, isNative, notifyNow, onNotificationTap, syncDiaryReminders } from '../../lib/native';
import { useAlarm } from '../AlarmManager';

const MISSED_WINDOW = 6 * 3600 * 1000;
const LOUD_WINDOW = 2 * 60 * 1000;
const TITLE = 'Time to write your diary';
const BODY = 'How was your day? Take two minutes to write it down.';

// Daily "write your diary" alarm at the time chosen on the Diary page (settings.diary).
// Skips any day that already has an entry.
export function DiaryReminder() {
  const { settings, journal } = useApp();
  const { route, navigate } = useUI();
  const { ring } = useAlarm();
  const { reminder: on, time } = settings.diary;
  const snoozeMin = Number(settings.alarm?.snooze) || 10;
  // shown = "<date>@<due ms>" of the last alarm shown; snooze = when to ring again today
  const [shown, setShown] = usePersistentState('diaryReminderShown', '', (v) => (typeof v === 'string' ? v : ''));
  const [snooze, setSnooze] = usePersistentState('diarySnooze', 0, (v) => Number(v) || 0);
  const journalRef = useRef(journal);
  journalRef.current = journal;
  const routeRef = useRef(route);
  routeRef.current = route;

  // Changing the time (or turning it on) shouldn't instantly fire for a time that already passed today.
  const armedAt = useRef(0);
  const prev = useRef({ on, time });
  if (prev.current.on !== on || prev.current.time !== time) {
    prev.current = { on, time };
    armedAt.current = Date.now();
  }

  const dueToday = (date) => (snooze && toISODate(new Date(snooze)) === date ? snooze : diaryDueAt(date, time));
  const writtenToday = hasEntry(journal[todayISO()]);

  // Android: schedule the next 7 days so reminders still come if the app isn't opened.
  useEffect(() => {
    if (!on) return void syncDiaryReminders([]);
    const now = Date.now();
    const list = [];
    for (let i = 0; i < 7; i++) {
      const date = toISODate(addDays(new Date(), i));
      if (i === 0 && writtenToday) continue;
      const at = i === 0 ? dueToday(date) : diaryDueAt(date, time);
      if (at <= now + 5000 || (i === 0 && shown === `${date}@${at}`)) continue;
      list.push({ date, at, title: TITLE, body: BODY });
    }
    syncDiaryReminders(list);
  }, [on, time, snooze, shown, writtenToday]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let off = () => {};
    onNotificationTap((extra) => {
      if (extra.kind !== 'diary') return;
      setShown(`${extra.date}@${dueToday(extra.date)}`);
      navigate('diary', { date: extra.date });
    }).then((fn) => (off = fn));
    return () => off();
  }, [navigate, setShown, time, snooze]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!on) return;
    let timer;
    const check = () => {
      const now = Date.now();
      const date = todayISO();
      const at = dueToday(date);
      const tag = `${date}@${at}`;
      clearTimeout(timer);
      if (hasEntry(journalRef.current[date]) || shown === tag) return;
      if (at > now) {
        if (at - now < 3600000) timer = setTimeout(check, at - now + 50);
        return;
      }
      if (now - at > MISSED_WINDOW || at < armedAt.current) return;
      setShown(tag);
      if (routeRef.current === 'diary') return; // already writing
      const loud = now - at < LOUD_WINDOW;
      dismissDelivered(diaryNotificationId(date));
      ring({
        id: `diary|${tag}`,
        kind: 'diary',
        title: TITLE,
        body: BODY,
        loud,
        actions: [
          { label: 'Write now', icon: NotebookPen, primary: true, onClick: () => navigate('diary', { date }) },
          { label: `Snooze ${snoozeMin} min`, icon: AlarmClock, onClick: () => setSnooze(Date.now() + snoozeMin * 60000) },
        ],
      });
      if (!isNative) notifyNow(TITLE, BODY);
    };
    check();
    const i = setInterval(check, 30000);
    return () => {
      clearInterval(i);
      clearTimeout(timer);
    };
  }, [on, time, snooze, shown, snoozeMin, ring, navigate, setShown, setSnooze]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
