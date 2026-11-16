// Thin platform layer: Android (Capacitor) vs browser/PWA. Everything here works offline.
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

// ---------- back button: a stack of handlers (top-most open layer closes first) ----------
const backStack = [];
export function pushBackHandler(fn) {
  backStack.push(fn);
  return () => {
    const i = backStack.lastIndexOf(fn);
    if (i >= 0) backStack.splice(i, 1);
  };
}

export async function initNative({ onRootBack, onPause }) {
  if (!isNative) return () => {};
  const subs = [];
  subs.push(
    await App.addListener('backButton', () => {
      const top = backStack[backStack.length - 1];
      if (top) top();
      else onRootBack?.();
    })
  );
  subs.push(await App.addListener('pause', () => onPause?.()));
  try {
    await Keyboard.setAccessoryBarVisible?.({ isVisible: false });
  } catch {
    /* android: not applicable */
  }
  const kbShow = await Keyboard.addListener('keyboardWillShow', () => document.documentElement.classList.add('keyboard-open'));
  const kbHide = await Keyboard.addListener('keyboardWillHide', () => document.documentElement.classList.remove('keyboard-open'));
  subs.push(kbShow, kbHide);
  return () => subs.forEach((s) => s.remove());
}

export const hideSplash = () => (isNative ? SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {}) : undefined);

export const minimizeApp = () => (isNative ? App.minimizeApp().catch(() => App.exitApp()) : undefined);

// Edge-to-edge (Android 15+): the web view draws behind the bars; we only pick icon colour.
export async function setStatusBarTheme(dark) {
  if (!isNative) return;
  try {
    await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  } catch {
    /* ignore */
  }
}

// ---------- notifications ----------
export async function notificationPermission() {
  if (isNative) {
    try {
      const p = await LocalNotifications.checkPermissions();
      return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'default';
    } catch {
      return 'unsupported';
    }
  }
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission() {
  if (isNative) {
    const p = await LocalNotifications.requestPermissions();
    return p.display === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

// Stable 31-bit id per reminder so rescheduling replaces rather than duplicates.
export const notificationId = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483000 || 1;
};

export async function notifyNow(title, body) {
  if (isNative) {
    try {
      await LocalNotifications.schedule({ notifications: [{ id: notificationId(title + Date.now()), title, body, smallIcon: 'ic_stat_ashdo' }] });
    } catch {
      /* permission missing */
    }
    return;
  }
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {
    /* unsupported */
  }
}

// Exact alarms (Android 12+) are off by default on Android 14+. We only use them when the user has
// allowed them; otherwise reminders are delivered by the OS within a few minutes, with no prompt.
export async function exactAlarmStatus() {
  if (!isNative || platform !== 'android') return 'unsupported';
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm;
  } catch {
    return 'unsupported';
  }
}
export async function requestExactAlarms() {
  try {
    lastScheduled = ''; // reschedule with the new precision
    lastDiary = '';
    return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm;
  } catch {
    return 'unsupported';
  }
}

// Android notification channels. A channel's sound can't change after it is created,
// so the ids carry a version: bump it if the sound file changes.
const CHANNEL_TASK = 'ashdo_alarm_v1';
const CHANNEL_DIARY = 'ashdo_diary_v1';
let channelsReady = null;
function ensureChannels() {
  if (!isNative || platform !== 'android') return Promise.resolve();
  channelsReady ||= Promise.all([
    LocalNotifications.createChannel({
      id: CHANNEL_TASK,
      name: 'Task alarms',
      description: 'Task reminders, with the alarm sound',
      importance: 5,
      sound: 'ashdo_alarm.wav',
      vibration: true,
      lights: true,
      lightColor: '#C2F23D',
    }),
    LocalNotifications.createChannel({
      id: CHANNEL_DIARY,
      name: 'Diary reminder',
      description: 'Daily reminder to write your diary',
      importance: 4,
      sound: 'ashdo_diary.wav',
      vibration: true,
    }),
  ]).catch((e) => {
    channelsReady = null;
    console.warn('Could not create notification channels', e);
  });
  return channelsReady;
}

export const diaryNotificationId = (date) => notificationId(`diary|${date}`);
const isDiary = (n) => n.extra?.kind === 'diary';

async function cancelPending(filter) {
  const pending = await LocalNotifications.getPending();
  const ids = pending.notifications.filter(filter).map((n) => ({ id: n.id }));
  if (ids.length) await LocalNotifications.cancel({ notifications: ids });
}

// Android: hand reminders to the OS so they fire even when Ash Do is closed.
let lastScheduled = '';
export async function syncScheduledReminders(reminders) {
  if (!isNative) return;
  const signature = JSON.stringify(reminders.map((r) => [r.key, r.at]));
  if (signature === lastScheduled) return;
  lastScheduled = signature;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await ensureChannels();
    await cancelPending((n) => !isDiary(n));
    if (!reminders.length) return;
    const exact = (await exactAlarmStatus()) === 'granted';
    await LocalNotifications.schedule({
      notifications: reminders.slice(0, 60).map((r) => ({
        id: notificationId(r.key),
        title: r.title,
        body: r.body,
        schedule: { at: new Date(r.at), allowWhileIdle: true },
        isExactNotification: exact, // never pops the system settings screen on its own
        channelId: CHANNEL_TASK,
        smallIcon: 'ic_stat_ashdo',
        extra: { kind: 'task', taskId: r.taskId },
      })),
    });
  } catch (e) {
    lastScheduled = '';
    console.warn('Could not schedule reminders', e);
  }
}

