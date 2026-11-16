import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as db from '../lib/db';
import { collectLegacyData, clearLegacyData } from '../lib/legacy';
import { clearScheduledReminders } from '../lib/native';
import { useUI } from './UIContext';

// Holds the signed-in local profile, its decrypted data snapshot and a write queue
// that persists changes to IndexedDB (encrypted) in the background.
// Every profile on the phone has its own username, password and encrypted data;
// signing in to one never exposes another's tasks, settings, theme or reminders.
const AuthContext = createContext();
const SessionContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ status: 'booting', user: null, key: null, snapshot: null, error: '' });
  const [users, setUsers] = useState([]);
  const { resetUI, navigate } = useUI();

  const refreshUsers = useCallback(async () => {
    try {
      setUsers(await db.listUsers());
    } catch {
      setUsers([]);
    }
  }, []);

  const enter = useCallback(async (user, key, extraNotice) => {
    resetUI();
    const snapshot = await db.loadUserData(user.id, key);
    setState({ status: 'ready', user, key, snapshot, version: Date.now(), error: '', notice: extraNotice || (snapshot.unreadable ? `${snapshot.unreadable} damaged records were skipped.` : '') });
    db.requestPersistence();
  }, [resetUI]);

  useEffect(() => {
    (async () => {
      if (!db.isSupported()) {
        setState({ status: 'unsupported', user: null, key: null, snapshot: null, error: '' });
        return;
      }
      try {
        await refreshUsers();
        const session = await db.loadSession();
        if (session) await enter(session.user, session.key);
        else setState((s) => ({ ...s, status: 'signedOut' }));
      } catch (e) {
        setState({ status: 'error', user: null, key: null, snapshot: null, error: e.message || 'Local storage is unavailable' });
      }
    })();
  }, [enter, refreshUsers]);

  const register = useCallback(
    async ({ username, password, remember = true, importLegacy = false }) => {
      const { user, key } = await db.createUser({ username, password });
      const puts = [{ kind: 'kv', rid: 'settings', value: { profile: { userName: user.name, profileImage: null } } }];
      let notice = '';
      if (importLegacy) {
        const legacy = collectLegacyData();
        if (legacy) {
          legacy.tasks.forEach((t) => puts.push({ kind: 'task', rid: t.task_id, value: t }));
          legacy.sessions.forEach((s) => puts.push({ kind: 'session', rid: s.id, value: s }));
          Object.entries(legacy.kv).forEach(([rid, value]) => puts.push({ kind: 'kv', rid, value: rid === 'settings' ? { ...value, profile: { ...(value.profile || {}), userName: user.name } } : value }));
          await db.writeRecords(user.id, key, puts);
          // Verify before removing the old unencrypted copy.
          const check = await db.loadUserData(user.id, key);
          if (check.tasks.length === legacy.tasks.length) {
            clearLegacyData();
            notice = `Imported ${legacy.tasks.length} tasks from the previous version.`;
          } else notice = 'Some old data could not be imported; the original copy was kept.';
        }
      }
      if (!importLegacy || !notice) await db.writeRecords(user.id, key, puts);
      if (remember) await db.saveSession(user.id, key);
      await refreshUsers();
      navigate('dashboard'); // every sign-in starts on Today, never on the previous person's page
      await enter(user, key, notice);
    },
    [enter, refreshUsers, navigate]
  );

  const login = useCallback(
    async ({ username, password, remember = true }) => {
      const { user, key } = await db.verifyLogin(username, password);
      if (remember) await db.saveSession(user.id, key);
      else await db.clearSession();
      await refreshUsers();
      navigate('dashboard');
      await enter(user, key);
    },
    [enter, refreshUsers, navigate]
  );

  const signOut = useCallback(async () => {
    resetUI();
    setState({ status: 'signedOut', user: null, key: null, snapshot: null, error: '' });
    await clearScheduledReminders();
    navigate('dashboard');
    await refreshUsers();
  }, [refreshUsers, resetUI, navigate]);

  const logout = useCallback(async () => {
    await window.__ashdoFlush?.();
    await db.clearSession().catch(() => {});
    await signOut();
  }, [signOut]);

  const renameUser = useCallback(async (name) => {
    const u = await db.updateUserName(state.user?.id, name);
    if (u) setState((s) => ({ ...s, user: u }));
  }, [state.user]);

  const changePassword = useCallback(
    async (oldPw, newPw) => {
      await window.__ashdoFlush?.();
      const key = await db.changePassword(state.user.id, oldPw, newPw);
      setState((s) => ({ ...s, key }));
    },
    [state.user]
  );

  const deleteProfile = useCallback(async () => {
    await window.__ashdoFlush?.(); // finish pending saves first so none land after the delete
    await db.deleteUser(state.user.id);
    await signOut();
  }, [state.user, signOut]);

  const wipeDevice = useCallback(async () => {
    await clearScheduledReminders();
    await db.wipeEverything();
    window.location.reload();
  }, []);

  // Restore a validated backup into the current profile, then reload state from disk.
  const restore = useCallback(
    async (puts, mode) => {
      await window.__ashdoFlush?.();
      if (mode === 'replace') await db.replaceUserData(state.user.id, state.key, puts);
      else await db.writeRecords(state.user.id, state.key, puts);
      await enter(state.user, state.key);
    },
    [state.user, state.key, enter]
  );

  const value = useMemo(
    () => ({ ...state, users, register, login, logout, renameUser, changePassword, deleteProfile, wipeDevice, restore, legacyAvailable: Boolean(collectLegacyData()) }),
    [state, users, register, login, logout, renameUser, changePassword, deleteProfile, wipeDevice, restore]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

// ---------- per-profile persistence ----------
export const SessionProvider = ({ children, onSaveError }) => {
  const { user, key, snapshot } = useAuth();
  const queue = useRef(Promise.resolve());
  const pendingKV = useRef(new Map());
  const failed = useRef({ puts: new Map(), deletes: new Map() });
  const timer = useRef(null);
  const retryTimer = useRef(null);
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error
  const errorRef = useRef(onSaveError);
  errorRef.current = onSaveError;

  const run = useCallback(
    (puts, deletes) => {
      // merge anything that failed earlier so it is retried, never dropped
      const f = failed.current;
      const allPuts = new Map([...f.puts, ...puts.map((p) => [`${p.kind}|${p.rid}`, p])]);
      const allDeletes = new Map([...f.deletes, ...deletes.map((d) => [`${d.kind}|${d.rid}`, d])]);
      allDeletes.forEach((_, k) => allPuts.delete(k));
      failed.current = { puts: new Map(), deletes: new Map() };
      setSaveState('saving');
      queue.current = queue.current
        .then(() => db.writeRecords(user.id, key, [...allPuts.values()], [...allDeletes.values()]))
        .then(() => {
          if (!failed.current.puts.size && !failed.current.deletes.size) setSaveState('saved');
        })
        .catch((e) => {
          allPuts.forEach((v, k) => !failed.current.puts.has(k) && failed.current.puts.set(k, v));
          allDeletes.forEach((v, k) => failed.current.deletes.set(k, v));
          setSaveState('error');
          errorRef.current?.(e);
          clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => run([], []), 5000);
        });
      return queue.current;
    },
    [user, key]
  );

  const flushKV = useCallback(() => {
    clearTimeout(timer.current);
    const puts = [...pendingKV.current.entries()].map(([rid, value]) => ({ kind: 'kv', rid, value }));
    pendingKV.current.clear();
    return puts.length ? run(puts, []) : queue.current;
  }, [run]);

  const saveKV = useCallback(
    (rid, value) => {
      pendingKV.current.set(rid, value);
      clearTimeout(timer.current);
      timer.current = setTimeout(flushKV, 250);
    },
    [flushKV]
  );

  // Diff a collection against what was last written and persist only changed rows.
  const collections = useRef({});
  const syncCollection = useCallback(
    (kind, list, idField) => {
      const prev = collections.current[kind];
      const next = new Map(list.map((x) => [x[idField], x]));
      collections.current[kind] = next;
      if (!prev) return;
      const puts = [];
      const deletes = [];
      next.forEach((v, id) => prev.get(id) !== v && puts.push({ kind, rid: id, value: v }));
      prev.forEach((_, id) => !next.has(id) && deletes.push({ kind, rid: id }));
      if (puts.length || deletes.length) run(puts, deletes);
    },
    [run]
  );

  useEffect(() => {
    const flushAll = () => flushKV();
    window.__ashdoFlush = flushAll;
    const onHide = () => document.visibilityState === 'hidden' && flushKV();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushAll);
    return () => {
      flushKV();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushAll);
      clearTimeout(retryTimer.current);
      if (window.__ashdoFlush === flushAll) delete window.__ashdoFlush;
    };
  }, [flushKV]);

  const value = useMemo(() => ({ user, snapshot, saveKV, syncCollection, saveState }), [user, snapshot, saveKV, syncCollection, saveState]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => useContext(SessionContext);

// useState that is loaded from, and saved to, the signed-in profile's encrypted store.
export function usePersistentState(rid, initial, revive) {
  const { snapshot, saveKV } = useSession();
  const [value, setValue] = useState(() => {
    const stored = snapshot.kv[rid];
    const base = typeof initial === 'function' ? initial() : initial;
    if (stored === undefined) return base;
    try {
      return revive ? revive(stored, base) : stored;
    } catch {
      return base;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (snapshot.kv[rid] !== undefined) return;
    }
    saveKV(rid, value);
  }, [rid, value, saveKV]); // eslint-disable-line react-hooks/exhaustive-deps
  return [value, setValue];
}
