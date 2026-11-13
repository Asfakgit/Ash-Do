import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { ResponsiveLayout } from './components/ResponsiveLayout';
import { UnifiedDashboard } from './components/UnifiedDashboard';
import { AlarmManager } from './components/AlarmManager';
import { PrayerAlertManager } from './components/PrayerAlertManager';
import { TaskAlarmManager } from './components/TaskAlarmManager';

function MainApp() {

  return (
    <ResponsiveLayout>
      {/* Alarm System */}
      <AlarmManager />
      <PrayerAlertManager />
      <TaskAlarmManager />

      {/* Dynamic View Router */}
      <div className="w-full h-full relative">
        <UnifiedDashboard />
      </div>
    </ResponsiveLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ThemeProvider>
  );
}
