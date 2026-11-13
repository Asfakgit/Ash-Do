import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, Pencil, Trash2, CheckCircle2, Compass, Clock, CalendarDays, BellRing } from 'lucide-react';

export const UnifiedDashboard = () => {
  const { 
    prayerSchedule, prayerLogs, updatePrayerStatus, 
    routineItems, toggleRoutineItem, addRoutineItem, editRoutineItem, deleteRoutineItem,
    settings, updateSettingsSection 
  } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ text: '', date: '', time: '' });
  const [editingTaskId, setEditingTaskId] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettingsSection('profile', 'profileImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!taskForm.text.trim()) return;

    if (editingTaskId) {
      editRoutineItem(editingTaskId, {
        text: taskForm.text.trim(),
        date: taskForm.date,
        time: taskForm.time
      });
    } else {
      addRoutineItem({
        text: taskForm.text.trim(),
        date: taskForm.date,
        time: taskForm.time
      });
    }

    setTaskForm({ text: '', date: '', time: '' });
    setEditingTaskId(null);
    setShowAddModal(false);
  };

  const openEditModal = (item) => {
    setEditingTaskId(item.id);
    setTaskForm({ text: item.text, date: item.date || '', time: item.time || '' });
    setShowAddModal(true);
  };

  // Sort tasks by date and time
  const sortedTasks = [...routineItems].sort((a, b) => {
    const dateA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`) : new Date(0);
    const dateB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`) : new Date(0);
    return dateA - dateB;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-main)] flex items-center justify-between pt-2 pb-2">
        <div className="flex items-center gap-3">
          <img 
            src={settings?.profile?.profileImage || "/AshDo.png"} 
            alt="App Logo" 
            className="w-10 h-10 object-cover rounded-xl shadow-sm cursor-pointer border border-ios-border-light dark:border-ios-border-dark active-haptic hover:opacity-80 transition-opacity" 
            onClick={() => setShowAboutModal(true)}
          />
          <div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              {formattedDate}
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ios-text-primaryLight dark:text-ios-text-primaryDark leading-none mt-0.5">
              Ash Do
            </h1>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingTaskId(null);
            
            // Set default date to today, time to current time + 5 mins
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5);
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            setTaskForm({
              text: '',
              date: `${year}-${month}-${day}`,
              time: `${hours}:${minutes}`
            });
            setShowAddModal(true);
          }}
          className="p-2 rounded-full bg-emerald-500 text-white shadow-sm active-haptic flex items-center gap-1 px-3"
        >
          <Plus className="w-4 h-4" /> <span className="text-xs font-semibold">Task</span>
        </button>
      </div>

      {/* Prayers Section */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark px-1 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-500" /> Daily Prayers
        </h2>
        <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
          {prayerSchedule.filter(p => !p.isViewOnly).map((p) => {
            const log = prayerLogs[p.id] || { status: 'pending' };
            const isDone = log.status === 'completed';

            return (
              <div
                key={p.id}
                className={`ios-grouped-item flex items-center justify-between group cursor-pointer active-haptic ${isDone ? 'bg-emerald-500/5' : ''}`}
                onClick={() => {
                  updatePrayerStatus(p.id, isDone ? 'pending' : 'completed', 'Jamaah');
                }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isDone ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {p.name.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
                      {p.time}
                    </p>
                  </div>
                </div>

                {isDone ? (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Finished
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold">
                    Pending
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reminders / Tasks Section */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark px-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-emerald-500" /> Reminders & Tasks
        </h2>
        
        <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
          {sortedTasks.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 opacity-80">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                No tasks scheduled
              </p>
              <p className="text-xs text-ios-text-secondaryLight dark:text-ios-text-secondaryDark max-w-[200px]">
                Tap the + Task button above to create a reminder.
              </p>
            </div>
          ) : (
            sortedTasks.map((item) => (
              <div
                key={item.id}
                className={`ios-grouped-item flex items-center justify-between group ${item.completed ? 'opacity-60' : ''}`}
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
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-medium transition-all ${
                        item.completed
                          ? 'line-through text-ios-text-secondaryLight dark:text-ios-text-secondaryDark'
                          : 'text-ios-text-primaryLight dark:text-ios-text-primaryDark'
                      }`}
                    >
                      {item.text}
                    </span>
                    {(item.date || item.time) && (
                      <span className="text-[10px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
                        <Clock className="w-3 h-3" /> 
                        {item.date && new Date(item.date).toLocaleDateString()} {item.time && `at ${item.time}`}
                        {item.alarmTriggered && <BellRing className="w-3 h-3 ml-1 text-zinc-400" />}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                    className="p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoutineItem(item.id);
                    }}
                    className="p-2 rounded-full text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] p-5 bg-[var(--card-bg)] rounded-t-3xl border-t border-ios-border-light dark:border-ios-border-dark space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                {editingTaskId ? 'Edit Task' : 'New Task Reminder'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTaskId(null);
                }}
                className="p-1 text-ios-text-secondaryLight dark:text-ios-text-secondaryDark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Task Description</label>
                <input
                  type="text"
                  required
                  placeholder="What do you need to do?"
                  value={taskForm.text}
                  onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    required
                    value={taskForm.date}
                    onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Time</label>
                  <input
                    type="time"
                    required
                    value={taskForm.time}
                    onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-xs active-haptic flex items-center justify-center gap-2"
                >
                  <BellRing className="w-4 h-4" />
                  {editingTaskId ? 'Save Changes' : 'Schedule Alarm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-[320px] p-6 bg-[var(--card-bg)] rounded-3xl border border-ios-border-light dark:border-ios-border-dark space-y-5 text-center shadow-xl">
            <div className="flex justify-end -mt-2 -mr-2">
              <button onClick={() => setShowAboutModal(false)} className="p-1 text-ios-text-secondaryLight dark:text-ios-text-secondaryDark bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group cursor-pointer">
                <img 
                  src={settings?.profile?.profileImage || "/AshDo.png"} 
                  alt="Profile or Logo" 
                  className="w-24 h-24 object-cover rounded-3xl shadow-md border-2 border-emerald-500/20"
                />
                <label className="absolute inset-0 bg-black/50 rounded-3xl flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Plus className="w-6 h-6 text-white mb-1" />
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider">Upload</span>
                  <input type="file" accept="image/*" className="hidden" id="profile-upload" onChange={handleImageUpload} />
                </label>
              </div>

              <div>
                <h2 className="text-xl font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                  {settings?.about?.appName || 'Ash Do'}
                </h2>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 uppercase tracking-widest">
                  v{settings?.about?.appVersion || '1.0.0'} • by {settings?.about?.developer || 'Ashfak'}
                </p>
              </div>
            </div>

            <p className="text-sm text-ios-text-secondaryLight dark:text-ios-text-secondaryDark leading-relaxed px-2">
              {settings?.about?.description || 'Your simple, daily mentor for managing prayers and tasks with ease.'}
            </p>

            <button
              onClick={() => document.getElementById('profile-upload').click()}
              className="w-full py-3 mt-2 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark active-haptic shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Add Profile Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
