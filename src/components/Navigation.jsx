import React from 'react';
import { CheckSquare, Compass, Settings } from 'lucide-react';

export const tabs = [
  { id: 'today', label: 'Today', icon: CheckSquare },
  { id: 'prayers', label: 'Prayers', icon: Compass },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Navigation = ({ currentTab, setCurrentTab }) => {
  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden glass-tabbar px-4 py-2 flex items-center justify-around shrink-0 border-t border-ios-border-light dark:border-ios-border-dark bg-[var(--card-bg)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active-haptic ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-ios-text-secondaryLight dark:text-ios-text-secondaryDark'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-500/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Left Sidebar */}
      <nav className="hidden md:flex flex-col w-64 border-r border-ios-border-light dark:border-ios-border-dark bg-[var(--card-bg)] p-4 space-y-2 h-full">
        <div className="mb-8 px-4 py-4">
          <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">Ash Do</h1>
          <p className="text-xs text-zinc-500 mt-1">Daily Mentor</p>
        </div>
        
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-ios-text-secondaryLight dark:text-ios-text-secondaryDark hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
