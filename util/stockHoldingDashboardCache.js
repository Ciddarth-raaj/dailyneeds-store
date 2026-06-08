const DB_NAME = "dailyneeds-store";
const DB_VERSION = 1;
const STORE_NAME = "stock-holding-dashboard-cache";
const LEGACY_STORAGE_PREFIX = "stock-holding-dashboard:";
const REFRESH_HOUR = 6;

let dbPromise = null;

export function getLocalDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameLocalDay(a, b) {
  return getLocalDayKey(a) === getLocalDayKey(b);
}

export function shouldRefreshFromApi(cached, now = new Date()) {
  if (!cached?.fetchedAt) return true;

  const fetchedAt = new Date(cached.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) return true;

  if (isSameLocalDay(fetchedAt, now)) return false;

  return now.getHours() >= REFRESH_HOUR;
}

function openDb() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "date" });
        }
      };
    });
  }

  return dbPromise;
}

function runStoreRequest(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) {
          resolve(null);
          return;
        }

        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);

        request.onsuccess = () => resolve(request.result ?? true);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function buildCachePayload(date, report) {
  return {
    date,
    fetchedAt: new Date().toISOString(),
    items: Array.isArray(report?.items) ? report.items : [],
    created_at: report?.created_at ?? null,
    stock_holding_report_id: report?.stock_holding_report_id ?? null,
    total: report?.total ?? null,
  };
}

function readLegacyLocalStorageCache(date) {
  if (typeof window === "undefined" || !date) return null;

  try {
    const raw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${date}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== date) return null;

    return parsed;
  } catch {
    return null;
  }
}

function clearLegacyLocalStorageCache(date) {
  if (typeof window === "undefined" || !date) return;
  try {
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${date}`);
  } catch {
    // ignore
  }
}

export async function readCachedReport(date) {
  if (!date) return null;

  try {
    const cached = await runStoreRequest("readonly", (store) => store.get(date));
    if (cached?.date === date) return cached;
  } catch {
    // fall through to legacy cache
  }

  const legacy = readLegacyLocalStorageCache(date);
  if (legacy) {
    try {
      await writeCachedReport(date, legacy);
      clearLegacyLocalStorageCache(date);
    } catch {
      // still return legacy data if migration write fails
    }
    return legacy;
  }

  return null;
}

export async function writeCachedReport(date, report) {
  if (!date) return false;

  const payload = buildCachePayload(date, report);

  try {
    await runStoreRequest("readwrite", (store) => store.put(payload));
    clearLegacyLocalStorageCache(date);
    return true;
  } catch {
    return false;
  }
}

export async function clearCachedReport(date) {
  if (!date) return;

  try {
    await runStoreRequest("readwrite", (store) => store.delete(date));
  } catch {
    // ignore
  }

  clearLegacyLocalStorageCache(date);
}

function clearAllLegacyLocalStorageCaches() {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export async function clearAllCachedReports() {
  try {
    await runStoreRequest("readwrite", (store) => store.clear());
  } catch {
    // ignore
  }

  clearAllLegacyLocalStorageCaches();
}

export async function hasFreshCachedReport(date, now = new Date()) {
  const cached = await readCachedReport(date);
  return Boolean(cached && !shouldRefreshFromApi(cached, now));
}
