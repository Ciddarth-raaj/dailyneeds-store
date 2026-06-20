import {
  filterStockHoldingRows,
  getStockAvailabilityKey,
  STOCK_AVAILABILITY_KEYS,
} from "./stockHoldingDashboard";
import { formatCurrency } from "./string";

export const SALES_DASHBOARD_WINDOW_DAYS = 30;
export const SALES_DASHBOARD_MAX_ROLLING_DAYS = 30;
/** Longest MTD span: prior-month day 1 through day 31 of a 31-day month. */
export const SALES_DASHBOARD_MTD_MAX_SPAN_DAYS = 62;
/** Max rolling window compares N days vs the prior N days (2N). */
export const SALES_DASHBOARD_FETCH_DAYS = Math.max(
  SALES_DASHBOARD_MAX_ROLLING_DAYS * 2,
  SALES_DASHBOARD_MTD_MAX_SPAN_DAYS
);
export const SALES_DASHBOARD_CHUNK_DAYS = 7;

export function getSalesDashboardChunkCount(
  totalDays = SALES_DASHBOARD_FETCH_DAYS,
  chunkDays = SALES_DASHBOARD_CHUNK_DAYS
) {
  if (!totalDays || !chunkDays) return 0;
  return Math.ceil(totalDays / chunkDays);
}

