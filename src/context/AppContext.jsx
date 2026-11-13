import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const initialRoutineItems = [];

const initialPrayerSchedule = [
  { id: 'p-1', name: 'Fajr', time: '05:02 AM', isViewOnly: false },
  { id: 'p-3', name: 'Dhuhr', time: '12:32 PM', isViewOnly: false },
  { id: 'p-4', name: 'Asr', time: '03:45 PM', isViewOnly: false },
  { id: 'p-5', name: 'Maghrib', time: '06:48 PM', isViewOnly: false },
  { id: 'p-6', name: 'Isha', time: '08:02 PM', isViewOnly: false }
];

const initialPrayerLogs = {};

const initialGoals = [
  {
    id: 'goal-book',
    title: 'Read one book per month',
    category: 'Knowledge',
    progress: 0,
    targetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0], // End of month
    milestones: []
  }
];

const initialDailyJournal = {
  ideas: '',
  knowledge: '',
  moral: '',
  negatives: ''
};

const initialSettings = {
  notifications: {
    enabled: true,
    prayerAlerts: true,
    dailySummary: true,
    summaryTime: '21:00',
    quietHours: true
  },
  prayerSettings: {
    calculationMethod: 'Islamic Society of North America (ISNA)',
    asrMethod: 'Standard (Shafi, Maliki, Hanbali)',
    adhanSound: 'Soft Chime',
    showSunnah: true
  },
  dailyRoutine: {
    targetWakeUp: '05:00',
    targetBedtime: '22:30',
    autoResetDaily: true
  },
  reminders: {
    snoozeDuration: 5,
    reminderVolume: 'Medium',
    vibrationHaptics: true
  },
  quranGoals: {
    khatmPeriodDays: 60,
    dailyPageTarget: 5,
    translationLang: 'English (Sahih International)'
  },
  personalGoals: {
    maxActiveGoals: 5,
    showProgressRings: true,
    autoArchiveCompleted: false
  },
  location: {
    city: 'New Delhi',
    country: 'India',
    timezone: 'IST (UTC+5:30)',
    autoDetectGPS: true
  },
  dataPrivacy: {
    localOnlyStorage: true,
    analyticsSharing: false,
    lastBackupDate: '2026-08-09'
  },
  about: {
    appName: 'Ash Do',
    appVersion: '1.0.0',
    developer: 'Ashfak',
    description: 'Your simple, daily mentor for managing prayers and tasks with ease.',
  },
  profile: {
    profileImage: null,
    userName: 'User'
  },
  alarm: {
    enabled: true,
    soundUrl: 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3', // Default soothing chime
    volume: 1.0
  }
};

const initialMentorMessages = [
  {
    id: 'msg-1',
    sender: 'mentor',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: "Assalamu Alaikum! Welcome to your Daily Mentor. Let's start building strong habits and tracking your progress."
  }
];

