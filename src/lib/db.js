// Ash Do local database: IndexedDB + Web Crypto. No network, no dependencies.
//
// Stores
//   users   { id, name, username, salt, keySalt, iterations, verifier, created_at, last_login, account_status }
//   records { id: `${user_id}|${kind}|${rid}`, user_id, kind, rid, iv, data, updated_at }  (data = AES-GCM ciphertext)
//   meta    { key, ... }  ('session' -> remembered sign-in on this device)
//
// Every record is encrypted with a key derived from the owner's password (PBKDF2 → AES-GCM 256).
// Passwords are never stored; only a salted PBKDF2 verifier is kept.

const DB_NAME = 'ashdo';
const DB_VERSION = 2; // v2: sign in with a username instead of an email
const ITERATIONS = 310000;

export class DBError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export const isSupported = () =>
  typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && Boolean(crypto.subtle) && window.isSecureContext !== false;

// ---------- usernames ----------
export const normalizeUsername = (u) => String(u || '').trim().toLowerCase();

export function validateUsername(u) {
  const n = normalizeUsername(u);
  if (n.length < 3) return 'Use at least 3 characters';
  if (n.length > 20) return 'Use 20 characters or fewer';
  if (!/^[a-z0-9._-]+$/.test(n)) return 'Use only letters, numbers, . _ or -';
  return '';
}

// v1 profiles signed in with an email. Give each one a unique username taken from
// the part before the @ (e.g. "ash@x.com" -> "ash", or "ash2" if that is taken).
function migrateToUsernames(store) {
  if (!store.indexNames.contains('username')) store.createIndex('username', 'username', { unique: true });
  if (store.indexNames.contains('email')) store.deleteIndex('email');
  const all = store.getAll();
  all.onsuccess = () => {
    const taken = new Set(all.result.map((u) => u.username).filter(Boolean));
    for (const u of all.result) {
      if (u.username) continue;
      let base = normalizeUsername(String(u.email || u.name || '').split('@')[0]).replace(/[^a-z0-9._-]/g, '').slice(0, 16);
      if (base.length < 3) base = (base + 'user').slice(0, 16);
      let name = base;
      for (let i = 2; taken.has(name); i++) name = `${base}${i}`;
      taken.add(name);
      u.username = name;
      delete u.email;
      store.put(u);
    }
  };
}

// ---------- IndexedDB plumbing ----------
let dbPromise = null;
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' }).createIndex('username', 'username', { unique: true });
      } else if (event.oldVersion < 2) {
        migrateToUsernames(req.transaction.objectStore('users'));
      }
      if (!db.objectStoreNames.contains('records')) {
        const records = db.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('user_id', 'user_id');
        records.createIndex('user_kind', ['user_id', 'kind']);
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(new DBError('Could not open local storage. Private browsing or blocked site data can prevent saving.', 'open'));
    };
    req.onblocked = () => reject(new DBError('Ash Do is open in another tab that needs to be closed first.', 'blocked'));
  });
  return dbPromise;
}

const request = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

// Runs fn inside one transaction; resolves after commit (atomic: all or nothing).
async function transact(stores, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let result;
    let tx;
    try {
      tx = db.transaction(stores, mode);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new DBError('Transaction aborted', 'abort'));
    Promise.resolve(fn(tx))
      .then((r) => (result = r))
      .catch((e) => {
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
        reject(e);
      });
  });
}

// ---------- crypto ----------
const enc = new TextEncoder();
const dec = new TextDecoder();
const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

async function baseKey(password) {
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}
async function verifierFor(password, salt, iterations) {
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, await baseKey(password), 256);
}
async function dataKeyFor(password, salt, iterations) {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    await baseKey(password),
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: the raw key can never be read back out
    ['encrypt', 'decrypt']
  );
}
const sameBytes = (a, b) => {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
};

async function encryptValue(key, value) {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv, data };
}
async function decryptValue(key, rec) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.data);
  return JSON.parse(dec.decode(plain));
}

// ---------- users ----------
const publicUser = (u) =>
  u && { id: u.id, name: u.name, username: u.username, created_at: u.created_at, last_login: u.last_login, account_status: u.account_status };

export function validatePassword(pw) {
  if (pw.length < 8) return 'Use at least 8 characters';
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return 'Mix letters and numbers';
  return '';
}

