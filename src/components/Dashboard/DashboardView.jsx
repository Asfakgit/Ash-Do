import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Compass, CheckCircle2 } from 'lucide-react';

export const DashboardView = () => {
  const { routineItems, prayerSchedule, prayerLogs } = useApp();
  const [timeStr, setTimeStr] = useState('');
  const [nextPrayer, setNextPrayer] = useState(null);
  const [remainingTime, setRemainingTime] = useState('');

  // Calculations for KPI
  const completedRoutineCount = routineItems.filter((i) => i.completed).length;
  const routinePct = routineItems.length > 0 ? Math.round((completedRoutineCount / routineItems.length) * 100) : 0;
  
  const loggablePrayers = prayerSchedule.filter(p => !p.isViewOnly);
  const completedPrayersCount = loggablePrayers.filter(p => prayerLogs[p.id]?.status === 'completed').length;

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
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));

      // Calculate Next Prayer
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
        // Next prayer is the first prayer tomorrow
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

  const upcomingRoutine = routineItems.filter((i) => !i.completed).slice(0, 4);

  return (
    <div className="w-full h-full p-8 overflow-y-auto space-y-6">
      
      {/* Greeting & Wisdom Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-emerald-100 font-medium tracking-wide uppercase text-xs mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-3xl font-bold mb-1">Desktop Dashboard</h1>
            <p className="text-emerald-50 text-sm max-w-lg mt-2">
              Stay on top of your daily routines and prayer schedule.
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold tracking-tight">{timeStr}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Next Prayer Countdown Card */}
          <div className="bg-[var(--card-bg)] rounded-2xl border border-ios-border-light dark:border-ios-border-dark p-6 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-ios-border-light dark:border-ios-border-dark pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Compass className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                    Next {nextPrayer?.isViewOnly ? 'Event' : 'Prayer'}: {nextPrayer?.name || 'Loading...'}
                  </h3>
                  <p className="text-sm text-ios-text-secondaryLight dark:text-ios-text-secondaryDark mt-1">
                    Scheduled at {nextPrayer?.time}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                  {remainingTime}
                </span>
                <p className="text-xs text-ios-text-secondaryLight dark:text-ios-text-secondaryDark uppercase tracking-wider font-semibold">
                  Remaining
                </p>
              </div>
            </div>

            {/* Daily Prayer Status Pills */}
            <div className="grid grid-cols-5 gap-3 mt-6">
              {loggablePrayers.map((p) => {
                const log = prayerLogs[p.id];
                const isCompleted = log?.status === 'completed';
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border ${
                      isCompleted 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 mb-1" /> : <div className="w-5 h-5 mb-1 opacity-50"><Compass className="w-5 h-5" /></div>}
                    <span className="text-xs font-semibold">{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Habits */}
          <div className="bg-[var(--card-bg)] rounded-2xl border border-ios-border-light dark:border-ios-border-dark p-6 shadow-sm">
            <h3 className="text-sm font-bold text-ios-text-primaryLight dark:text-ios-text-primaryDark uppercase tracking-wider mb-4">
              Pending Habits
            </h3>
            {upcomingRoutine.length === 0 ? (
              <p className="text-sm text-emerald-600 font-medium">All habits complete for today!</p>
            ) : (
              <div className="space-y-3">
                {upcomingRoutine.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 shrink-0" />
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Progress Stats) */}
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] rounded-2xl border border-ios-border-light dark:border-ios-border-dark p-6 text-center shadow-sm">
            <h3 className="text-xs font-bold text-ios-text-secondaryLight dark:text-ios-text-secondaryDark uppercase tracking-wider mb-2">
              Habit Completion
            </h3>
            <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 my-4">
              {routinePct}%
            </p>
            <p className="text-sm text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
              {completedRoutineCount} of {routineItems.length} completed
            </p>
          </div>
          
          <div className="bg-[var(--card-bg)] rounded-2xl border border-ios-border-light dark:border-ios-border-dark p-6 text-center shadow-sm">
            <h3 className="text-xs font-bold text-ios-text-secondaryLight dark:text-ios-text-secondaryDark uppercase tracking-wider mb-2">
              Prayers Logged
            </h3>
            <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 my-4">
              {completedPrayersCount}/{loggablePrayers.length}
            </p>
            <p className="text-sm text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
              Logged on time today
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
