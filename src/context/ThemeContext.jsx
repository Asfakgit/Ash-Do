import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('daily_mentor_theme') || 'system';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('daily_mentor_accent') || 'emerald';
  });

  const [effectiveTheme, setEffectiveTheme] = useState('light');

  useEffect(() => {
    localStorage.setItem('daily_mentor_theme', theme);
    localStorage.setItem('daily_mentor_accent', accentColor);

    const root = document.documentElement;

    const updateTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        // System preference
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        root.classList.add('dark');
        setEffectiveTheme('dark');
      } else {
        root.classList.remove('dark');
        setEffectiveTheme('light');
      }
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        if (e.matches) {
          root.classList.add('dark');
          setEffectiveTheme('dark');
        } else {
          root.classList.remove('dark');
          setEffectiveTheme('light');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
