import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Plus, Trash2, Copy, Link2, ListChecks, Archive, Check, ExternalLink } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useUI } from '../../context/UIContext';
import { parseQuickTask } from '../../lib/quickParse';
import { PRIORITIES, RECURRENCE, REMINDERS, STATUSES, categoryColor, todayISO, uid } from '../../lib/tasks';
import { cn, Modal, Segmented } from '../ui';
import { ParsedChips } from './QuickAdd';

const blank = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  status: 'pending',
  due_date: '',
  due_time: '',
  reminder: '',
  is_recurring: false,
  recurring_type: '',
  tags: [],
  subtasks: [],
  attachments: [],
};

const isValidUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export function TaskEditor() {
  const { editor, closeEditor, toast } = useUI();
  if (!editor) return null;
  return <EditorDialog key={editor.task?.task_id || 'new'} editor={editor} onClose={closeEditor} toast={toast} />;
}

function EditorDialog({ editor, onClose, toast }) {
  const { addTask, updateTask, deleteTask, duplicateTask, archiveTask, categories, allTags } = useTasks();
  const existing = editor.task || null;
  const [form, setForm] = useState(() => ({ ...blank, ...(existing || editor.draft || {}) }));
  const [smart, setSmart] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [link, setLink] = useState({ name: '', url: '' });
  const [errors, setErrors] = useState({});
  const parsed = useMemo(() => parseQuickTask(smart, categories), [smart, categories]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Smart input fills the form as you type (new tasks only)
  useEffect(() => {
    if (!smart) return;
    setForm((f) => ({
      ...f,
      title: parsed.title,
      ...(parsed.due_date ? { due_date: parsed.due_date } : {}),
      ...(parsed.due_time ? { due_time: parsed.due_time } : {}),
      ...(parsed.priority ? { priority: parsed.priority } : {}),
      ...(parsed.category ? { category: parsed.category } : {}),
      ...(parsed.is_recurring ? { is_recurring: true, recurring_type: parsed.recurring_type } : {}),
      ...(parsed.tags.length ? { tags: [...new Set([...f.tags, ...parsed.tags])] } : {}),
    }));
  }, [parsed, smart]);

  const addTag = (raw) => {
    const t = raw.trim().replace(/^#/, '').toLowerCase().slice(0, 30);
    if (t && !form.tags.includes(t)) set({ tags: [...form.tags, t] });
    setTagInput('');
  };

  const addSubtask = () => {
    const title = subInput.trim();
    if (!title) return;
    set({ subtasks: [...form.subtasks, { id: uid(), title: title.slice(0, 140), done: false }] });
    setSubInput('');
  };

  const addLink = () => {
    const url = link.url.trim();
    if (!isValidUrl(url)) {
      setErrors((e) => ({ ...e, link: 'Enter a full link starting with https://' }));
      return;
    }
    let name = link.name.trim();
    if (!name) name = new URL(url).hostname.replace(/^www\./, '');
    set({ attachments: [...form.attachments, { id: uid(), name: name.slice(0, 80), url }] });
    setLink({ name: '', url: '' });
    setErrors((e) => ({ ...e, link: undefined }));
  };

  const save = (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Give your task a title';
    if (form.is_recurring && !form.recurring_type) errs.repeat = 'Pick how often it repeats';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data = { ...form, title: form.title.trim() };
    if (data.due_time && !data.due_date) data.due_date = todayISO();
    if (!data.due_date) data.reminder = '';
    if (pendingTag()) data.tags = [...new Set([...data.tags, pendingTag()])];
    if (subInput.trim()) data.subtasks = [...data.subtasks, { id: uid(), title: subInput.trim(), done: false }];
    if (existing) {
      updateTask(existing.task_id, data);
      toast({ title: 'Changes saved', tone: 'success' });
    } else {
      addTask(data);
      toast({ title: 'Task created', description: data.title, tone: 'success' });
    }
    onClose();
  };
  const pendingTag = () => tagInput.trim().replace(/^#/, '').toLowerCase();

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(e);
  };

  const tagSuggestions = allTags.filter((t) => !form.tags.includes(t) && (!tagInput || t.startsWith(tagInput.toLowerCase()))).slice(0, 6);

  return (
    <Modal open onClose={onClose} fullOnMobile labelledBy="task-editor-title">
      <form onSubmit={save} onKeyDown={onKeyDown} className="flex flex-col min-h-0 h-full">
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line safe-top">
          <h2 id="task-editor-title" className="font-display font-semibold text-lg">
            {existing ? 'Edit task' : 'New task'}
          </h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!existing && (
            <div>
              <div className="flex items-center gap-2 rounded-2xl bg-accent/10 border border-accent/30 px-3.5 py-2.5">
                <Sparkles className="w-4 h-4 text-accent-ink shrink-0" />
                <input
                  value={smart}
                  onChange={(e) => setSmart(e.target.value)}
                  placeholder="Describe it naturally — “Call dentist Friday 10am #health”"
                  aria-label="Smart input"
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-subtle"
                />
              </div>
              {smart && <ParsedChips parsed={parsed} className="mt-2" />}
            </div>
          )}

          <div>
            <input
              data-autofocus={existing ? true : undefined}
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Task title"
              maxLength={200}
              aria-label="Title"
              aria-invalid={Boolean(errors.title)}
              className="w-full bg-transparent font-display text-xl font-semibold placeholder:text-subtle focus:outline-none"
            />
            {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Add details, notes or context…"
              rows={3}
              maxLength={5000}
              aria-label="Description"
              className="field mt-3 resize-y min-h-[76px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="te-date">Due date</label>
              <input id="te-date" type="date" className="field" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="te-time">Time</label>
              <input id="te-time" type="time" className="field" value={form.due_time} onChange={(e) => set({ due_time: e.target.value })} />
            </div>
          </div>

          <div>
            <span className="label">Priority</span>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ priority: p.id })}
                  aria-pressed={form.priority === p.id}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold transition-all',
                    form.priority === p.id ? cn(p.soft, p.text, 'border-current') : 'border-line text-muted hover:bg-surface-2'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', p.dot)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {existing && (
            <div>
              <span className="label">Status</span>
              <Segmented className="w-full" options={STATUSES} value={form.status} onChange={(status) => set({ status })} />
            </div>
          )}

          <div>
            <span className="label">Category</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = form.category.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set({ category: active ? '' : c.name })}
                    className={cn('chip py-1 px-3 transition-all', active && 'text-fg border-current')}
                    style={active ? { color: c.color, background: `color-mix(in oklab, ${c.color} 14%, transparent)` } : undefined}
                  >
                    <span className="w-2 h-2 rounded-[3px]" style={{ background: c.color }} />
                    <span className={active ? 'text-fg' : ''}>{c.name}</span>
                  </button>
                );
              })}
              {form.category && !categories.some((c) => c.name.toLowerCase() === form.category.toLowerCase()) && (
                <span className="chip py-1 px-3 text-fg">
                  <span className="w-2 h-2 rounded-[3px]" style={{ background: categoryColor(form.category, categories) }} />
                  {form.category}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="label" htmlFor="te-reminder">Reminder</label>
              <select
                id="te-reminder"
                className="field"
                value={form.reminder}
                onChange={(e) => set({ reminder: e.target.value })}
                disabled={!form.due_date}
              >
                {REMINDERS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              {!form.due_date && <p className="text-xs text-subtle mt-1">Set a due date to add a reminder</p>}
            </div>
            <div>
              <label className="label" htmlFor="te-repeat">Repeat</label>
              <select
                id="te-repeat"
                className="field"
                value={form.is_recurring ? form.recurring_type : ''}
                onChange={(e) => set({ is_recurring: Boolean(e.target.value), recurring_type: e.target.value })}
              >
                <option value="">Does not repeat</option>
                {RECURRENCE.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              {errors.repeat && <p className="text-xs text-rose-500 mt-1">{errors.repeat}</p>}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="te-tags">Tags</label>
            <div className="field flex flex-wrap items-center gap-1.5 py-2">
              {form.tags.map((t) => (
                <span key={t} className="chip text-accent-ink">
                  #{t}
                  <button type="button" aria-label={`Remove tag ${t}`} onClick={() => set({ tags: form.tags.filter((x) => x !== t) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                id="te-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && form.tags.length) {
                    set({ tags: form.tags.slice(0, -1) });
                  }
                }}
                placeholder={form.tags.length ? '' : 'Type and press Enter'}
                className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none"
              />
            </div>
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagSuggestions.map((t) => (
                  <button key={t} type="button" className="chip hover:text-fg" onClick={() => addTag(t)}>
                    + #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="label flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Subtasks
              {form.subtasks.length > 0 && <span className="normal-case tracking-normal">· {form.subtasks.filter((s) => s.done).length}/{form.subtasks.length}</span>}
            </span>
            <div className="space-y-1">
              {form.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2 group">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={s.title}
                    onClick={() => set({ subtasks: form.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
                    className={cn('grid place-items-center w-[18px] h-[18px] rounded-md border-2 shrink-0', s.done ? 'bg-accent border-accent text-on-accent' : 'border-line-strong')}
                  >
                    {s.done && <Check className="w-3 h-3" strokeWidth={3} />}
                  </button>
                  <input
                    value={s.title}
                    onChange={(e) => set({ subtasks: form.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })}
                    aria-label="Subtask title"
                    className={cn('flex-1 bg-transparent text-sm focus:outline-none', s.done && 'line-through text-muted')}
                  />
                  <button
                    type="button"
                    aria-label="Remove subtask"
                    className="icon-btn w-7 h-7"
                    onClick={() => set({ subtasks: form.subtasks.filter((x) => x.id !== s.id) })}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 px-2">
                <Plus className="w-4 h-4 text-subtle" />
                <input
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="Add a subtask"
                  aria-label="New subtask"
                  className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none placeholder:text-subtle"
                />
              </div>
            </div>
          </div>

          <div>
            <span className="label flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Links & attachments
            </span>
            {form.attachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {form.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <Link2 className="w-3.5 h-3.5 text-subtle shrink-0" />
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline text-accent-ink">
                      {a.name}
                    </a>
                    <ExternalLink className="w-3.5 h-3.5 text-subtle" />
                    <button type="button" aria-label={`Remove ${a.name}`} className="icon-btn w-7 h-7" onClick={() => set({ attachments: form.attachments.filter((x) => x.id !== a.id) })}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                value={link.url}
                onChange={(e) => setLink({ ...link, url: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="https://drive.google.com/…"
                aria-label="Attachment link"
                className="field flex-[2]"
              />
              <input value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder="Label (optional)" aria-label="Attachment label" className="field flex-1" />
              <button type="button" className="btn btn-ghost" onClick={addLink} disabled={!link.url.trim()}>
                Attach
              </button>
            </div>
            {errors.link ? (
              <p className="text-xs text-rose-500 mt-1">{errors.link}</p>
            ) : (
              <p className="text-xs text-subtle mt-1">Link docs, Drive files, images or any web page.</p>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-2 px-5 py-3 border-t border-line safe-bottom">
          {existing && (
            <>
              <button
                type="button"
                className="icon-btn text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                aria-label="Delete task"
                title="Delete"
                onClick={() => {
                  deleteTask(existing.task_id);
                  onClose();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Duplicate task"
                title="Duplicate"
                onClick={() => {
                  duplicateTask(existing.task_id);
                  onClose();
                }}
              >
                <Copy className="w-4 h-4" />
              </button>
              {!existing.archived && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Archive task"
                  title="Archive"
                  onClick={() => {
                    archiveTask(existing.task_id, true);
                    onClose();
                  }}
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <span className="flex-1" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {existing ? 'Save' : 'Create task'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
