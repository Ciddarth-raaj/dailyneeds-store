import {
  buildSalesDashboardCacheId,
  buildSalesDashboardFiltersFromContext,
  buildSalesDashboardStats,
  buildSalesFilterCacheKey,
  buildSalesStockFilterCacheKey,
  formatDateKey,
} from "./salesDashboard";
import {
  runSalesDashboardStoreRequest,
  SALES_DASHBOARD_STORE_NAME,
} from "./stockHoldingDashboardCache";

export { buildSalesDashboardCacheId };

export function buildSalesDashboardCacheEntry({
  salesDate,
  dashboardFilters = {},
  bundle,
  items = [],
  displayItems = [],
}) {
  const dateKey = formatDateKey(salesDate);
  const salesFilters = buildSalesDashboardFiltersFromContext(dashboardFilters);
  const salesFilterKey = buildSalesFilterCacheKey(salesFilters);
  const stockFilterKey = buildSalesStockFilterCacheKey(dashboardFilters);
  const id = buildSalesDashboardCacheId(dateKey, dashboardFilters);

  return {
    id,
    salesDate: dateKey,
    salesFilterKey,
    stockFilterKey,
    fetchedAt: new Date().toISOString(),
    bundle: bundle ?? null,
    items: Array.isArray(items) ? items : [],
    displayItems: Array.isArray(displayItems) ? displayItems : [],
    stats: buildSalesDashboardStats(bundle, dateKey, displayItems),
  };
}

export async function readSalesDashboardCache(id) {
  if (!id) return null;

  try {
    const cached = await runSalesDashboardStoreRequest("readonly", (store) =>
      store.get(id)
    );
    if (cached?.id === id) return cached;
  } catch {
    // ignore
  }

  return null;
}

export async function readSalesDashboardItemsForDate(
  salesDate,
  dashboardFilters = {}
) {
  const id = buildSalesDashboardCacheId(salesDate, dashboardFilters);
  const cached = await readSalesDashboardCache(id);
  if (!cached) return undefined;
  return Array.isArray(cached.items) ? cached.items : [];
}

export async function writeSalesDashboardCache(entry) {
  if (!entry?.id) return false;

  try {
    await runSalesDashboardStoreRequest("readwrite", (store) => store.put(entry));
    return true;
  } catch {
    return false;
  }
}

export async function writeSalesDashboardItemsForDate(
  salesDate,
  dashboardFilters = {},
  items = []
) {
  const id = buildSalesDashboardCacheId(salesDate, dashboardFilters);
  if (!id) return false;

  const existing = await readSalesDashboardCache(id);
  const entry = buildSalesDashboardCacheEntry({
    salesDate,
    dashboardFilters,
    bundle: existing?.bundle ?? null,
    items,
    displayItems: existing?.displayItems ?? items,
  });

  return writeSalesDashboardCache(entry);
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

export async function purgeSalesDashboardCacheExceptDate(salesDate) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return;
  await deleteEntriesWhere((entry) => entry?.salesDate !== dateKey);
}

export async function clearSalesDashboardCacheForDate(salesDate) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return;
  await deleteEntriesWhere((entry) => entry?.salesDate === dateKey);
}

export async function clearAllSalesDashboardCache() {
  await deleteEntriesWhere(() => true);
}
