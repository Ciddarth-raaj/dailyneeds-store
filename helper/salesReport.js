import API from "../util/api";
import {
  buildSalesDashboardDayChunks,
  mergeDailyTotalRows,
  mergeSalesFilterOptions,
  emptySalesFilterOptions,
  SALES_DASHBOARD_CHUNK_DAYS,
  SALES_DASHBOARD_FETCH_DAYS,
} from "../util/salesDashboard";

const SALES_DASHBOARD_TIMEOUT_MS = 180000;
export const SALES_DASHBOARD_ITEMS_PAGE_SIZE = 15000;
export const SALES_DASHBOARD_ITEMS_STREAM_PAGE_SIZE = 3500;

function isRequestAborted(err, signal) {
  return (
    signal?.aborted ||
    err?.code === "ERR_CANCELED" ||
    err?.name === "AbortError" ||
    err?.name === "CanceledError"
  );
}

function rejectUnlessAborted(reject, err, signal) {
  if (isRequestAborted(err, signal)) {
    reject(err);
    return true;
  }
  return false;
}

function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    out[key] = value;
  });
  return out;
}

export const getSalesDashboardMeta = (
  asOfDate,
  filters = {},
  { fromDate, toDate, signal } = {}
) => {
  return API.get("/sales-report/dashboard/meta", {
    params: cleanParams({
      as_of_date: asOfDate,
      from_date: fromDate,
      to_date: toDate,
      ...filters,
    }),
    signal,
    timeout: SALES_DASHBOARD_TIMEOUT_MS,
  }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw data;
  });
};

export async function streamSalesDashboardMeta(
  asOfDate,
  filters = {},
  {
    signal,
    onChunk,
    onProgress,
    totalDays = SALES_DASHBOARD_FETCH_DAYS,
    chunkDays = SALES_DASHBOARD_CHUNK_DAYS,
    buildChunks,
    mergeRows,
  } = {}
) {
  const chunks =
    buildChunks?.(asOfDate, totalDays, chunkDays) ??
    buildSalesDashboardDayChunks(asOfDate, totalDays, chunkDays);
  const merge =
    mergeRows ??
    ((existing, incoming) => mergeDailyTotalRows(existing, incoming));

  let dailyTotals = [];
  let coreMeta = null;

  for (let index = 0; index < chunks.length; index += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const chunk = chunks[index];
    const response = await getSalesDashboardMeta(asOfDate, filters, {
      fromDate: chunk.fromDate,
      toDate: chunk.toDate,
      signal,
    });

    if (response?.code !== 200) {
      throw response;
    }

    const batch = response?.data ?? {};
    if (!coreMeta) {
      coreMeta = {
        as_of_date: batch.as_of_date,
        selected_date_has_report: Boolean(batch.selected_date_has_report),
      };
    }

    dailyTotals = merge(dailyTotals, batch.daily_totals ?? []);

    const loadedDays = Math.min((index + 1) * chunkDays, totalDays);
    const progress = {
      loadedDays,
      totalDays,
      chunkIndex: index + 1,
      totalChunks: chunks.length,
      currentDate: chunk.fromDate,
      complete: index === chunks.length - 1,
    };

    onProgress?.(progress);
    onChunk?.({
      meta: {
        ...coreMeta,
        daily_totals: dailyTotals,
      },
      dailyTotals,
      chunk,
      progress,
    });
  }

  return {
    meta: {
      ...(coreMeta ?? {}),
      daily_totals: dailyTotals,
    },
    dailyTotals,
  };
}

export const getSalesDashboardFilterOptions = (
  asOfDate,
  filters = {},
  { fromDate, toDate, signal } = {}
) => {
  return API.get("/sales-report/dashboard/filter-options", {
    params: cleanParams({
      as_of_date: asOfDate,
      from_date: fromDate,
      to_date: toDate,
      ...filters,
    }),
    signal,
    timeout: SALES_DASHBOARD_TIMEOUT_MS,
  }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw data;
  });
};

export async function streamSalesDashboardFilterOptions(
  asOfDate,
  filters = {},
  {
    signal,
    onChunk,
    onProgress,
    totalDays = SALES_DASHBOARD_FETCH_DAYS,
    chunkDays = SALES_DASHBOARD_CHUNK_DAYS,
    buildChunks,
    mergeOptions,
  } = {}
) {
  const chunks =
    buildChunks?.(asOfDate, totalDays, chunkDays) ??
    buildSalesDashboardDayChunks(asOfDate, totalDays, chunkDays);
  const merge =
    mergeOptions ??
    ((existing, incoming) => mergeSalesFilterOptions(existing, incoming));

  let filterOptions = emptySalesFilterOptions();

  for (let index = 0; index < chunks.length; index += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const chunk = chunks[index];
    const response = await getSalesDashboardFilterOptions(asOfDate, filters, {
      fromDate: chunk.fromDate,
      toDate: chunk.toDate,
      signal,
    });

    if (response?.code !== 200) {
      throw response;
    }

    filterOptions = merge(
      filterOptions,
      response?.data?.filter_options ?? emptySalesFilterOptions()
    );

    const loadedDays = Math.min((index + 1) * chunkDays, totalDays);
    const progress = {
      loadedDays,
      totalDays,
      chunkIndex: index + 1,
      totalChunks: chunks.length,
      currentDate: chunk.fromDate,
      complete: index === chunks.length - 1,
    };

    onProgress?.(progress);
    onChunk?.({
      filterOptions,
      chunk,
      progress,
    });
  }

  return filterOptions;
}

export const getSalesDashboardItems = (
  date,
  filters = {},
  { limit = SALES_DASHBOARD_ITEMS_PAGE_SIZE, offset = 0, signal } = {}
) => {
  return API.get("/sales-report/dashboard/items", {
    params: cleanParams({
      date,
      limit,
      offset,
      ...filters,
    }),
    signal,
    timeout: SALES_DASHBOARD_TIMEOUT_MS,
  }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw data;
  });
};

export async function getAllSalesDashboardItems(
  date,
  filters = {},
  { signal, onProgress, onChunk, pageSize } = {}
) {
  const allItems = [];
  let offset = 0;
  let hasMore = true;
  let total = null;
  const limit = pageSize ?? SALES_DASHBOARD_ITEMS_PAGE_SIZE;

  while (hasMore) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const response = await getSalesDashboardItems(date, filters, {
      limit,
      offset,
      signal,
    });

    if (response?.code !== 200) {
      throw response;
    }

    const page = response?.data || {};
    const items = Array.isArray(page.items) ? page.items : [];
    allItems.push(...items);

    if (page.total != null) {
      total = page.total;
    }

    const progress = {
      loaded: allItems.length,
      total,
    };

    onProgress?.(progress);
    onChunk?.({
      items: [...allItems],
      progress,
    });

    hasMore = Boolean(page.has_more) && items.length > 0;
    offset += items.length;
    if (!items.length) break;
  }

  return allItems;
}
