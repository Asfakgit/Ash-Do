import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const UIContext = createContext();

export const ROUTES = ['dashboard', 'tasks', 'calendar', 'focus', 'diary', 'achievements', 'settings'];
// Pages that were merged into others; old links still work.
const ALIASES = { today: 'dashboard', upcoming: 'tasks' };

const routeFromHash = () => {
  const [raw, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const path = ALIASES[raw] || raw;
  const route = ROUTES.includes(path) ? path : 'dashboard';
  return { route, params: Object.fromEntries(new URLSearchParams(query)) };
};

export const UIProvider = ({ children }) => {
  const [{ route, params }, setLocation] = useState(routeFromHash);
  const [toasts, setToasts] = useState([]);
  const [editor, setEditor] = useState(null); // { task } | { draft } | null
  const [celebration, setCelebration] = useState(0);
  const toastId = useRef(0);

  useEffect(() => {
    const onHash = () => setLocation(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to, query) => {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    window.location.hash = `/${to}${qs}`;
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (opts) => {
      const id = ++toastId.current;
      const t = { id, tone: 'default', duration: 4000, ...(typeof opts === 'string' ? { title: opts } : opts) };
      setToasts((prev) => [...prev.slice(-3), t]);
      if (t.duration) setTimeout(() => dismissToast(id), t.duration);
      return id;
    },
    [dismissToast]
  );

  const openEditor = useCallback((opts = {}) => setEditor(opts), []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const celebrate = useCallback(() => setCelebration((c) => c + 1), []);
  // Called on every profile switch so nothing from one profile stays on screen for another.
  const resetUI = useCallback(() => {
    setToasts([]);
    setEditor(null);
  }, []);

  return (
    <UIContext.Provider
      value={{ route, params, navigate, toasts, toast, dismissToast, editor, openEditor, closeEditor, celebration, celebrate, resetUI }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
