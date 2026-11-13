import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

export const AlarmManager = () => {
  const { settings } = useApp();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Expose play/stop globally if needed via a custom event, or just listen to state changes.
  // For now, we will add a global window method for testing/triggering easily.
  useEffect(() => {
    window.playAlarm = () => {
      if (settings?.alarm?.enabled && audioRef.current) {
        audioRef.current.volume = settings.alarm.volume || 1.0;
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
        setIsPlaying(true);
      }
    };

    window.stopAlarm = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    };

    return () => {
      delete window.playAlarm;
      delete window.stopAlarm;
    };
  }, [settings]);

  return (
    <audio
      ref={audioRef}
      src={settings?.alarm?.soundUrl || 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3'}
      preload="auto"
      onEnded={() => setIsPlaying(false)}
    />
  );
};
