import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Sun, Moon, Laptop, RotateCcw, Bell, Play } from 'lucide-react';

export const SettingsView = () => {
  const { theme, setTheme } = useTheme();
  const { settings, resetAllData, updateSettingsSection } = useApp();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const toggleAlarm = () => {
    updateSettingsSection('alarm', 'enabled', !settings.alarm.enabled);
  };

  const handleTestAlarm = () => {
    if (window.playAlarm) {
      window.playAlarm();
      setIsPlayingTest(true);
      setTimeout(() => setIsPlayingTest(false), 2000); // Reset button state after a bit
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="pt-1">
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Preferences
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ios-text-primaryLight dark:text-ios-text-primaryDark">
          Settings
        </h1>
      </div>

      {/* Theme Card */}
      <div className="space-y-1.5">
        <div className="px-1 text-xs font-semibold uppercase tracking-wider text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
          Appearance
        </div>
        <div className="ios-grouped-container p-3 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
              Theme Mode
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 capitalize font-semibold">
              {theme}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-ios-cardSecondary-light dark:bg-ios-cardSecondary-dark">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-1.5 text-xs text-center rounded-lg transition-all ${
                theme === 'light' ? 'bg-[var(--card-bg)] shadow-sm font-bold' : ''
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-1.5 text-xs text-center rounded-lg transition-all ${
                theme === 'dark' ? 'bg-[var(--card-bg)] text-white shadow-sm font-bold' : ''
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 py-1.5 text-xs text-center rounded-lg transition-all ${
                theme === 'system' ? 'bg-emerald-500 text-white shadow-sm font-bold' : ''
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>System</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alarm Settings Card */}
      <div className="space-y-1.5">
        <div className="px-1 text-xs font-semibold uppercase tracking-wider text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
          Notifications & Sounds
        </div>
        <div className="ios-grouped-container divide-y divide-ios-border-light dark:divide-ios-border-dark">
          <div className="ios-grouped-item">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-xs text-ios-text-primaryLight dark:text-ios-text-primaryDark">
                Enable Alarms
              </span>
            </div>
            <div
              onClick={toggleAlarm}
              className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings?.alarm?.enabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`bg-[var(--card-bg)] w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                  settings?.alarm?.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
          <div
            onClick={handleTestAlarm}
            className="ios-grouped-item cursor-pointer active-haptic justify-center text-emerald-600 dark:text-emerald-400"
          >
            <div className="flex items-center space-x-2 font-semibold text-xs">
              <Play className={`w-4 h-4 ${isPlayingTest ? 'animate-pulse' : ''}`} />
              <span>{isPlayingTest ? 'Playing...' : 'Test Alarm Sound'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="ios-grouped-container p-3 flex justify-between items-center text-xs">
        <span className="font-semibold text-ios-text-primaryLight dark:text-ios-text-primaryDark">
          Prayer Location
        </span>
        <span className="text-ios-text-secondaryLight dark:text-ios-text-secondaryDark">
          {settings.location.city}
        </span>
      </div>

      {/* Reset Card */}
      <div className="ios-grouped-container p-3 flex justify-between items-center text-xs">
        <button
          onClick={() => setResetConfirm(true)}
          className="text-rose-500 font-semibold flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All Data</span>
        </button>
      </div>

      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="ios-grouped-container p-5 text-center space-y-3 bg-[var(--card-bg)] w-full max-w-[320px]">
            <Trash2 className="w-8 h-8 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-rose-500">Reset All Data?</h4>
            <p className="text-xs text-ios-text-secondaryLight">
              Restores default checklist and prayer logs.
            </p>
            <div className="flex justify-center space-x-2 pt-1">
              <button
                onClick={() => setResetConfirm(false)}
                className="px-3 py-1.5 rounded-full text-xs bg-zinc-200 dark:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setResetConfirm(false);
                }}
                className="px-4 py-1.5 rounded-full text-xs bg-rose-500 text-white font-semibold"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