// Diary: one notification per upcoming day (not a repeating one), so a day that
// already has an entry can be skipped and reminders keep coming if the app isn't opened.
let lastDiary = '';
export async function syncDiaryReminders(list) {
  if (!isNative) return;
  const signature = JSON.stringify(list.map((r) => [r.date, r.at]));
  if (signature === lastDiary) return;
  lastDiary = signature;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await ensureChannels();
    await cancelPending(isDiary);
    if (!list.length) return;
    const exact = (await exactAlarmStatus()) === 'granted';
    await LocalNotifications.schedule({
      notifications: list.map((r) => ({
        id: diaryNotificationId(r.date),
        title: r.title,
        body: r.body,
        schedule: { at: new Date(r.at), allowWhileIdle: true },
        isExactNotification: exact,
        channelId: CHANNEL_DIARY,
        smallIcon: 'ic_stat_ashdo',
        extra: { kind: 'diary', date: r.date },
      })),
    });
  } catch (e) {
    lastDiary = '';
    console.warn('Could not schedule diary reminders', e);
  }
}

// When the in-app alarm takes over, remove the system notification for the same reminder
// so its sound doesn't play on top.
export async function dismissDelivered(id) {
  if (!isNative) return;
  try {
    await LocalNotifications.removeDeliveredNotificationsById({ ids: [id] });
  } catch {
    /* already gone */
  }
}

// On sign-out: drop every reminder the OS is holding for this profile, so the next
// person to use the phone never sees someone else's task titles.
export async function clearScheduledReminders() {
  lastScheduled = '';
  lastDiary = '';
  if (!isNative) return;
  try {
    await cancelPending(() => true);
  } catch (e) {
    console.warn('Could not clear reminders', e);
  }
}

// handler receives the notification's extra: { kind: 'task', taskId } | { kind: 'diary', date }
export async function onNotificationTap(handler) {
  if (!isNative) return () => {};
  const sub = await LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const extra = a.notification?.extra || {};
    handler(extra.kind ? extra : { kind: 'task', taskId: extra.taskId });
  });
  return () => sub.remove();
}

// ---------- files ----------
export async function saveTextFile(filename, text, mime = 'application/json') {
  if (isNative) {
    const res = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: filename, url: res.uri, dialogTitle: 'Save your Ash Do backup' });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
