// Diary entries live in the profile's encrypted 'journal' record, keyed by date:
//   { 'YYYY-MM-DD': { text, mood, updated_at } }
// Entries from the older "Daily reflection" card may also carry these four notes.
export const LEGACY_FIELDS = [
  { id: 'ideas', label: 'Ideas' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'moral', label: 'Moral' },
  { id: 'negatives', label: 'Negatives' },
];

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const hasEntry = (e) => Boolean(e && (str(e.text) || e.mood || LEGACY_FIELDS.some((f) => str(e[f.id]))));

export const countWords = (text) => (str(text) ? str(text).split(/\s+/).length : 0);

export const entryPreview = (e) => {
  const text = str(e?.text) || LEGACY_FIELDS.map((f) => str(e?.[f.id])).filter(Boolean).join(' · ');
  return text.split('\n')[0].slice(0, 90);
};

// "21:00" -> "9:00 PM" in the phone's locale
export const formatClock = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return '';
  return new Date(2000, 0, 1, h, m || 0).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// The moment today's (or a given day's) diary reminder is due.
export const diaryDueAt = (date, hhmm) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, m] = String(hhmm || '21:00').split(':').map(Number);
  return new Date(y, mo - 1, d, h || 0, m || 0, 0, 0).getTime();
};
