import React, { useMemo, useState } from 'react';
import { Flame, ChevronDown, ChevronRight, NotebookPen, PartyPopper, Sun } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import { isDone, isOverdue, isoToLocalDate, sortTasks, todayISO } from '../../lib/tasks';
import { countWords, entryPreview, hasEntry } from '../../lib/diary';
import { QuickAdd } from '../Tasks/QuickAdd';
import { TaskItem } from '../Tasks/TaskItem';
import { EmptyState, ProgressBar, cn } from '../ui';
import { MOODS } from '../Diary/moods';

const greeting = (h) => (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

function Section({ title, count, danger, children }) {
  return (
    <section>
      <p className={cn('px-1 mb-1.5 text-xs font-semibold uppercase tracking-wider', danger ? 'text-rose-500' : 'text-subtle')}>
        {title} <span className="font-medium opacity-70">{count}</span>
      </p>
      <div className="card p-1">{children}</div>
    </section>
  );
}

// Today's diary at a glance; opens the Diary page.
function DiaryCard() {
  const { dailyJournal } = useApp();
  const { navigate } = useUI();
  const mood = MOODS.find((m) => m.id === dailyJournal.mood);
  const written = hasEntry(dailyJournal);
  const words = countWords(dailyJournal.text);
  return (
    <button type="button" onClick={() => navigate('diary')} className="card w-full flex items-center gap-3 px-4 py-3.5 text-left">
      {mood ? <mood.icon className={cn('w-5 h-5 shrink-0', mood.cls)} /> : <NotebookPen className="w-5 h-5 shrink-0 text-subtle" />}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">Diary</span>
        <span className="block text-xs text-muted truncate">
          {written ? entryPreview(dailyJournal) || `${words} words` : 'How was your day? Write it down.'}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-subtle shrink-0" />
    </button>
  );
}

// Home screen: what's due today, nothing else.
export const DashboardView = () => {
  const { tasks, stats } = useTasks();
  const { settings } = useApp();
  const [showDone, setShowDone] = useState(false);
  const today = todayISO();
  const now = new Date();
  const name = settings.profile?.userName && settings.profile.userName !== 'User' ? settings.profile.userName.split(' ')[0] : '';

  const { overdue, open, done } = useMemo(() => {
    const live = tasks.filter((t) => !t.archived);
    return {
      overdue: sortTasks(live.filter((t) => isOverdue(t) && t.due_date < today), 'smart'),
      open: sortTasks(live.filter((t) => t.due_date === today && !isDone(t)), 'smart'),
      done: live.filter((t) => isDone(t) && (t.due_date === today || isoToLocalDate(t.completed_at) === today)),
    };
  }, [tasks, today]);

  const total = stats.questTasks.length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight mt-0.5">
          {greeting(now.getHours())}
          {name ? `, ${name}` : ''}
        </h1>
      </div>

      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{`${stats.questDone} of ${total} done`}</span>
            {stats.streak > 0 && (
              <span className="inline-flex items-center gap-1 font-medium">
                <Flame className="w-4 h-4 text-orange-500" /> {stats.streak} day{stats.streak === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <ProgressBar value={stats.questDone / total} className="mt-2 h-1.5" />
        </div>
      )}

      <QuickAdd defaults={{ due_date: today }} placeholder="Add a task for today…" />

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} danger>
          {overdue.map((t) => (
            <TaskItem key={t.task_id} task={t} />
          ))}
        </Section>
      )}

      {open.length > 0 ? (
        <Section title="Today" count={open.length}>
          {open.map((t) => (
            <TaskItem key={t.task_id} task={t} showDate={false} />
          ))}
        </Section>
      ) : (
        !overdue.length && (
          <EmptyState
            className="py-8"
            icon={done.length ? PartyPopper : Sun}
            title={done.length ? 'All done for today' : 'Nothing due today'}
            text={done.length ? 'Nice work. Enjoy the rest of your day.' : 'Add a task above or tap + below.'}
          />
        )
      )}

      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-1.5 px-1 mb-1.5 text-xs font-semibold uppercase tracking-wider text-subtle"
            aria-expanded={showDone}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', !showDone && '-rotate-90')} />
            Done <span className="font-medium opacity-70">{done.length}</span>
          </button>
          {showDone && (
            <div className="card p-1">
              {done.map((t) => (
                <TaskItem key={t.task_id} task={t} showDate={false} />
              ))}
            </div>
          )}
        </section>
      )}

      <DiaryCard />
    </div>
  );
};
