import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ACCENTS = [
  { id: 'lime', label: 'Electric Lime', swatch: '#C2F23D' },
  { id: 'violet', label: 'Violet', swatch: '#8B5CF6' },
  { id: 'cyan', label: 'Cyan', swatch: '#22D3EE' },
  { id: 'blue', label: 'Soft Blue', swatch: '#5B8CFF' },
  { id: 'emerald', label: 'Classic Emerald', swatch: '#10B981' },
];

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => read('daily_mentor_theme', 'system'));
  const [accentColor, setAccentColor] = useState(() => {
    const saved = read('ashdo_accent', 'lime');
    return ACCENTS.some((a) => a.id === saved) ? saved : 'lime';
  });
  const [effectiveTheme, setEffectiveTheme] = useState('dark');

  useEffect(() => {
    try {
      localStorage.setItem('daily_mentor_theme', theme);
      localStorage.setItem('ashdo_accent', accentColor);
    } catch {
      /* storage unavailable */
    }
    const root = document.documentElement;
    root.dataset.accent = accentColor;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
      setEffectiveTheme(isDark ? 'dark' : 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#08080c' : '#f4f4f8');
    };
    apply();
    if (theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [theme, accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
