// Offline natural-language task parser.
// "Finish project report tomorrow at 5 PM, high priority" ->
// { title: 'Finish project report', due_date: <tomorrow>, due_time: '17:00', priority: 'high', category: 'Work' }
import { toISODate, addDays, pad, nextOccurrence } from './tasks';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WD_RE = '(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|sday|urday)?';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';

const CATEGORY_HINTS = {
  work: ['report', 'meeting', 'project', 'client', 'email', 'presentation', 'deck', 'invoice', 'deploy', 'review', 'standup', 'office'],
  shopping: ['buy', 'grocery', 'groceries', 'shop', 'order', 'pick up', 'purchase'],
  health: ['gym', 'workout', 'doctor', 'run', 'meditate', 'dentist', 'medicine', 'walk', 'yoga', 'drink water'],
  learning: ['study', 'learn', 'course', 'homework', 'practice', 'lesson', 'read', 'revise', 'exam', 'tutorial'],
  personal: ['call', 'birthday', 'clean', 'laundry', 'family', 'mom', 'dad', 'friend'],
};

const dayFirstLocale = (() => {
  try {
    const parts = new Intl.DateTimeFormat().formatToParts(new Date(2026, 10, 20));
    return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month');
  } catch {
    return true;
  }
})();

const wdIndex = (s) => WEEKDAYS.findIndex((w) => w.startsWith(s.toLowerCase().slice(0, 3)));
const monthIndex = (s) => MONTHS.indexOf(s.toLowerCase().slice(0, 3));