const newUserId = () => {
  const bytes = randomBytes(8);
  return 'u_' + Date.now().toString(36) + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export async function listUsers() {
  const users = await transact(['users'], 'readonly', (tx) => request(tx.objectStore('users').getAll()));
  return users.map(publicUser).sort((a, b) => String(b.last_login).localeCompare(String(a.last_login)));
}

export async function createUser({ name, username, password }) {
  const cleanUsername = normalizeUsername(username);
  const userErr = validateUsername(cleanUsername);
  if (userErr) throw new DBError(userErr, 'validation');
  // Display name defaults to the username ("ash" -> "Ash"); it can be changed in Settings.
  const cleanName = String(name || '').trim().slice(0, 40) || cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);
  const pwErr = validatePassword(password);
  if (pwErr) throw new DBError(pwErr, 'validation');

  const salt = randomBytes(16);
  const keySalt = randomBytes(16);
  const [verifier, key] = await Promise.all([verifierFor(password, salt, ITERATIONS), dataKeyFor(password, keySalt, ITERATIONS)]);
  const now = new Date().toISOString();
  const user = {
    id: newUserId(),
    name: cleanName,
    username: cleanUsername,
    salt,
    keySalt,
    iterations: ITERATIONS,
    verifier,
    created_at: now,
    last_login: now,
    account_status: 'active',
  };
  try {
    await transact(['users'], 'readwrite', (tx) => request(tx.objectStore('users').add(user)));
  } catch (e) {
    if (e?.name === 'ConstraintError') throw new DBError('That username is already taken on this device', 'exists');
    throw e;
  }
  return { user: publicUser(user), key };
}

async function getUserRaw(id) {
  return transact(['users'], 'readonly', (tx) => request(tx.objectStore('users').get(id)));
}

export async function verifyLogin(username, password) {
  const u = await transact(['users'], 'readonly', (tx) => request(tx.objectStore('users').index('username').get(normalizeUsername(username))));
  // Always run the KDF so timing doesn't reveal whether the username exists.
  const bits = await verifierFor(password, u?.salt || randomBytes(16), u?.iterations || ITERATIONS);
  if (!u || !sameBytes(bits, u.verifier)) throw new DBError('Incorrect username or password', 'auth');
  if (u.account_status !== 'active') throw new DBError('This profile is disabled', 'disabled');
  const key = await dataKeyFor(password, u.keySalt, u.iterations);
  u.last_login = new Date().toISOString();
  await transact(['users'], 'readwrite', (tx) => request(tx.objectStore('users').put(u)));
  return { user: publicUser(u), key };
}

export async function updateUserName(id, name) {
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) return null;
  return transact(['users'], 'readwrite', async (tx) => {
    const store = tx.objectStore('users');
    const u = await request(store.get(id));
    if (!u) throw new DBError('Profile not found', 'missing');
    u.name = clean;
    await request(store.put(u));
    return publicUser(u);
  });
}

// Re-encrypts every record with a key derived from the new password, atomically.
export async function changePassword(id, oldPassword, newPassword) {
  const u = await getUserRaw(id);
  if (!u) throw new DBError('Profile not found', 'missing');
  const bits = await verifierFor(oldPassword, u.salt, u.iterations);
  if (!sameBytes(bits, u.verifier)) throw new DBError('Current password is incorrect', 'auth');
  const pwErr = validatePassword(newPassword);
  if (pwErr) throw new DBError(pwErr, 'validation');
  const oldKey = await dataKeyFor(oldPassword, u.keySalt, u.iterations);
  const records = await transact(['records'], 'readonly', (tx) => request(tx.objectStore('records').index('user_id').getAll(id)));
  const salt = randomBytes(16);
  const keySalt = randomBytes(16);
  const [verifier, newKey] = await Promise.all([verifierFor(newPassword, salt, ITERATIONS), dataKeyFor(newPassword, keySalt, ITERATIONS)]);
  const reencrypted = [];
  for (const r of records) {
    const value = await decryptValue(oldKey, r);
    reencrypted.push({ ...r, ...(await encryptValue(newKey, value)) });
  }
  const updated = { ...u, salt, keySalt, verifier, iterations: ITERATIONS };
  await transact(['users', 'records', 'meta'], 'readwrite', async (tx) => {
    await request(tx.objectStore('users').put(updated));
    const store = tx.objectStore('records');
    for (const r of reencrypted) store.put(r);
    const session = await request(tx.objectStore('meta').get('session'));
    if (session?.user_id === id) tx.objectStore('meta').put({ ...session, cryptoKey: newKey });
  });
  return newKey;
}

