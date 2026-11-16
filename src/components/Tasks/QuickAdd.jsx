import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, CornerDownLeft, Calendar, Flag, Repeat, Tag, Folder, SlidersHorizontal } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useUI } from '../../context/UIContext';
import { parseQuickTask, QUICK_ADD_EXAMPLES } from '../../lib/quickParse';
import { formatDue, PRIORITY_MAP, RECURRENCE_LABEL } from '../../lib/tasks';
import { cn } from '../ui';

// Parsed preview chips; shared with the task editor's smart input.
export function ParsedChips({ parsed, className }) {
  const chips = [];
  if (parsed.due_date) chips.push({ icon: Calendar, label: formatDue(parsed) });
  if (parsed.priority) chips.push({ icon: Flag, label: PRIORITY_MAP[parsed.priority].label, cls: PRIORITY_MAP[parsed.priority].text });
  if (parsed.is_recurring) chips.push({ icon: Repeat, label: RECURRENCE_LABEL[parsed.recurring_type] });
  if (parsed.category) chips.push({ icon: Folder, label: parsed.category + (parsed.categoryInferred ? ' (guessed)' : '') });
  parsed.tags.forEach((t) => chips.push({ icon: Tag, label: '#' + t }));
  if (!chips.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {chips.map((c) => (
        <span key={c.label} className={cn('chip anim-pop', c.cls)}>
          <c.icon className="w-3 h-3" /> {c.label}
        </span>
      ))}
    </div>
  );
}

export function QuickAdd({ defaults = {}, autoFocus = false, className, placeholder }) {
  const { addTask, categories } = useTasks();
  const { toast, openEditor } = useUI();
  const [value, setValue] = useState('');
  const [example, setExample] = useState(0);
  const parsed = useMemo(() => parseQuickTask(value, categories), [value, categories]);

  useEffect(() => {
    if (value) return;
    const i = setInterval(() => setExample((e) => (e + 1) % QUICK_ADD_EXAMPLES.length), 4000);
    return () => clearInterval(i);
  }, [value]);

  const fields = () => {
    const f = { ...defaults };
    for (const k of ['title', 'due_date', 'due_time', 'priority', 'category', 'is_recurring', 'recurring_type']) {
      if (parsed[k]) f[k] = parsed[k];
    }
    if (parsed.tags.length) f.tags = parsed.tags;
    return f;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!parsed.title) return;
    const task = addTask(fields());
    setValue('');
    toast({
      title: 'Task added',
      description: task.due_date ? `${task.title} · ${formatDue(task)}` : task.title,
      tone: 'success',
      action: { label: 'Edit', onClick: () => openEditor({ task }) },
    });
  };

  return (
    <form onSubmit={submit} className={cn('group', className)}>
      <div className="flex items-center gap-2 rounded-2xl bg-surface-2 border border-line pl-3.5 pr-1.5 py-1.5 transition-all focus-within:border-accent-ink/60 focus-within:bg-surface focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_18%,transparent)]">
        <Sparkles className="w-4 h-4 text-accent-ink shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus={autoFocus}
          maxLength={300}
          aria-label="Quick add task"
          placeholder={placeholder || `Try “${QUICK_ADD_EXAMPLES[example]}”`}
          className="flex-1 min-w-0 bg-transparent py-1.5 text-sm placeholder:text-subtle focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            openEditor({ draft: fields() });
            setValue('');
          }}
          className="icon-btn"
          aria-label="Add with details"
          title="Add with details"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button type="submit" disabled={!parsed.title} className="btn btn-primary px-3 py-2" aria-label="Add task">
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
      {value && <ParsedChips parsed={parsed} className="mt-2 px-1" />}
    </form>
  );
}