export function parseQuickTask(input, categories = [], now = new Date()) {
  let text = ` ${input} `;
  const out = { title: '', due_date: '', due_time: '', priority: '', category: '', tags: [], is_recurring: false, recurring_type: '' };
  const take = (re, fn) => {
    const m = text.match(re);
    if (!m) return false;
    if (fn(m) === false) return false;
    text = text.replace(m[0], ' ');
    return true;
  };

  // ---- priority ----
  const prMap = { urgent: 'urgent', asap: 'urgent', critical: 'urgent', high: 'high', important: 'high', medium: 'medium', med: 'medium', normal: 'medium', low: 'low' };
  const _priorityFound = take(/[\s,]((urgent|high|medium|med|normal|low)\s+priority|priority\s*:?\s*(urgent|high|medium|med|normal|low))(?=[\s,.!]|$)/i, (m) => {
    out.priority = prMap[(m[2] || m[3]).toLowerCase()];
  }) ||
    take(/\s!(urgent|high|medium|low|[1-4])(?=[\s,.]|$)/i, (m) => {
      out.priority = /\d/.test(m[1]) ? ['urgent', 'high', 'medium', 'low'][Number(m[1]) - 1] : m[1].toLowerCase();
    }) ||
    take(/\s[pP]([1-4])(?=[\s,.]|$)/, (m) => {
      out.priority = ['urgent', 'high', 'medium', 'low'][Number(m[1]) - 1];
    }) ||
    take(/[\s,](urgent|asap|critical|important)(?=[\s,.!]|$)/i, (m) => {
      out.priority = prMap[m[1].toLowerCase()];
    });

  // ---- recurrence ----
  let recurWeekday = -1;
  const _recurFound = take(new RegExp(`\\s(every|each)\\s+(day|weekday|week|month|${WD_RE})(?=[\\s,.]|$)`, 'i'), (m) => {
    const w = m[2].toLowerCase();
    out.is_recurring = true;
    if (w === 'day') out.recurring_type = 'daily';
    else if (w === 'weekday') out.recurring_type = 'weekdays';
    else if (w === 'week') out.recurring_type = 'weekly';
    else if (w === 'month') out.recurring_type = 'monthly';
    else {
      out.recurring_type = 'weekly';
      recurWeekday = wdIndex(w);
    }
  }) ||
    take(/\s(daily|weekly|monthly)(?=[\s,.]|$)/i, (m) => {
      out.is_recurring = true;
      out.recurring_type = m[1].toLowerCase();
    });

  // ---- time ----
  const setTime = (h, m) => {
    out.due_time = `${pad(h)}:${pad(m)}`;
  };
  const _timeFound = take(/\s(?:at\s+|@\s*|by\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=[\s,.!]|$)/i, (m) => {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase().startsWith('p')) h += 12;
    if (Number(m[1]) > 12) return false;
    setTime(h, Number(m[2] || 0));
  }) ||
    take(/\s(?:at\s+|@\s*|by\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=[\s,.!]|$)/i, (m) => setTime(Number(m[1]), Number(m[2]))) ||
    take(/\s(?:at|by)\s+(\d{1,2})(?=[\s,.!]|$)/i, (m) => {
      const n = Number(m[1]);
      if (n < 1 || n > 12) return false;
      setTime(n <= 7 ? n + 12 : n, 0); // "at 5" usually means 5 PM
    }) ||
    take(/\s(?:at\s+)?(noon|midday|midnight)(?=[\s,.!]|$)/i, (m) => (/mid(night)/i.test(m[1]) ? setTime(23, 59) : setTime(12, 0)));

  // ---- date ----
  const setDate = (d) => {
    out.due_date = toISODate(d);
  };
  const pre = '(?:on\\s+|by\\s+|due\\s+|for\\s+)?';
  const dateFound =
    take(new RegExp(`\\s${pre}(day after tomorrow)(?=[\\s,.!]|$)`, 'i'), () => setDate(addDays(now, 2))) ||
    take(new RegExp(`\\s${pre}(today|tonight|this (morning|afternoon|evening))(?=[\\s,.!]|$)`, 'i'), (m) => {
      setDate(now);
      const w = m[1].toLowerCase();
      if (!out.due_time) {
        if (w === 'tonight' || w.endsWith('evening')) setTime(20, 0);
        else if (w.endsWith('afternoon')) setTime(14, 0);
        else if (w.endsWith('morning')) setTime(9, 0);
      }
    }) ||
    take(new RegExp(`\\s${pre}(tomorrow|tmrw|tmr|tomorow)(\\s+(morning|afternoon|evening|night))?(?=[\\s,.!]|$)`, 'i'), (m) => {
      setDate(addDays(now, 1));
      const part = (m[3] || '').toLowerCase();
      if (!out.due_time && part) setTime(part === 'morning' ? 9 : part === 'afternoon' ? 14 : 20, 0);
    }) ||
    take(new RegExp(`\\s${pre}in\\s+(\\d{1,3}|a|an|one|two|three)\\s+(day|days|week|weeks|month|months)(?=[\\s,.!]|$)`, 'i'), (m) => {
      const words = { a: 1, an: 1, one: 1, two: 2, three: 3 };
      const n = Number(m[1]) || words[m[1].toLowerCase()] || 1;
      const u = m[2].toLowerCase();
      if (u.startsWith('day')) setDate(addDays(now, n));
      else if (u.startsWith('week')) setDate(addDays(now, n * 7));
      else {
        const d = new Date(now);
        d.setMonth(d.getMonth() + n);
        setDate(d);
      }
    }) ||
    take(new RegExp(`\\s${pre}(next week)(?=[\\s,.!]|$)`, 'i'), () => setDate(addDays(now, 7))) ||
    take(new RegExp(`\\s${pre}(?:(this|next)\\s+)?${WD_RE}(?=[\\s,.!]|$)`, 'i'), (m) => {
      const target = wdIndex(m[2]);
      if (target < 0) return false;
      let diff = (target - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      setDate(addDays(now, diff));
    }) ||
    take(new RegExp(`\\s${pre}${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?=[\\s,.!]|$)`, 'i'), (m) => {
      const mi = monthIndex(m[1]);
      const d = new Date(Number(m[3]) || now.getFullYear(), mi, Number(m[2]));
      if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(d.getFullYear() + 1);
      setDate(d);
    }) ||
    take(new RegExp(`\\s${pre}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}(?:,?\\s+(\\d{4}))?(?=[\\s,.!]|$)`, 'i'), (m) => {
      const mi = monthIndex(m[2]);
      const d = new Date(Number(m[3]) || now.getFullYear(), mi, Number(m[1]));
      if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(d.getFullYear() + 1);
      setDate(d);
    }) ||
    take(/\s(?:on\s+|by\s+|due\s+)?(\d{4})-(\d{2})-(\d{2})(?=[\s,.!]|$)/, (m) => setDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))) ||
    take(/\s(?:on\s+|by\s+|due\s+)?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?(?=[\s,!]|$)/, (m) => {
      let [a, b] = [Number(m[1]), Number(m[2])];
      let day = dayFirstLocale ? a : b;
      let month = dayFirstLocale ? b : a;
      if (month > 12 && day <= 12) [day, month] = [month, day];
      if (month < 1 || month > 12 || day < 1 || day > 31) return false;
      let year = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : now.getFullYear();
      const d = new Date(year, month - 1, day);
      if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(year + 1);
      setDate(d);
    });

  if (!dateFound && recurWeekday >= 0) {
    let diff = (recurWeekday - now.getDay() + 7) % 7;
    setDate(addDays(now, diff));
  }
  if (!out.due_date && out.is_recurring) {
    setDate(now);
    // "Gym every weekday at 7am" typed at 10am starts with the next occurrence, not an overdue one
    const [h, mi] = (out.due_time || '23:59').split(':').map(Number);
    const at = new Date(now);
    at.setHours(h, mi, 0, 0);
    const wd = now.getDay();
    if (at <= now || (out.recurring_type === 'weekdays' && (wd === 0 || wd === 6))) {
      out.due_date = nextOccurrence({ due_date: out.due_date, recurring_type: out.recurring_type }, now);
    }
  }
  if (out.due_time && !out.due_date) {
    const t = new Date(now);
    const [h, m] = out.due_time.split(':').map(Number);
    t.setHours(h, m, 0, 0);
    setDate(t > now ? now : addDays(now, 1));
  }

  // ---- tags & categories (#tag, @category) ----
  const catNames = categories.map((c) => c.name);
  const findCat = (s) => catNames.find((n) => n.toLowerCase() === s.toLowerCase());
  let m;
  while ((m = text.match(/\s@([\p{L}\d_-]+)/u))) {
    out.category = findCat(m[1]) || m[1].charAt(0).toUpperCase() + m[1].slice(1);
    text = text.replace(m[0], ' ');
  }
  while ((m = text.match(/\s#([\p{L}\d_-]+)/u))) {
    const cat = findCat(m[1]);
    if (cat && !out.category) out.category = cat;
    else out.tags.push(m[1].toLowerCase());
    text = text.replace(m[0], ' ');
  }

  // ---- title cleanup ----
  let title = text
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([,.;])(?:\s*[,.;])+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  for (let i = 0; i < 4; i++) {
    title = title
      .replace(/[\s,.;:!-]+$/g, '')
      .replace(/^[\s,.;:-]+/g, '')
      .replace(/\s+(at|on|by|due|for|in|and|with|,)$/i, '')
      .trim();
  }
  out.title = title ? title.charAt(0).toUpperCase() + title.slice(1) : '';

  // ---- soft category inference (doesn't change the title) ----
  if (!out.category && out.title) {
    const lower = ` ${out.title.toLowerCase()} `;
    for (const [cat, words] of Object.entries(CATEGORY_HINTS)) {
      if (words.some((w) => lower.includes(` ${w}`))) {
        const name = findCat(cat);
        if (name) {
          out.category = name;
          out.categoryInferred = true;
        }
        break;
      }
    }
  }
  return out;
}

export const QUICK_ADD_EXAMPLES = [
  'Finish project report tomorrow at 5 PM, high priority',
  'Gym every weekday at 7am #fitness',
  'Buy groceries tonight @shopping',
  'Call mom on Sunday at 6pm',
  'Study chapter 4 in 3 days !urgent',
];