export async function deleteUser(id) {
  await transact(['users', 'records', 'meta'], 'readwrite', async (tx) => {
    tx.objectStore('users').delete(id);
    const keys = await request(tx.objectStore('records').index('user_id').getAllKeys(id));
    const store = tx.objectStore('records');
    keys.forEach((k) => store.delete(k));
    const session = await request(tx.objectStore('meta').get('session'));
    if (session?.user_id === id) tx.objectStore('meta').delete('session');
  });
}

export async function wipeEverything() {
  const db = await openDB();
  db.close();
  dbPromise = null;
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
    req.onblocked = resolve;
  });
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

// ---------- session (stay signed in on this device) ----------
export async function saveSession(userId, key) {
  await transact(['meta'], 'readwrite', (tx) =>
    request(tx.objectStore('meta').put({ key: 'session', user_id: userId, cryptoKey: key, created_at: new Date().toISOString() }))
  );
}
export async function loadSession() {
  const s = await transact(['meta'], 'readonly', (tx) => request(tx.objectStore('meta').get('session')));
  if (!s?.cryptoKey) return null;
  const u = await getUserRaw(s.user_id);
  if (!u || u.account_status !== 'active') return null;
  return { user: publicUser(u), key: s.cryptoKey };
}
export async function clearSession() {
  await transact(['meta'], 'readwrite', (tx) => request(tx.objectStore('meta').delete('session')));
}

// ---------- per-user encrypted records ----------
const recordId = (userId, kind, rid) => `${userId}|${kind}|${rid}`;

export async function loadUserData(userId, key) {
  const records = await transact(['records'], 'readonly', (tx) => request(tx.objectStore('records').index('user_id').getAll(userId)));
  const out = { tasks: [], sessions: [], kv: {}, unreadable: 0 };
  for (const r of records) {
    if (r.user_id !== userId) continue; // defence in depth
    try {
      const value = await decryptValue(key, r);
      if (r.kind === 'task') out.tasks.push(value);
      else if (r.kind === 'session') out.sessions.push(value);
      else if (r.kind === 'kv') out.kv[r.rid] = value;
    } catch {
      out.unreadable += 1;
    }
  }
  return out;
}

// puts: [{ kind, rid, value }], deletes: [{ kind, rid }] — encrypted first, then written in ONE transaction.
export async function writeRecords(userId, key, puts = [], deletes = []) {
  if (!puts.length && !deletes.length) return;
  const now = new Date().toISOString();
  const prepared = [];
  for (const p of puts) {
    prepared.push({ id: recordId(userId, p.kind, p.rid), user_id: userId, kind: p.kind, rid: p.rid, updated_at: now, ...(await encryptValue(key, p.value)) });
  }
  await transact(['records'], 'readwrite', (tx) => {
    const store = tx.objectStore('records');
    prepared.forEach((r) => store.put(r));
    deletes.forEach((d) => store.delete(recordId(userId, d.kind, d.rid)));
  });
}

// Replace all of a user's records (used by "restore backup → replace").
export async function replaceUserData(userId, key, puts) {
  const prepared = [];
  const now = new Date().toISOString();
  for (const p of puts) {
    prepared.push({ id: recordId(userId, p.kind, p.rid), user_id: userId, kind: p.kind, rid: p.rid, updated_at: now, ...(await encryptValue(key, p.value)) });
  }
  await transact(['records'], 'readwrite', async (tx) => {
    const store = tx.objectStore('records');
    const keys = await request(store.index('user_id').getAllKeys(userId));
    keys.forEach((k) => store.delete(k));
    prepared.forEach((r) => store.put(r));
  });
}

export async function storageInfo() {
  const info = { persisted: false, usage: 0, quota: 0 };
  try {
    if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) Object.assign(info, await navigator.storage.estimate());
  } catch {
    /* unsupported */
  }
  return info;
}
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* unsupported */
  }
  return false;
}
