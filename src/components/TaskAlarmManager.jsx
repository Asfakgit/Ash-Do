import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const TaskAlarmManager = () => {
  const { routineItems, markAlarmTriggered } = useApp();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Format as YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDate = `${year}-${month}-${day}`;

      // Format as HH:MM
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;

      routineItems.forEach(item => {
        if (!item.completed && !item.alarmTriggered && item.date && item.time) {
          if (item.date === currentDate && item.time === currentTime) {
            if (window.playAlarm) {
              window.playAlarm();
            }
            markAlarmTriggered(item.id);
            
            // Optionally, show a native browser notification if permitted
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('Task Reminder', {
                  body: item.text,
                });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    new Notification('Task Reminder', {
                      body: item.text,
                    });
                  }
                });
              }
            }
          }
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [routineItems, markAlarmTriggered]);

  return null;
};
