import React, { useState } from 'react';
import {
  MoreHorizontal, Pencil, Copy, Trash2, Archive, ArchiveRestore, Timer, Repeat, Bell, Paperclip, ListChecks, CircleDot, Clock,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useUI } from '../../context/UIContext';
import { useFocus } from '../../context/FocusContext';
import { useApp } from '../../context/AppContext';
import { categoryColor, formatDue, isDone, isOverdue, PRIORITY_MAP } from '../../lib/tasks';
import { cn, Menu, TaskCheck } from '../ui';

export function TaskItem({ task, showDate = true, draggable = false, compact: compactProp }) {
  const { toggleComplete, deleteTask, duplicateTask, archiveTask, updateTask, categories } = useTasks();
  const { openEditor, navigate } = useUI();
  const { setTaskId } = useFocus();
  const { settings } = useApp();
  const [leaving, setLeaving] = useState(false);
  const done = isDone(task);
  const overdue = isOverdue(task);
  const compact = compactProp ?? settings.taskDisplay?.density === 'compact';
  const subDone = task.subtasks.filter((s) => s.done).length;

  const onToggle = () => {
    if (done) return toggleComplete(task.task_id);
    setLeaving(true);
    setTimeout(() => toggleComplete(task.task_id), 380);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task.task_id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => openEditor({ task })}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter') openEditor({ task });
        if (e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        'group relative flex items-start gap-3 rounded-2xl px-3 transition-all duration-300 hover:bg-surface-2 focus-visible:bg-surface-2 cursor-pointer',
        compact ? 'py-2' : 'py-3',
        leaving && 'opacity-50 translate-x-1',
        done && !leaving && 'opacity-60'
      )}
    >
      <div className={compact ? 'pt-0' : 'pt-0.5'}>
        <TaskCheck checked={done || leaving} onToggle={onToggle} priority={task.priority} label={`Complete ${task.title}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className={cn('text-sm font-medium truncate', done || leaving ? 'task-done-title text-muted' : 'task-open-title')}>{task.title}</p>
          {task.status === 'in_progress' && !done && (
            <span className="chip border-transparent bg-cyan-400/15 text-cyan-700 dark:text-cyan-300 py-0">
              <CircleDot className="w-3 h-3" /> In progress
            </span>
          )}
        </div>
        {!compact && task.description && <p className="text-xs text-muted truncate mt-0.5">{task.description}</p>}
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted', compact ? 'mt-0.5' : 'mt-1.5')}>
          {showDate && task.due_date && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-rose-500 font-medium')}>
              <Clock className="w-3 h-3" />
              {overdue ? 'Overdue · ' : ''}
              {formatDue(task)}
            </span>
          )}
          {!showDate && task.due_time && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-rose-500 font-medium')}>
              <Clock className="w-3 h-3" />
              {formatDue(task).split(', ')[1]}
            </span>
          )}
          {task.priority !== 'medium' && (
            <span className={cn('inline-flex items-center gap-1 font-medium', PRIORITY_MAP[task.priority].text)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_MAP[task.priority].dot)} />
              {PRIORITY_MAP[task.priority].label}
            </span>
          )}
          {task.category && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: categoryColor(task.category, categories) }} />
              {task.category}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="w-3 h-3" /> {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.is_recurring && <Repeat className="w-3 h-3" aria-label="Repeats" />}
          {task.reminder !== '' && task.due_time && !done && <Bell className="w-3 h-3" aria-label="Reminder set" />}
          {task.attachments.length > 0 && <Paperclip className="w-3 h-3" aria-label="Has attachments" />}
          {!compact && task.tags.map((t) => (
            <span key={t} className="text-accent-ink">#{t}</span>
          ))}
        </div>
      </div>
      <Menu
        trigger={({ toggle, open }) => (
          <button
            type="button"
            aria-label="Task actions"
            onClick={toggle}
            className={cn('icon-btn -mr-1 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100', open && 'md:opacity-100 bg-surface-3')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
        items={[
          { label: 'Edit', icon: Pencil, onClick: () => openEditor({ task }) },
          !done && {
            label: task.status === 'in_progress' ? 'Mark as to do' : 'Mark in progress',
            icon: CircleDot,
            onClick: () => updateTask(task.task_id, { status: task.status === 'in_progress' ? 'pending' : 'in_progress' }),
          },
          !done && {
            label: 'Start focus',
            icon: Timer,
            onClick: () => {
              setTaskId(task.task_id);
              navigate('focus');
            },
          },
          { label: 'Duplicate', icon: Copy, onClick: () => duplicateTask(task.task_id) },
          task.archived
            ? { label: 'Unarchive', icon: ArchiveRestore, onClick: () => archiveTask(task.task_id, false) }
            : { label: 'Archive', icon: Archive, onClick: () => archiveTask(task.task_id, true) },
          'divider',
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteTask(task.task_id) },
        ]}
      />
    </div>
  );
}