export function roundSalesMetric(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

export function computeProfitPct(profit, salesAmount) {
  const amount = roundSalesMetric(salesAmount);
  if (amount === 0) return null;
  return roundSalesMetric((Number(profit ?? 0) / amount) * 100);
}

export function formatSalesQtyDisplay(value) {
  if (value === null || value === undefined) return "—";
  return roundSalesMetric(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSalesCurrency(value) {
  return formatCurrency(roundSalesMetric(value));
}

export function formatProfitPctDisplay(profit, salesAmount) {
  const pct = computeProfitPct(profit, salesAmount);
  if (pct == null) return "—";
  return `${pct.toFixed(2)}%`;
}

export function formatProfitWithPct(profit, salesAmount) {
  const formatted = formatCurrency(roundSalesMetric(profit));
  const pct = computeProfitPct(profit, salesAmount);
  if (pct == null) return formatted;
  return `${formatted} (${pct.toFixed(2)}%)`;
}

const FILTER_OPTION_KEYS = [
  "branchOptions",
  "buyerOptions",
  "supplierOptions",
  "distributorOptions",
  "departmentOptions",
  "categoryOptions",
  "subcategoryOptions",
  "purchaseTypeOptions",
  "chainLevelOptions",
];

export function emptySalesFilterOptions() {
  return FILTER_OPTION_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

function mergeFilterOptionLists(existing = [], incoming = []) {
  const map = new Map();
  [...existing, ...incoming].forEach((option) => {
    if (option?.value == null || option?.value === "") return;
    map.set(String(option.value), option);
  });
  return Array.from(map.values()).sort((a, b) =>
    String(a.label ?? "").localeCompare(String(b.label ?? ""))
  );
}

export function mergeSalesFilterOptions(existing = {}, incoming = {}) {
  return FILTER_OPTION_KEYS.reduce((acc, key) => {
    acc[key] = mergeFilterOptionLists(existing[key], incoming[key]);
    return acc;
  }, {});
}

function formatDateKey(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return "";
  return formatDateKey(dt);
}

function addDays(dateStr, days) {
  const dt = new Date(`${dateStr}T12:00:00`);
  dt.setDate(dt.getDate() + days);
  return formatDateKey(dt);
}

function toCsvParam(values) {
  if (!Array.isArray(values) || !values.length) return undefined;
  return values.map((value) => String(value)).join(",");
}

export function buildSalesFilterParams(dashboardFilters = {}) {
  return {
    branch_ids: toCsvParam(dashboardFilters.branchFilter),
    buyer_ids: toCsvParam(dashboardFilters.buyerFilter),
    supplier_ids: toCsvParam(dashboardFilters.supplierFilter),
    distributor_ids: toCsvParam(dashboardFilters.distributorFilter),
    department_ids: toCsvParam(dashboardFilters.departmentFilter),
    category_ids: toCsvParam(dashboardFilters.categoryFilter),
    subcategory_ids: toCsvParam(dashboardFilters.subcategoryFilter),
    purchase_types: toCsvParam(dashboardFilters.purchaseTypeFilter),
    chain_levels: toCsvParam(dashboardFilters.chainLevelFilter),
  };
}

export function buildSalesDashboardFiltersFromContext(contextFilters = {}) {
  const {
    branchFilter,
    buyerFilter,
    supplierFilter,
    distributorFilter,
    departmentFilter,
    categoryFilter,
    subcategoryFilter,
    purchaseTypeFilter,
    chainLevelFilter,
  } = contextFilters;

  return {
    branchFilter: branchFilter || [],
    buyerFilter: buyerFilter || [],
    supplierFilter: supplierFilter || [],
    distributorFilter: distributorFilter || [],
    departmentFilter: departmentFilter || [],
    categoryFilter: categoryFilter || [],
    subcategoryFilter: subcategoryFilter || [],
    purchaseTypeFilter: purchaseTypeFilter || [],
    chainLevelFilter: chainLevelFilter || [],
  };
}

export function buildSalesFilterCacheKey(filters = {}) {
  return JSON.stringify(buildSalesFilterParams(filters));
}

export function buildSalesStockFilterCacheKey(dashboardFilters = {}) {
  return JSON.stringify({
    statusFilter: dashboardFilters?.statusFilter ?? [],
    stockAvailabilityFilter: dashboardFilters?.stockAvailabilityFilter ?? [],
    showLowStock: Boolean(dashboardFilters?.showLowStock),
  });
}

export function buildSalesDashboardCacheId(salesDate, dashboardFilters = {}) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return "";
  const salesFilters = buildSalesDashboardFiltersFromContext(dashboardFilters);
  const salesFilterKey = buildSalesFilterCacheKey(salesFilters);
  const stockFilterKey = buildSalesStockFilterCacheKey(dashboardFilters);
  return `${dateKey}__${salesFilterKey}__${stockFilterKey}`;
}

function emptyDayTotals() {
  return { sold_qty: 0, sold_value: 0, sold_profit: 0, row_count: 0 };
}

function formatDateDisplayShort(value) {
  const key = formatDateKey(value);
  if (!key) return "—";
  const dt = new Date(`${key}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return key;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function sumDailyRange(dailyMap, startDate, endDate) {
  let sold_qty = 0;
  let sold_value = 0;
  let sold_profit = 0;
  let row_count = 0;

  let cursor = startDate;
  while (cursor <= endDate) {
    const row = dailyMap.get(cursor);
    if (row) {
      sold_qty += row.sold_qty;
      sold_value += row.sold_value;
      sold_profit += row.sold_profit;
      row_count += row.row_count;
    }
    cursor = addDays(cursor, 1);
  }

  return { sold_qty, sold_value, sold_profit, row_count };
}

function computeWindowSummaryFromDailyTotals(dailyTotals, asOfDate, days) {
  const dateKey = formatDateKey(asOfDate);
  if (!dateKey || !days) return null;

  const dailyMap = buildDailyMap(dailyTotals);
  const currentStart = addDays(dateKey, -(days - 1));
  const priorEnd = addDays(currentStart, -1);
  const priorStart = addDays(priorEnd, -(days - 1));

  const current = sumDailyRange(dailyMap, currentStart, dateKey);
  const prior = sumDailyRange(dailyMap, priorStart, priorEnd);

  const delta_qty = current.sold_qty - prior.sold_qty;
  const delta_value = current.sold_value - prior.sold_value;
  const delta_profit = current.sold_profit - prior.sold_profit;

  return {
    days,
    current,
    prior,
    delta_qty,
    delta_value,
    delta_profit,
    delta_qty_pct:
      prior.sold_qty !== 0 ? (delta_qty / prior.sold_qty) * 100 : null,
    delta_value_pct:
      prior.sold_value !== 0 ? (delta_value / prior.sold_value) * 100 : null,
    delta_profit_pct:
      prior.sold_profit !== 0 ? (delta_profit / prior.sold_profit) * 100 : null,
  };
}

function resolveWindowSummary(windowSummaries, dailyTotals, salesDate, days) {
  return (
    getWindowSummary(windowSummaries, days) ??
    computeWindowSummaryFromDailyTotals(dailyTotals, salesDate, days)
  );
}

export function buildSalesDashboardDayChunks(
  asOfDate,
  totalDays = SALES_DASHBOARD_FETCH_DAYS,
  chunkDays = SALES_DASHBOARD_CHUNK_DAYS
) {
  const asOf = formatDateKey(asOfDate);
  if (!asOf || totalDays <= 0) return [];

  const chunks = [];
  let offsetFromEnd = 0;

  while (offsetFromEnd < totalDays) {
    const size = Math.min(chunkDays, totalDays - offsetFromEnd);
    const toDate = addDays(asOf, -offsetFromEnd);
    const fromDate = addDays(asOf, -(offsetFromEnd + size - 1));
    chunks.push({ fromDate, toDate, dayCount: size });
    offsetFromEnd += size;
  }

  return chunks;
}

export function mergeDailyTotalRows(existing = [], incoming = []) {
  const map = new Map();

  (existing || []).forEach((row) => {
    const key = formatDateKey(row?.date);
    if (!key) return;
    map.set(key, {
      date: key,
      sold_qty: Number(row?.sold_qty ?? 0),
      sold_value: Number(row?.sold_value ?? 0),
      sold_profit: Number(row?.sold_profit ?? 0),
      row_count: Number(row?.row_count ?? 0),
    });
  });

  (incoming || []).forEach((row) => {
    const key = formatDateKey(row?.date);
    if (!key) return;
    map.set(key, {
      date: key,
      sold_qty: Number(row?.sold_qty ?? 0),
      sold_value: Number(row?.sold_value ?? 0),
      sold_profit: Number(row?.sold_profit ?? 0),
      row_count: Number(row?.row_count ?? 0),
    });
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildSalesDashboardStats(bundle, salesDate, displayItems = []) {
  const dailyTotals = bundle?.daily_totals ?? [];
  const windowSummaries = bundle?.window_summaries ?? {};

  return {
    todaySummary: computeTodaySummary(dailyTotals, salesDate),
    monthSummary: computeMonthSummary(dailyTotals, salesDate),
    window7: resolveWindowSummary(windowSummaries, dailyTotals, salesDate, 7),
    window15: resolveWindowSummary(windowSummaries, dailyTotals, salesDate, 15),
    window30: resolveWindowSummary(windowSummaries, dailyTotals, salesDate, 30),
    lineChartData: buildLineChartData(dailyTotals, salesDate),
    cumulativeRows: computeCumulativeRows(dailyTotals, salesDate),
    soldUnsoldBarData: computeSoldUnsoldBarData(displayItems),
  };
}

function buildDailyMap(dailyTotals = []) {
  const map = new Map();
  (dailyTotals || []).forEach((row) => {
    const key = formatDateKey(row?.date);
    if (!key) return;
    map.set(key, {
      sold_qty: Number(row?.sold_qty ?? 0),
      sold_value: Number(row?.sold_value ?? 0),
      sold_profit: Number(row?.sold_profit ?? 0),
      row_count: Number(row?.row_count ?? 0),
    });
  });
  return map;
}

export function buildLineChartData(
  dailyTotals,
  asOfDate,
  windowDays = SALES_DASHBOARD_WINDOW_DAYS
) {
  const endDate = formatDateKey(asOfDate);
  if (!endDate) return [];

  const dailyMap = buildDailyMap(dailyTotals);
  const startDate = addDays(endDate, -(windowDays - 1));
  const rows = [];

  let cursor = startDate;
  while (cursor <= endDate) {
    const row = dailyMap.get(cursor) || emptyDayTotals();
    rows.push({
      date: cursor,
      sold_qty: row.sold_qty,
      sold_value: row.sold_value,
      sold_profit: row.sold_profit,
      row_count: row.row_count,
    });
    cursor = addDays(cursor, 1);
  }

  return rows;
}

export function computeCumulativeRows(
  dailyTotals,
  asOfDate,
  windowDays = SALES_DASHBOARD_WINDOW_DAYS
) {
  const chartRows = buildLineChartData(dailyTotals, asOfDate, windowDays);
  let cumulativeQty = 0;
  let cumulativeValue = 0;
  let cumulativeProfit = 0;

  return chartRows.map((row) => {
    cumulativeQty += row.sold_qty;
    cumulativeValue += row.sold_value;
    cumulativeProfit += row.sold_profit;
    const sold_qty = roundSalesMetric(row.sold_qty);
    const sold_value = roundSalesMetric(row.sold_value);
    const sold_profit = roundSalesMetric(row.sold_profit);
    const cumulative_qty = roundSalesMetric(cumulativeQty);
    const cumulative_value = roundSalesMetric(cumulativeValue);
    const cumulative_profit = roundSalesMetric(cumulativeProfit);
    return {
      ...row,
      sold_qty,
      sold_value,
      sold_profit,
      sold_profit_pct: computeProfitPct(sold_profit, sold_value),
      cumulative_qty,
      cumulative_value,
      cumulative_profit,
      cumulative_profit_pct: computeProfitPct(cumulative_profit, cumulative_value),
    };
  });
}

export function formatDeltaDisplay(currentValue, deltaValue, deltaPct) {
  const current = Number(currentValue ?? 0);
  const delta = Number(deltaValue ?? 0);
  const pct = deltaPct == null ? null : Number(deltaPct);
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const pctLabel =
    pct != null && !Number.isNaN(pct)
      ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
      : null;

  return {
    current,
    delta,
    pct,
    direction,
    pctLabel,
    absLabel: `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`,
    label: pctLabel
      ? `${delta >= 0 ? "+" : ""}${delta.toLocaleString()} (${pctLabel})`
      : `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`,
  };
}

export function computeTodaySummary(dailyTotals, asOfDate) {
  const dateKey = formatDateKey(asOfDate);
  if (!dateKey) return null;

  const dailyMap = buildDailyMap(dailyTotals);
  const priorDate = addDays(dateKey, -1);
  const emptyDay = emptyDayTotals();

  const current = dailyMap.get(dateKey) || emptyDay;
  const prior = dailyMap.get(priorDate) || emptyDay;

  const delta_qty = current.sold_qty - prior.sold_qty;
  const delta_value = current.sold_value - prior.sold_value;
  const delta_profit = current.sold_profit - prior.sold_profit;
  const delta_qty_pct =
    prior.sold_qty !== 0 ? (delta_qty / prior.sold_qty) * 100 : null;
  const delta_value_pct =
    prior.sold_value !== 0 ? (delta_value / prior.sold_value) * 100 : null;
  const delta_profit_pct =
    prior.sold_profit !== 0 ? (delta_profit / prior.sold_profit) * 100 : null;

  return {
    days: 1,
    current,
    prior,
    delta_qty,
    delta_value,
    delta_profit,
    delta_qty_pct,
    delta_value_pct,
    delta_profit_pct,
    periodSubtitle: formatDateDisplay(dateKey),
  };
}

export function computeMonthSummary(dailyTotals, asOfDate) {
  const dateKey = formatDateKey(asOfDate);
  if (!dateKey) return null;

  const asOf = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(asOf.getTime())) return null;

  const currentStart = `${dateKey.slice(0, 7)}-01`;
  const dailyMap = buildDailyMap(dailyTotals);
  const current = sumDailyRange(dailyMap, currentStart, dateKey);

  const priorMonthStart = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1);
  const daysInPriorMonth = new Date(
    asOf.getFullYear(),
    asOf.getMonth(),
    0
  ).getDate();
  const priorDay = Math.min(asOf.getDate(), daysInPriorMonth);
  const priorStart = formatDateKey(priorMonthStart);
  const priorEnd = formatDateKey(
    new Date(
      priorMonthStart.getFullYear(),
      priorMonthStart.getMonth(),
      priorDay
    )
  );
  const prior = sumDailyRange(dailyMap, priorStart, priorEnd);

  const delta_qty = current.sold_qty - prior.sold_qty;
  const delta_value = current.sold_value - prior.sold_value;
  const delta_profit = current.sold_profit - prior.sold_profit;

  const monthLabel = asOf.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return {
    days: asOf.getDate(),
    current,
    prior,
    delta_qty,
    delta_value,
    delta_profit,
    delta_qty_pct:
      prior.sold_qty !== 0 ? (delta_qty / prior.sold_qty) * 100 : null,
    delta_value_pct:
      prior.sold_value !== 0 ? (delta_value / prior.sold_value) * 100 : null,
    delta_profit_pct:
      prior.sold_profit !== 0 ? (delta_profit / prior.sold_profit) * 100 : null,
    periodLabel: monthLabel,
    periodSubtitle: `${formatDateDisplayShort(currentStart)} – ${formatDateDisplayShort(dateKey)} vs ${formatDateDisplayShort(priorStart)} – ${formatDateDisplayShort(priorEnd)}`,
  };
}

export function getWindowSummary(windowSummaries, days) {
  return windowSummaries?.[String(days)] ?? null;
}

export const SALES_GROUP_BY_CONFIG = {
  branch: {
    idKey: "branch_id",
    nameKey: "branch_name",
    unknownLabel: "Unknown Branch",
  },
  department: {
    idKey: "department_id",
    nameKey: "department_name",
    unknownLabel: "Unknown Department",
  },
  category: {
    idKey: "category_id",
    nameKey: "category_name",
    unknownLabel: "Unknown Category",
  },
  subcategory: {
    idKey: "subcategory_id",
    nameKey: "subcategory_name",
    unknownLabel: "Unknown Subcategory",
  },
  buyer: {
    getGroupKey: (item) => {
      if (item?.buyer_id != null && String(item.buyer_id).trim() !== "") {
        return `buyer:${item.buyer_id}`;
      }
      const name = String(item?.buyer_name ?? "").trim();
      return name ? `buyer-name:${name.toLowerCase()}` : "unknown";
    },
    getGroupName: (item) => {
      const name = String(item?.buyer_name ?? "").trim();
      if (name) return name;
      if (item?.buyer_id != null && String(item.buyer_id).trim() !== "") {
        return String(item.buyer_id);
      }
      return "Unknown Buyer";
    },
    unknownLabel: "Unknown Buyer",
  },
  distributor: {
    getGroupKey: (item) => {
      if (item?.distributor_id != null && String(item.distributor_id).trim() !== "") {
        return `distributor:${item.distributor_id}`;
      }
      const name = String(item?.distributor_name ?? "").trim();
      return name ? `distributor-name:${name.toLowerCase()}` : "unknown";
    },
    getGroupName: (item) => {
      const name = String(item?.distributor_name ?? "").trim();
      if (name) return name;
      if (item?.distributor_id != null && String(item.distributor_id).trim() !== "") {
        return String(item.distributor_id);
      }
      return "Unknown Distributor";
    },
    unknownLabel: "Unknown Distributor",
  },
};

function resolveGroupIdentity(item, config) {
  if (typeof config.getGroupKey === "function") {
    return {
      groupKey: config.getGroupKey(item),
      groupName:
        (typeof config.getGroupName === "function"
          ? config.getGroupName(item)
          : item?.[config.nameKey]) || config.unknownLabel,
    };
  }

  const rawId = item?.[config.idKey];
  const groupKey = rawId == null ? "unknown" : String(rawId);
  const groupName =
    item?.[config.nameKey] ||
    (rawId != null ? String(rawId) : config.unknownLabel);

  return { groupKey, groupName };
}

export function computeSalesGroupedRows(items = [], groupBy = "branch") {
  const config = SALES_GROUP_BY_CONFIG[groupBy];
  if (!config) return [];

  const grouped = new Map();

  (items || []).forEach((item) => {
    const { groupKey, groupName } = resolveGroupIdentity(item, config);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        group_key: groupKey,
        group_name: groupName,
        sold_qty: 0,
        sold_value: 0,
        sold_profit: 0,
        item_count: 0,
        items: [],
      });
    }

    const row = grouped.get(groupKey);
    if (item?.sold_qty != null) {
      row.sold_qty += Number(item.sold_qty);
    }
    if (item?.sold_value != null) {
      row.sold_value += Number(item.sold_value);
    }
    if (item?.sold_profit != null) {
      row.sold_profit += Number(item.sold_profit);
    }
    row.item_count += 1;
    row.items.push(item);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      sold_qty: roundSalesMetric(row.sold_qty),
      sold_value: roundSalesMetric(row.sold_value),
      sold_profit: roundSalesMetric(row.sold_profit),
      sold_profit_pct: computeProfitPct(row.sold_profit, row.sold_value),
    }))
    .sort((a, b) => {
      const valueDelta = b.sold_value - a.sold_value;
      if (valueDelta !== 0) return valueDelta;
      return b.item_count - a.item_count;
    });
}

export function getStockHoldingDateForSalesDate(salesDate) {
  const salesDateKey = formatDateKey(salesDate);
  if (!salesDateKey) return "";
  return addDays(salesDateKey, 1);
}

export async function resolveStockRowsForSalesDate(
  salesDate,
  getStockRowsForDate,
  { signal } = {}
) {
  if (typeof getStockRowsForDate !== "function") return [];

  const primaryDate = getStockHoldingDateForSalesDate(salesDate);
  const fallbackDate = formatDateKey(salesDate);

  const loadRows = async (date) => {
    if (!date) return [];
    try {
      const rows = await getStockRowsForDate(date, { signal });
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  };

  let rows = await loadRows(primaryDate);
  if (!rows.length && fallbackDate && fallbackDate !== primaryDate) {
    rows = await loadRows(fallbackDate);
  }

  return rows;
}

export function buildSalesItemKey(item) {
  const productId = item?.product_id;
  const branchId = item?.branch_id;
  if (productId == null || branchId == null) return null;
  return `${String(productId)}__${String(branchId)}`;
}

export function filterAvailableStockForSales(stockRows = [], dashboardFilters = {}) {
  const filtered = filterStockHoldingRows(stockRows, dashboardFilters);
  return filtered.filter((row) => {
    const availabilityKey = getStockAvailabilityKey(row);
    return availabilityKey !== STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK;
  });
}

export function stockRowToUnsoldSalesItem(stockRow) {
  return {
    product_id: stockRow?.product_id ?? null,
    product_name: stockRow?.product_name ?? null,
    product_image:
      stockRow?.product_image ?? stockRow?.image_url ?? stockRow?.image ?? null,
    branch_id: stockRow?.branch_id ?? null,
    branch_name: stockRow?.branch_name ?? stockRow?.branch_label ?? null,
    buyer_name: stockRow?.buyer_name ?? stockRow?.buyer_label ?? null,
    department_id: stockRow?.department_id ?? null,
    department_name: stockRow?.department_name ?? stockRow?.department_label ?? null,
    category_id: stockRow?.category_id ?? null,
    category_name: stockRow?.category_name ?? stockRow?.category_label ?? null,
    subcategory_id: stockRow?.subcategory_id ?? null,
    subcategory_name:
      stockRow?.subcategory_name ?? stockRow?.subcategory_label ?? null,
    supplier_name: stockRow?.supplier_name ?? stockRow?.supplier_label ?? null,
    distributor_name:
      stockRow?.distributor_name ?? stockRow?.distributor_label ?? null,
    sold_qty: null,
    sold_value: null,
    sold_profit: null,
    is_unsold: true,
  };
}

export function mergeSalesItemsWithUnsoldStock(salesItems = [], stockRows = []) {
  const soldKeys = new Set();
  (salesItems || []).forEach((item) => {
    const key = buildSalesItemKey(item);
    if (key) soldKeys.add(key);
  });

  const merged = [...(salesItems || [])];
  (stockRows || []).forEach((stockRow) => {
    const key = buildSalesItemKey(stockRow);
    if (!key || soldKeys.has(key)) return;
    merged.push(stockRowToUnsoldSalesItem(stockRow));
  });

  return merged;
}

export function computeSoldUnsoldBarData(displayItems = []) {
  let soldCount = 0;
  let unsoldCount = 0;

  (displayItems || []).forEach((item) => {
    if (item?.is_unsold) {
      unsoldCount += 1;
    } else {
      soldCount += 1;
    }
  });

  return [
    { name: "Sold", value: soldCount, fill: "#3182CE" },
    { name: "Unsold", value: unsoldCount, fill: "#DD6B20" },
  ];
}

export const SALES_SOLD_STATUS_KEYS = {
  ALL: "all",
  SOLD: "sold",
  UNSOLD: "unsold",
};

export const SALES_SOLD_STATUS_OPTIONS = [
  { value: SALES_SOLD_STATUS_KEYS.ALL, label: "All Products" },
  { value: SALES_SOLD_STATUS_KEYS.SOLD, label: "Sold" },
  { value: SALES_SOLD_STATUS_KEYS.UNSOLD, label: "Unsold" },
];

export function filterSalesItemsBySoldStatus(
  items = [],
  soldStatus = SALES_SOLD_STATUS_KEYS.ALL
) {
  if (!soldStatus || soldStatus === SALES_SOLD_STATUS_KEYS.ALL) {
    return items || [];
  }
  if (soldStatus === SALES_SOLD_STATUS_KEYS.SOLD) {
    return (items || []).filter((item) => !item?.is_unsold);
  }
  if (soldStatus === SALES_SOLD_STATUS_KEYS.UNSOLD) {
    return (items || []).filter((item) => Boolean(item?.is_unsold));
  }
  return items || [];
}

export function soldStatusFromBarName(name) {
  const key = String(name ?? "")
    .trim()
    .toLowerCase();
  if (key === "sold") return SALES_SOLD_STATUS_KEYS.SOLD;
  if (key === "unsold") return SALES_SOLD_STATUS_KEYS.UNSOLD;
  return SALES_SOLD_STATUS_KEYS.ALL;
}

export function formatDateDisplay(value) {
  const key = formatDateKey(value);
  if (!key) return "—";
  const dt = new Date(`${key}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return key;
  return dt.toLocaleDateString("en-GB");
}

export function getDefaultSalesRangeDates(asOfDate) {
  const toDate = formatDateKey(asOfDate ?? new Date());
  const fromDate = addDays(toDate, -30);
  return { fromDate, toDate };
}

export function getDashboardItemsWindowDates(
  asOfDate,
  windowDays = SALES_DASHBOARD_WINDOW_DAYS
) {
  const toDate = formatDateKey(asOfDate);
  if (!toDate || windowDays <= 0) return [];
  const fromDate = addDays(toDate, -(windowDays - 1));
  return listDatesInRange(fromDate, toDate);
}

export function listDatesInRange(fromDate, toDate) {
  const from = formatDateKey(fromDate);
  const to = formatDateKey(toDate);
  if (!from || !to || from > to) return [];

  const dates = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function getSalesBranchFieldKey(branchId, metric) {
  return `branch_${String(branchId)}_${metric}`;
}

function toSalesMetricValue(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return roundSalesMetric(num);
}

function normalizeBuyerName(item) {
  const name =
    item?.buyer_name ??
    item?.buyer_label ??
    item?.buyer ??
    item?.buyerName ??
    null;
  const trimmed = String(name ?? "").trim();
  if (trimmed) return trimmed;

  if (item?.buyer_id != null && String(item.buyer_id).trim() !== "") {
    return String(item.buyer_id);
  }

  return null;
}

function addBuyerNameToSet(buyers, item) {
  const buyerName = normalizeBuyerName(item);
  if (buyerName) {
    buyers.add(buyerName);
  }
}

export function getUniqueBuyerNames(items = []) {
  const buyers = new Set();
  (items || []).forEach((item) => addBuyerNameToSet(buyers, item));
  return Array.from(buyers).sort((a, b) => a.localeCompare(b));
}

export function enrichSalesItemsWithBuyerLabels(items = [], buyerOptions = []) {
  if (!Array.isArray(items) || !items.length) return [];

  const labelById = new Map();
  (buyerOptions || []).forEach((option) => {
    if (option?.value == null || option?.value === "") return;
    labelById.set(String(option.value), String(option.label ?? option.value));
  });

  return items.map((item) => {
    if (normalizeBuyerName(item)) return item;

    const buyerId = item?.buyer_id;
    if (buyerId == null || String(buyerId).trim() === "") return item;

    const label = labelById.get(String(buyerId));
    if (!label) return item;

    return { ...item, buyer_name: label };
  });
}

export function aggregateSalesItemsByProductBranch(items = []) {
  const byProduct = new Map();

  (items || []).forEach((item) => {
    const productId = item?.product_id;
    const branchId = item?.branch_id;
    if (productId == null || branchId == null) return;

    const productKey = String(productId);
    const branchKey = String(branchId);
    const isUnsold = Boolean(item?.is_unsold);

    if (!byProduct.has(productKey)) {
      byProduct.set(productKey, {
        product_id: productId,
        product_name: item?.product_name ?? null,
        product_image: item?.product_image ?? null,
        department_name: item?.department_name ?? null,
        category_name: item?.category_name ?? null,
        supplier_name: item?.supplier_name ?? null,
        distributor_name: item?.distributor_name ?? null,
        is_unsold: isUnsold,
        buyers: new Set(),
        branches: new Map(),
        total_qty: 0,
        total_amt: 0,
        total_profit: 0,
      });
    }

    const record = byProduct.get(productKey);
    addBuyerNameToSet(record.buyers, item);
    if (!isUnsold) {
      record.is_unsold = false;
    }

    if (!record.branches.has(branchKey)) {
      record.branches.set(branchKey, {
        branch_id: branchId,
        branch_name: item?.branch_name ?? item?.branch_label ?? branchKey,
        qty: null,
        amt: null,
        profit: null,
        is_unsold: isUnsold,
      });
    }

    const branchRecord = record.branches.get(branchKey);
    if (!isUnsold) {
      branchRecord.is_unsold = false;
      const qty = toSalesMetricValue(item?.sold_qty) ?? 0;
      const amt = toSalesMetricValue(item?.sold_value) ?? 0;
      const profit = toSalesMetricValue(item?.sold_profit) ?? 0;

      branchRecord.qty = roundSalesMetric((branchRecord.qty ?? 0) + qty);
      branchRecord.amt = roundSalesMetric((branchRecord.amt ?? 0) + amt);
      branchRecord.profit = roundSalesMetric((branchRecord.profit ?? 0) + profit);

      record.total_qty = roundSalesMetric(record.total_qty + qty);
      record.total_amt = roundSalesMetric(record.total_amt + amt);
      record.total_profit = roundSalesMetric(record.total_profit + profit);
    } else if (branchRecord.is_unsold) {
      branchRecord.qty = null;
      branchRecord.amt = null;
      branchRecord.profit = null;
    }
  });

  return byProduct;
}

export function pivotSalesItemsToRows(items = []) {
  const aggregated = aggregateSalesItemsByProductBranch(items);
  const branchMap = new Map();

  aggregated.forEach((record) => {
    record.branches.forEach((branch) => {
      const branchKey = String(branch.branch_id);
      if (!branchMap.has(branchKey)) {
        branchMap.set(branchKey, {
          id: branch.branch_id,
          name: branch.branch_name || branchKey,
        });
      }
    });
  });

  const branches = Array.from(branchMap.values()).sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""))
  );

  const rows = Array.from(aggregated.values()).map((record) => {
    const row = {
      product_id: record.product_id,
      product_name: record.product_name,
      product_image: record.product_image,
      department_name: record.department_name,
      category_name: record.category_name,
      supplier_name: record.supplier_name,
      distributor_name: record.distributor_name,
      buyer_names: Array.from(record.buyers).sort((a, b) => a.localeCompare(b)),
      total_qty: record.total_qty,
      total_amt: record.total_amt,
      total_profit: record.total_profit,
      total_profit_pct: computeProfitPct(record.total_profit, record.total_amt),
      is_unsold: record.is_unsold,
    };

    record.branches.forEach((branchRecord) => {
      const qtyKey = getSalesBranchFieldKey(branchRecord.branch_id, "qty");
      const amtKey = getSalesBranchFieldKey(branchRecord.branch_id, "amt");
      const profitKey = getSalesBranchFieldKey(branchRecord.branch_id, "profit");
      const profitPctKey = getSalesBranchFieldKey(
        branchRecord.branch_id,
        "profit_pct"
      );

      if (branchRecord.is_unsold) {
        row[qtyKey] = null;
        row[amtKey] = null;
        row[profitKey] = null;
        row[profitPctKey] = null;
        return;
      }

      row[qtyKey] = branchRecord.qty;
      row[amtKey] = branchRecord.amt;
      row[profitKey] = branchRecord.profit;
      row[profitPctKey] = computeProfitPct(branchRecord.profit, branchRecord.amt);
    });

    return row;
  });

  rows.sort((a, b) => {
    const aId = Number(a.product_id);
    const bId = Number(b.product_id);
    if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) {
      return aId - bId;
    }
    return String(a.product_name ?? "").localeCompare(String(b.product_name ?? ""));
  });

  return { rows, branches };
}

export { formatDateKey, addDays };