export const AppProvider = ({ children }) => {
  const [routineItems, setRoutineItems] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_routine');
    return saved ? JSON.parse(saved) : initialRoutineItems;
  });

  const [prayerLogs, setPrayerLogs] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_prayers');
    return saved ? JSON.parse(saved) : initialPrayerLogs;
  });

  const [prayerSchedule, setPrayerSchedule] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_prayer_schedule');
    return saved ? JSON.parse(saved) : initialPrayerSchedule;
  });

  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_goals');
    return saved ? JSON.parse(saved) : initialGoals;
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [mentorMessages, setMentorMessages] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_messages');
    return saved ? JSON.parse(saved) : initialMentorMessages;
  });

  const [dailyJournal, setDailyJournal] = useState(() => {
    const saved = localStorage.getItem('daily_mentor_journal');
    return saved ? JSON.parse(saved) : initialDailyJournal;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('daily_mentor_journal', JSON.stringify(dailyJournal));
  }, [dailyJournal]);
  useEffect(() => {
    localStorage.setItem('daily_mentor_routine', JSON.stringify(routineItems));
  }, [routineItems]);

  useEffect(() => {
    localStorage.setItem('daily_mentor_prayers', JSON.stringify(prayerLogs));
  }, [prayerLogs]);

  useEffect(() => {
    localStorage.setItem('daily_mentor_prayer_schedule', JSON.stringify(prayerSchedule));
  }, [prayerSchedule]);

  useEffect(() => {
    localStorage.setItem('daily_mentor_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('daily_mentor_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('daily_mentor_messages', JSON.stringify(mentorMessages));
  }, [mentorMessages]);

  // Actions
  const toggleRoutineItem = (id) => {
    setRoutineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const addRoutineItem = (newItem) => {
    setRoutineItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        completed: false,
        alarmTriggered: false,
        ...newItem
      }
    ]);
  };

  const markAlarmTriggered = (id) => {
    setRoutineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, alarmTriggered: true } : item))
    );
  };

  const editRoutineItem = (id, updates) => {
    setRoutineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteRoutineItem = (id) => {
    setRoutineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addPrayer = (name, time, isViewOnly = false) => {
    setPrayerSchedule((prev) => [
      ...prev,
      { id: 'p-' + Date.now(), name, time, isViewOnly }
    ]);
  };

  const editPrayer = (id, newName, newTime) => {
    setPrayerSchedule((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName, time: newTime } : p))
    );
  };

  const deletePrayer = (id) => {
    setPrayerSchedule((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePrayerStatus = (prayerId, status, location) => {
    setPrayerLogs((prev) => ({
      ...prev,
      [prayerId]: {
        ...prev[prayerId],
        status,
        ...(location ? { location } : {})
      }
    }));
  };



  const updateGoalProgress = (goalId, newProgress) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, progress: Math.min(100, Math.max(0, newProgress)) } : g))
    );
  };

  const toggleMilestone = (goalId, milestoneId) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.map((m) =>
            m.id === milestoneId ? { ...m, done: !m.done } : m
          );
          const completedCount = updatedMilestones.filter((m) => m.done).length;
          const progress = Math.round((completedCount / updatedMilestones.length) * 100);
          return { ...g, milestones: updatedMilestones, progress };
        }
        return g;
      })
    );
  };

  const addGoal = (newGoal) => {
    setGoals((prev) => [
      ...prev,
      {
        id: 'goal-' + Date.now(),
        progress: 0,
        milestones: [],
        ...newGoal
      }
    ]);
  };

  const updateSettingsSection = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateJournalField = (field, value) => {
    setDailyJournal((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const sendMessageToMentor = (text) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      time: timeStr,
      text
    };

    setMentorMessages((prev) => [...prev, userMsg]);

    // Simulate smart AI Mentor response
    setTimeout(() => {
      let replyText = "That is a thoughtful reflection. Focus on small, consistent steps today. As the Prophet (pbuh) taught us, excellence (Ihsan) comes from devotion in every act.";

      const lower = text.toLowerCase();
      if (lower.includes('prayer') || lower.includes('fajr') || lower.includes('salah')) {
        replyText = "Maintaining your Salah on time elevates your entire day. Try placing your alarm across the room and making wudu immediately upon waking.";
      } else if (lower.includes('quran') || lower.includes('read') || lower.includes('surah')) {
        replyText = "SubhanAllah! Setting aside even 10 minutes after Fajr for Quran creates immense barakah in your time.";
      } else if (lower.includes('goal') || lower.includes('habit') || lower.includes('routine')) {
        replyText = "Track your routine morning and night. Discipline is choosing between what you want now and what you want most.";
      }

      const mentorMsg = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'mentor',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: replyText
      };

      setMentorMessages((prev) => [...prev, mentorMsg]);
    }, 1000);
  };

  const resetAllData = () => {
    setRoutineItems(initialRoutineItems);
    setPrayerLogs(initialPrayerLogs);
    setPrayerSchedule(initialPrayerSchedule);
    setGoals(initialGoals);
    setSettings(initialSettings);
    setMentorMessages(initialMentorMessages);
    setDailyJournal(initialDailyJournal);
    localStorage.clear();
  };

  const exportDataJSON = () => {
    const exportData = {
      routineItems,
      prayerLogs,
      prayerSchedule,
      goals,
      settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-mentor-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppContext.Provider
      value={{
        routineItems,
        prayerLogs,
        prayerSchedule,
        goals,
        settings,
        mentorMessages,
        dailyJournal,
        toggleRoutineItem,
        addRoutineItem,
        editRoutineItem,
        deleteRoutineItem,
        updatePrayerStatus,
        addPrayer,
        editPrayer,
        deletePrayer,
        updateGoalProgress,
        toggleMilestone,
        addGoal,
        updateSettingsSection,
        updateJournalField,
        sendMessageToMentor,
        resetAllData,
        exportDataJSON,
        markAlarmTriggered
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
