import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Compass, CheckCircle2, Settings, Plus, X, Pencil, Trash2 } from 'lucide-react';

export const PrayersView = () => {
  const { prayerSchedule, prayerLogs, updatePrayerStatus, addPrayer, editPrayer, deletePrayer } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [formData, setFormData] = useState({ name: '', time: '', isViewOnly: false });

  const handleSave = (e) => {
    e.preventDefault();
    if (editingPrayer) {
      editPrayer(editingPrayer.id, formData.name, formData.time);
    } else {
      addPrayer(formData.name, formData.time, formData.isViewOnly);
    }
    setEditingPrayer(null);
    setFormData({ name: '', time: '', isViewOnly: false });
    setIsFormOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Daily Salah
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ios-text-primaryLight dark:text-ios-text-primaryDark">
            Prayers
          </h1>
        </div>
        <button
          onClick={() => setShowEditModal(!showEditModal)}
          className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 active-haptic"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Prayers List */}
      <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
        {prayerSchedule.map((p) => {
          const log = prayerLogs[p.id] || { status: 'pending' };
          const isDone = log.status === 'completed';

          return (
            <div
              key={p.id}
              className={`ios-grouped-item flex items-center justify-between group ${showEditModal ? '' : (p.isViewOnly ? '' : 'cursor-pointer active-haptic')} ${isDone && !showEditModal ? 'bg-emerald-500/5' : ''}`}
              onClick={() => {
                if (!showEditModal && !p.isViewOnly) {
                  updatePrayerStatus(p.id, isDone ? 'pending' : 'completed', 'Jamaah');
                }
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

              {showEditModal ? (
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPrayer(p);
                      setFormData({ name: p.name, time: p.time, isViewOnly: p.isViewOnly });
                      setIsFormOpen(true);
                    }}
                    className="p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePrayer(p.id);
                    }}
                    className="p-2 rounded-full text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : p.isViewOnly ? (
                <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  Event
                </span>
              ) : isDone ? (
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Finished
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold">
                  Finished
                </span>
              )}
            </div>
          );
        })}
        {showEditModal && (
          <div
            onClick={() => {
              setEditingPrayer(null);
              setFormData({ name: '', time: '', isViewOnly: false });
              setIsFormOpen(true);
            }}
            className="ios-grouped-item cursor-pointer active-haptic justify-center text-emerald-600 dark:text-emerald-400 py-4"
          >
            <div className="flex items-center space-x-2 text-xs font-bold">
              <Plus className="w-4 h-4" />
              <span>Add New Schedule</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] p-5 bg-[var(--card-bg)] rounded-t-3xl border-t border-ios-border-light dark:border-ios-border-dark space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                {editingPrayer ? 'Edit Schedule' : 'Add New Schedule'}
              </h3>
              <button
                onClick={() => {
                  setEditingPrayer(null);
                  setFormData({ name: '', time: '', isViewOnly: false });
                  setIsFormOpen(false);
                }}
                className="p-1 text-ios-text-secondaryLight dark:text-ios-text-secondaryDark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Name (e.g. Fajr, Sunset)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                required
                placeholder="Time (e.g. 05:30 AM)"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark border border-ios-border-light dark:border-ios-border-dark text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              
              {!editingPrayer && (
                <label className="flex items-center space-x-3 p-2">
                  <input
                    type="checkbox"
                    checked={formData.isViewOnly}
                    onChange={(e) => setFormData({ ...formData, isViewOnly: e.target.checked })}
                    className="ios-checkbox"
                  />
                  <span className="text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                    View-only event (e.g., Sunrise)
                  </span>
                </label>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-xs active-haptic"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
