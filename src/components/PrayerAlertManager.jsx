import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const PrayerAlertManager = () => {
  const { prayerSchedule, prayerLogs, updatePrayerStatus, routineItems, toggleRoutineItem } = useApp();
  const [missedPrayer, setMissedPrayer] = useState(null);
  const lastActivePrayerId = useRef(null);

  // Helper to parse "05:02 AM" to a Date object for today
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
    const checkPrayers = () => {
      const now = new Date();
      const loggable = prayerSchedule.filter(p => !p.isViewOnly);
      
      // Sort by time
      const sorted = [...loggable].sort((a, b) => parseTime(a.time) - parseTime(b.time));
      
      // Find the current active prayer
      let currentActiveIndex = -1;
      for (let i = 0; i < sorted.length; i++) {
        if (now >= parseTime(sorted[i].time)) {
          currentActiveIndex = i;
        }
      }

      if (currentActiveIndex > 0) {
        const currentActiveId = sorted[currentActiveIndex].id;
        
        // If the active prayer just changed to a new one (time crossed)
        if (lastActivePrayerId.current !== null && lastActivePrayerId.current !== currentActiveId) {
          // Check if the previous prayer was logged
          const prevPrayer = sorted[currentActiveIndex - 1];
          const prevLog = prayerLogs[prevPrayer.id];
          if (!prevLog || prevLog.status !== 'completed') {
            setMissedPrayer(prevPrayer);
            if (window.playAlarm) window.playAlarm();
          }
        }
        lastActivePrayerId.current = currentActiveId;
      } else if (currentActiveIndex === 0) {
        lastActivePrayerId.current = sorted[0].id;
      }
    };

    // Run immediately and then every minute
    checkPrayers();
    const interval = setInterval(checkPrayers, 60000);
    return () => clearInterval(interval);
  }, [prayerSchedule, prayerLogs]);

  if (!missedPrayer) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-sm bg-[var(--card-bg)] rounded-2xl border border-rose-500/30 shadow-2xl shadow-rose-500/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-5 bg-rose-500/10 border-b border-rose-500/20 text-center shrink-0">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 animate-bounce" />
          <h2 className="text-lg font-bold text-rose-500">Prayer Time Passed</h2>
          <p className="text-xs text-rose-400 mt-1">
            The next prayer time has started, but you haven't finished <strong>{missedPrayer.name}</strong> yet.
          </p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Missed Prayer Action */}
          <div className="space-y-2">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
              Pending Prayer
            </h3>
            <div 
              onClick={() => {
                updatePrayerStatus(missedPrayer.id, 'completed', 'Jamaah');
                setMissedPrayer(null);
              }}
              className="ios-grouped-container p-3 flex items-center justify-between cursor-pointer active-haptic bg-emerald-500/5 border border-emerald-500/20"
            >
              <div>
                <p className="text-sm font-bold text-emerald-500">{missedPrayer.name}</p>
                <p className="text-xs text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">Tap to log now</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          {/* Pending Daily Habits */}
          <div className="space-y-2">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
              Pending Daily Habits
            </h3>
            <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
              {routineItems.filter(i => !i.completed).length === 0 ? (
                <p className="p-3 text-xs text-emerald-500 font-medium text-center">All habits completed! 🎉</p>
              ) : (
                routineItems.filter(i => !i.completed).map(item => (
                  <div key={item.id} onClick={() => toggleRoutineItem(item.id)} className="p-3 flex items-center space-x-3 cursor-pointer active-haptic">
                    <input type="checkbox" checked={item.completed} readOnly className="ios-checkbox shrink-0" />
                    <span className="text-sm font-medium text-ios-text-primaryLight dark:text-ios-text-primaryDark">{item.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-ios-border-light dark:border-ios-border-dark shrink-0">
          <button 
            onClick={() => setMissedPrayer(null)}
            className="w-full py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white font-bold text-sm active-haptic"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
};
