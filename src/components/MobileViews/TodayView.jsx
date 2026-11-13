import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Plus, Sparkles, Compass, X, Pencil, Trash2 } from 'lucide-react';

export const TodayView = () => {
  const { routineItems, toggleRoutineItem, addRoutineItem, editRoutineItem, deleteRoutineItem, prayerLogs, dailyJournal, updateJournalField, prayerSchedule } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitText, setNewHabitText] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  
  const [nextPrayer, setNextPrayer] = useState(null);
  const [remainingTime, setRemainingTime] = useState('');

  const completedRoutine = routineItems.filter((i) => i.completed).length;
  const routinePct = Math.round((completedRoutine / routineItems.length) * 100) || 0;

  const loggablePrayers = prayerSchedule.filter(p => !p.isViewOnly);
  const completedPrayers = loggablePrayers.filter(p => prayerLogs[p.id]?.status === 'completed').length;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    return now;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let next = null;
      let minDiff = Infinity;
      
      const sorted = [...prayerSchedule].sort((a, b) => parseTime(a.time) - parseTime(b.time));
      
      for (const p of sorted) {
        const pTime = parseTime(p.time);
        if (pTime > now) {
          const diff = pTime - now;
          if (diff < minDiff) {
            minDiff = diff;
            next = p;
          }
        }
      }
      
      if (!next && sorted.length > 0) {
        next = sorted[0];
        const pTime = parseTime(next.time);
        pTime.setDate(pTime.getDate() + 1);
        minDiff = pTime - now;
      }
      
      setNextPrayer(next);
      
      if (minDiff !== Infinity) {
        const hrs = Math.floor(minDiff / (1000 * 60 * 60));
        const mins = Math.floor((minDiff % (1000 * 60 * 60)) / (1000 * 60));
        setRemainingTime(`${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [prayerSchedule]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;
    
    if (editingHabitId) {
      editRoutineItem(editingHabitId, newHabitText.trim());
    } else {
      addRoutineItem({ text: newHabitText.trim(), period: 'Morning', category: 'Growth' });
    }
    
    setNewHabitText('');
    setEditingHabitId(null);
    setShowAddModal(false);
  };

  const openEditModal = (item) => {
    setEditingHabitId(item.id);
    setNewHabitText(item.text);
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header Greeting */}
      <div className="sticky top-0 z-10 bg-[var(--bg-main)] flex items-center justify-between pt-2 pb-2">
        <div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {formattedDate}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ios-text-primaryLight dark:text-ios-text-primaryDark">
            Today
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingHabitId(null);
            setNewHabitText('');
            setShowAddModal(true);
          }}
          className="p-2 rounded-full bg-emerald-500 text-white shadow-sm active-haptic"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Cards Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="ios-grouped-container p-3 text-center">
          <span className="text-[10px] text-ios-text-secondaryLight dark:text-ios-text-secondaryDark uppercase font-semibold">
            Habits
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {routinePct}%
          </p>
          <p className="text-[9px] text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
            {completedRoutine}/{routineItems.length} done
          </p>
        </div>

        <div className="ios-grouped-container p-3 text-center">
          <span className="text-[10px] text-ios-text-secondaryLight dark:text-ios-text-secondaryDark uppercase font-semibold">
            Prayers
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {completedPrayers}/5
          </p>
          <p className="text-[9px] text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
            On Time
          </p>
        </div>
      </div>

      {/* Next Prayer Pill */}
      <div className="ios-grouped-container p-4 bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-between shadow-lg shadow-emerald-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-full backdrop-blur-md">
            <Compass className="w-6 h-6 text-emerald-50 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">Next {nextPrayer?.isViewOnly ? 'Event' : 'Prayer'}: {nextPrayer?.name || '...'}</p>
            <p className="text-xs text-emerald-100 font-medium">{nextPrayer?.time || '...'} • {remainingTime} remaining</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold backdrop-blur-md border border-white/10">
            Qibla 18° NNE
          </span>
        </div>
      </div>

      {/* Routine Checklist Group */}
      <div className="space-y-1.5">
        <div className="px-1 text-xs font-semibold uppercase tracking-wider text-ios-text-secondaryLight dark:text-ios-text-secondaryDark flex items-center justify-between">
          <span>Daily Habits</span>
          <span>Tap to check</span>
        </div>

        <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
          {routineItems.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 opacity-80">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                No habits yet
              </p>
              <p className="text-xs text-ios-text-secondaryLight dark:text-ios-text-secondaryDark max-w-[200px]">
                Tap the + button above to create your first daily habit.
              </p>
            </div>
          ) : (
            routineItems.map((item) => (
              <div
                key={item.id}
                className="ios-grouped-item flex items-center justify-between group"
              >
                <div 
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                  onClick={() => toggleRoutineItem(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {}}
                    className="ios-checkbox shrink-0"
                  />
                  <span
                    className={`text-sm font-medium transition-all ${
                      item.completed
                        ? 'line-through text-ios-text-secondaryLight dark:text-ios-text-secondaryDark opacity-60'
                        : 'text-ios-text-primaryLight dark:text-ios-text-primaryDark'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(item);
                  }}
                  className="p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Daily Reflection Group */}
      <div className="space-y-1.5 pb-4">
        <div className="px-1 text-xs font-semibold uppercase tracking-wider text-ios-text-secondaryLight dark:text-ios-text-secondaryDark flex items-center justify-between">
          <span>Daily Reflection</span>
        </div>
        <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
          {[
            { id: 'ideas', label: 'Ideas', placeholder: 'Any sparks of inspiration today?' },
            { id: 'knowledge', label: 'Knowledge', placeholder: 'What did you learn today?' },
            { id: 'moral', label: 'Moral', placeholder: 'Reflections on character or behavior' },
            { id: 'negatives', label: 'Negatives', placeholder: 'What could have gone better?' }
          ].map((field) => (
            <div key={field.id} className="p-3 bg-[var(--card-bg)] transition-colors">
              <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                {field.label}
              </label>
              <textarea
                value={dailyJournal[field.id] || ''}
                onChange={(e) => updateJournalField(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={2}
                className="w-full text-xs bg-transparent text-ios-text-primaryLight dark:text-ios-text-primaryDark placeholder-ios-text-secondaryLight/50 dark:placeholder-ios-text-secondaryDark/50 resize-none focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Add Habit Sheet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] p-5 bg-[var(--card-bg)] rounded-t-3xl border-t border-ios-border-light dark:border-ios-border-dark space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                {editingHabitId ? 'Edit Habit' : 'Add New Habit'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingHabitId(null);
                }}
                className="p-1 text-ios-text-secondaryLight dark:text-ios-text-secondaryDark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <input
                type="text"
                required
                placeholder="e.g. Read 5 pages of Seerah"
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex space-x-2">
                {editingHabitId && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteRoutineItem(editingHabitId);
                      setShowAddModal(false);
                      setEditingHabitId(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-rose-500/10 text-rose-500 active-haptic flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-xs active-haptic"
                >
                  {editingHabitId ? 'Save Changes' : 'Save Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
