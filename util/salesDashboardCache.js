import { addDays, formatDateKey } from "./salesDashboard";
import {
  runSalesDashboardStoreRequest,
  SALES_DASHBOARD_STORE_NAME,
} from "./stockHoldingDashboardCache";

const SALES_DAY_ENTRY_PREFIX = "sales-day__";
const SALES_META_ENTRY_ID = "sales-dashboard-meta";
const SALES_PRUNE_MARKER_KEY = "sales-dashboard-last-prune-date";

export function buildSalesDayCacheId(salesDate) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return "";
  return `${SALES_DAY_ENTRY_PREFIX}${dateKey}`;
}

export function parseSalesDayCacheId(id) {
  if (!id || !String(id).startsWith(SALES_DAY_ENTRY_PREFIX)) return "";
  return String(id).slice(SALES_DAY_ENTRY_PREFIX.length);
}

export function buildSalesDayCacheEntry(salesDate, items = []) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return null;

  return {
    id: buildSalesDayCacheId(dateKey),
    type: "day",
    salesDate: dateKey,
    fetchedAt: new Date().toISOString(),
    items: Array.isArray(items) ? items : [],
  };
}

export async function readSalesDashboardItemsForDate(salesDate) {
  const id = buildSalesDayCacheId(salesDate);
  if (!id) return undefined;

  try {
    const cached = await runSalesDashboardStoreRequest("readonly", (store) =>
      store.get(id)
    );
    if (!cached || cached.id !== id) return undefined;
    return Array.isArray(cached.items) ? cached.items : [];
  } catch {
    return undefined;
  }
}

export async function writeSalesDashboardItemsForDate(salesDate, items = []) {
  const entry = buildSalesDayCacheEntry(salesDate, items);
  if (!entry?.id) return false;

  try {
    await runSalesDashboardStoreRequest("readwrite", (store) => store.put(entry));
    return true;
  } catch {
    return false;
  }
}

export async function readSalesDashboardMetaRecord() {
  try {
    const cached = await runSalesDashboardStoreRequest("readonly", (store) =>
      store.get(SALES_META_ENTRY_ID)
    );
    if (!cached || cached.id !== SALES_META_ENTRY_ID) return null;
    return cached;
  } catch {
    return null;
  }
}

export async function writeSalesDashboardMetaRecord(meta = {}) {
  try {
    await runSalesDashboardStoreRequest("readwrite", (store) =>
      store.put({
        id: SALES_META_ENTRY_ID,
        type: "meta",
        fetchedAt: new Date().toISOString(),
        ...meta,
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function deleteEntriesWhere(predicate) {
  if (typeof window === "undefined" || !window.indexedDB) return;

  try {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("dailyneeds-store", 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SALES_DASHBOARD_STORE_NAME)) {
          db.close();
          resolve();
          return;
        }

        const tx = db.transaction(SALES_DASHBOARD_STORE_NAME, "readwrite");
        const store = tx.objectStore(SALES_DASHBOARD_STORE_NAME);
        const cursorReq = store.openCursor();

        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return;
          if (predicate(cursor.value)) {
            cursor.delete();
          }
          cursor.continue();
        };

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        cursorReq.onerror = () => reject(cursorReq.error);
      };
    });
  } catch {
    // ignore
  }
}

export async function listCachedSalesDayDates() {
  if (typeof window === "undefined" || !window.indexedDB) return [];

  try {
    const dates = await new Promise((resolve, reject) => {
      const request = indexedDB.open("dailyneeds-store", 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SALES_DASHBOARD_STORE_NAME)) {
          db.close();
          resolve([]);
          return;
        }

        const tx = db.transaction(SALES_DASHBOARD_STORE_NAME, "readonly");
        const store = tx.objectStore(SALES_DASHBOARD_STORE_NAME);
        const cursorReq = store.openCursor();
        const found = [];

        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return;
          const value = cursor.value;
          if (value?.type === "day" && value?.salesDate) {
            found.push(value.salesDate);
          }
          cursor.continue();
        };

        tx.oncomplete = () => {
          db.close();
          resolve(found);
        };
        tx.onerror = () => reject(tx.error);
        cursorReq.onerror = () => reject(cursorReq.error);
      };
    });

    return Array.from(new Set(dates)).sort();
  } catch {
    return [];
  }
}

export function getLastSalesCachePruneDate() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SALES_PRUNE_MARKER_KEY) || "";
  } catch {
    return "";
  }
}

export function setLastSalesCachePruneDate(dateKey) {
  if (typeof window === "undefined" || !dateKey) return;
  try {
    window.localStorage.setItem(SALES_PRUNE_MARKER_KEY, dateKey);
  } catch {
    // ignore
  }
}

export async function pruneSalesDashboardCacheToLastNDays({
  keepDays = 60,
  asOfDate,
} = {}) {
  const asOf = formatDateKey(asOfDate ?? new Date());
  if (!asOf || keepDays <= 0) return;

  const cutoffDate = addDays(asOf, -(keepDays - 1));

  await deleteEntriesWhere((entry) => {
    if (entry?.type !== "day" || !entry?.salesDate) return false;
    return entry.salesDate < cutoffDate;
  });
}

export async function runDailySalesCachePruneIfNeeded({
  keepDays = 60,
  asOfDate,
} = {}) {
  const today = formatDateKey(asOfDate ?? new Date());
  if (!today) return;

  const lastPruneDate = getLastSalesCachePruneDate();
  if (lastPruneDate === today) return;

  await pruneSalesDashboardCacheToLastNDays({ keepDays, asOfDate: today });
  setLastSalesCachePruneDate(today);
}

export async function clearAllSalesDashboardCache() {
  await deleteEntriesWhere((entry) => entry?.type === "day" || entry?.type === "meta");
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SALES_PRUNE_MARKER_KEY);
    } catch {
      // ignore
    }
  }
}
