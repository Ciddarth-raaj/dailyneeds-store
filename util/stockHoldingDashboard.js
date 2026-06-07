import { capitalize } from "./string";

export const STOCK_HOLDING_STATUS_KEYS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  NEW: "new",
};

export const STATUS_CHART_COLORS = {
  active: "#38A169",
  inactive: "#E53E3E",
  new: "#3182CE",
};

export const STOCK_AVAILABILITY_KEYS = {
  AVAILABLE: "available",
  OUT_OF_STOCK: "out_of_stock",
};

export const STOCK_AVAILABILITY_CHART_COLORS = {
  available: "#38A169",
  out_of_stock: "#E53E3E",
};

const STOCK_AVAILABILITY_PIE_ORDER = [
  { key: STOCK_AVAILABILITY_KEYS.AVAILABLE, name: "Available" },
  { key: STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK, name: "Out of Stock" },
];

export const STOCK_AVAILABILITY_ORDER = STOCK_AVAILABILITY_PIE_ORDER;

export const getStockAvailabilityLabel = (key) => {
  const entry = STOCK_AVAILABILITY_PIE_ORDER.find((item) => item.key === key);
  return entry?.name ?? labelOf(key);
};

const BRANCH_PIE_COLORS = [
  "#3182CE",
  "#38A169",
  "#ECC94B",
  "#ED8936",
  "#9F7AEA",
  "#DD6B20",
  "#4A5568",
  "#00B5D8",
  "#D53F8C",
  "#805AD5",
];

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const toNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

export const labelOf = (v) =>
  v == null || String(v).trim() === "" ? "Unknown" : String(v).trim();

export const normalizeStatusKey = (status) => {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  if (
    key === STOCK_HOLDING_STATUS_KEYS.ACTIVE ||
    key === STOCK_HOLDING_STATUS_KEYS.NEW
  ) {
    return STOCK_HOLDING_STATUS_KEYS.ACTIVE;
  }
  if (key === STOCK_HOLDING_STATUS_KEYS.INACTIVE) {
    return STOCK_HOLDING_STATUS_KEYS.INACTIVE;
  }
  return key || "unknown";
};

export const getStatusLabel = (statusKey) => {
  const key = normalizeStatusKey(statusKey);
  if (key === STOCK_HOLDING_STATUS_KEYS.ACTIVE) return "Active";
  if (key === STOCK_HOLDING_STATUS_KEYS.INACTIVE) return "Inactive";
  return capitalize(key);
};

export const getStatusBadge = (status) => {
  const key = normalizeStatusKey(status);
  const colorMap = {
    active: "green",
    inactive: "red",
    new: "blue",
  };
  if (!key || key === "unknown") return null;
  return {
    label: getStatusLabel(key),
    colorScheme: colorMap[key] ?? "gray",
  };
};

const PURCHASE_TYPE_COLORS = {
  ft: { colorScheme: "teal", fill: "#319795" },
  pa: { colorScheme: "blue", fill: "#4299E1" },
  dsd: { colorScheme: "purple", fill: "#805AD5" },
};

const PURCHASE_TYPE_CHART_COLORS = Object.fromEntries(
  Object.entries(PURCHASE_TYPE_COLORS).map(([key, { fill }]) => [key, fill])
);

export const getPurchaseTypeBadge = (purchaseType) => {
  const trimmed = String(purchaseType ?? "").trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  return {
    label: trimmed.toUpperCase(),
    colorScheme: PURCHASE_TYPE_COLORS[key]?.colorScheme ?? "gray",
  };
};

export const getChainBillLevelBadge = (level) => {
  const trimmed = String(level ?? "").trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  const colorMap = { a: "green", b: "blue", c: "orange", x: "red" };
  return {
    label: trimmed.toUpperCase(),
    colorScheme: colorMap[key] ?? "gray",
  };
};

export function enrichStockHoldingItem(item) {
  const statusKey = normalizeStatusKey(item?.status);
  const statusLabel = getStatusLabel(statusKey);
  const supplierLabel = labelOf(
    item?.supplier_master_name || item?.supplier_name
  );
  const distributorLabel = labelOf(
    item?.distributor_master_name || item?.distributor_name
  );
  const buyerLabel = labelOf(item?.buyer_name);
  const purchaseTypeLabel = labelOf(item?.purchase_type);
  const chainBillLabel = labelOf(item?.chain_bill_count_level);
  const buyerId = item?.buyer_id ?? null;
  const supplierId = item?.supplier_id ?? null;
  const distributorId = item?.distributor_id ?? null;
  const branchId = item?.branch_id ?? null;
  const departmentId = item?.department_id ?? null;
  const categoryId = item?.category_id ?? null;
  const subcategoryId = item?.subcategory_id ?? null;
  const departmentLabel = labelOf(item?.department_name);
  const categoryLabel = labelOf(item?.category_name);
  const subcategoryLabel = labelOf(item?.subcategory_name);

  return {
    ...item,
    status_key: statusKey,
    status_label: statusLabel,
    supplier_label: supplierLabel,
    supplier_id: supplierId,
    distributor_label: distributorLabel,
    distributor_id: distributorId,
    buyer_label: buyerLabel,
    buyer_id: buyerId,
    branch_label: labelOf(item?.branch_name),
    branch_id: branchId,
    department_label: departmentLabel,
    department_id: departmentId,
    category_label: categoryLabel,
    category_id: categoryId,
    subcategory_label: subcategoryLabel,
    subcategory_id: subcategoryId,
    purchase_type_label: purchaseTypeLabel,
    chain_bill_count_level_label: chainBillLabel,
    stock_qty: round2(item?.current_stock),
    stock_value: round2(item?.current_stock_value),
    per_day_stock: calcPerDayStock(item?.stock_duration, item?.current_stock),
    _buyerKey: buyerId == null ? "unknown" : String(buyerId),
    _supplierKey: supplierId == null ? "unknown" : String(supplierId),
    _distributorKey: distributorId == null ? "unknown" : String(distributorId),
    _branchKey: branchId == null ? "unknown" : String(branchId),
    _departmentKey: departmentId == null ? "unknown" : String(departmentId),
    _categoryKey: categoryId == null ? "unknown" : String(categoryId),
    _subcategoryKey: subcategoryId == null ? "unknown" : String(subcategoryId),
    _purchaseTypeKey: String(purchaseTypeLabel).toLowerCase(),
    _chainLevelKey: String(chainBillLabel).toLowerCase(),
    _statusKey: statusKey,
  };
}

export function enrichStockHoldingItems(items) {
  const list = items || [];
  const len = list.length;
  if (!len) return [];
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = enrichStockHoldingItem(list[i]);
  }
  return result;
}

const toFilterSet = (values) => (values?.length ? new Set(values) : null);

const sortOptions = (map) =>
  Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));

const sortGroupedRows = (map) =>
  Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);

const sortStockAvailabilityRows = (map) => {
  const order = STOCK_AVAILABILITY_PIE_ORDER.map((entry) => entry.key);
  return Array.from(map.values()).sort((a, b) => {
    const ai = order.indexOf(a.group_value);
    const bi = order.indexOf(b.group_value);
    if (ai === -1 && bi === -1) return b.item_count - a.item_count;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

function createFilterSets(filters = {}, omitKeys = null) {
  const omit = omitKeys ? new Set(omitKeys) : null;
  const skip = (key) => omit?.has(key);

  return {
    branch: skip("branchFilter") ? null : toFilterSet(filters.branchFilter),
    buyer: skip("buyerFilter") ? null : toFilterSet(filters.buyerFilter),
    supplier: skip("supplierFilter")
      ? null
      : toFilterSet(filters.supplierFilter),
    distributor: skip("distributorFilter")
      ? null
      : toFilterSet(filters.distributorFilter),
    department: skip("departmentFilter")
      ? null
      : toFilterSet(filters.departmentFilter),
    category: skip("categoryFilter")
      ? null
      : toFilterSet(filters.categoryFilter),
    subcategory: skip("subcategoryFilter")
      ? null
      : toFilterSet(filters.subcategoryFilter),
    purchaseType: skip("purchaseTypeFilter")
      ? null
      : toFilterSet(filters.purchaseTypeFilter),
    chainLevel: skip("chainLevelFilter")
      ? null
      : toFilterSet(filters.chainLevelFilter),
    status: skip("statusFilter") ? null : toFilterSet(filters.statusFilter),
    stockAvailability: skip("stockAvailabilityFilter")
      ? null
      : toFilterSet(filters.stockAvailabilityFilter),
    // stockOnOrder: skip("showStockOnOrderOnly")
    //   ? false
    //   : Boolean(filters.showStockOnOrderOnly),
    stockOnOrder: false,
  };
}

function rowMatchesFilters(row, sets) {
  if (sets.branch && !sets.branch.has(row._branchKey)) return false;
  if (sets.buyer && !sets.buyer.has(row._buyerKey)) return false;
  if (sets.supplier && !sets.supplier.has(row._supplierKey)) return false;
  if (sets.distributor && !sets.distributor.has(row._distributorKey))
    return false;
  if (sets.department && !sets.department.has(row._departmentKey)) return false;
  if (sets.category && !sets.category.has(row._categoryKey)) return false;
  if (sets.subcategory && !sets.subcategory.has(row._subcategoryKey))
    return false;
  if (sets.purchaseType && !sets.purchaseType.has(row._purchaseTypeKey)) {
    return false;
  }
  if (sets.chainLevel && !sets.chainLevel.has(row._chainLevelKey)) return false;
  if (sets.status && !sets.status.has(row._statusKey)) return false;
  if (sets.stockAvailability) {
    const availabilityKey = getStockAvailabilityKey(row);
    if (!availabilityKey || !sets.stockAvailability.has(availabilityKey)) {
      return false;
    }
  }
  // if (sets.stockOnOrder && !hasStockOnOrder(row.stock_on_order)) return false;
  return true;
}

function addEntityOption(map, row, id, label) {
  if (id == null) return;
  const value = String(id);
  if (!map.has(value)) {
    map.set(value, { value, label: labelOf(label) });
  }
}

function addStringOption(map, valueKey, label) {
  if (!map.has(valueKey)) {
    map.set(valueKey, { value: valueKey, label });
  }
}

function accumulateAvailabilityGroup(map, availabilityKey, row) {
  const key = availabilityKey ?? "unknown";
  const label = availabilityKey
    ? getStockAvailabilityLabel(availabilityKey)
    : "Unknown";
  let cur = map.get(key);
  if (!cur) {
    cur = {
      group_name: label,
      group_value: key,
      total_stock: 0,
      total_value: 0,
      item_count: 0,
      items: [],
    };
    map.set(key, cur);
  }
  cur.total_stock = round2(cur.total_stock + toNum(row.stock_qty));
  cur.total_value = round2(cur.total_value + toNum(row.stock_value));
  cur.item_count += 1;
  cur.items.push(row);
}

function addStockAvailabilityOption(map, availabilityKey) {
  if (!availabilityKey) return;
  if (!map.has(availabilityKey)) {
    map.set(availabilityKey, {
      value: availabilityKey,
      label: getStockAvailabilityLabel(availabilityKey),
    });
  }
}

function withPctSplit(rows, totalCount) {
  return (rows || []).map((row) => ({
    ...row,
    pct_split:
      totalCount > 0 ? round2((toNum(row.item_count) / totalCount) * 100) : 0,
  }));
}

function countRawAvailability(items) {
  let available = 0;
  let outOfStock = 0;
  (items || []).forEach((item) => {
    const key = getStockAvailabilityKey(item);
    if (key === STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK) outOfStock += 1;
    else available += 1;
  });
  return { available, outOfStock };
}

const getProductKey = (item) => {
  const id = item?.product_id;
  return id == null ? "unknown" : String(id);
};

const countUniqueProducts = (items) => {
  const keys = new Set();
  (items || []).forEach((item) => keys.add(getProductKey(item)));
  return keys.size;
};

/** Product-weighted availability: average per-product branch availability across products. */
function computeProductWeightedAvailabilityPcts(items) {
  const byProduct = new Map();

  (items || []).forEach((item) => {
    const productKey = getProductKey(item);
    let product = byProduct.get(productKey);
    if (!product) {
      product = { available: 0, outOfStock: 0, total: 0 };
      byProduct.set(productKey, product);
    }

    const key = getStockAvailabilityKey(item);
    product.total += 1;
    if (key === STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK) product.outOfStock += 1;
    else product.available += 1;
  });

  const productCount = byProduct.size;
  if (!productCount) {
    return {
      available_pct: 0,
      out_of_stock_pct: 0,
    };
  }

  let sumAvailablePct = 0;
  let sumOutOfStockPct = 0;

  byProduct.forEach((product) => {
    const total = product.total;
    if (total <= 0) return;

    sumAvailablePct += (product.available / total) * 100;
    sumOutOfStockPct += (product.outOfStock / total) * 100;
  });

  return {
    available_pct: round2(sumAvailablePct / productCount),
    out_of_stock_pct: round2(sumOutOfStockPct / productCount),
  };
}

export function computeAvailabilitySummary(rows) {
  const total = (rows || []).length;
  if (!total) {
    return {
      total: 0,
      available_pct: 0,
      out_of_stock_pct: 0,
      available_count: 0,
      out_of_stock_count: 0,
    };
  }

  const { available, outOfStock } = countRawAvailability(rows);
  const pcts = computeProductWeightedAvailabilityPcts(rows);

  return {
    total,
    available_pct: pcts.available_pct,
    out_of_stock_pct: pcts.out_of_stock_pct,
    available_count: available,
    out_of_stock_count: outOfStock,
  };
}

export function enrichGroupedRowsWithAvailabilityPct(rows) {
  return (rows || []).map((row) => {
    const items = row.items || [];
    const productCount = countUniqueProducts(items);
    if (!items.length) {
      return {
        ...row,
        item_count: 0,
        available_pct: 0,
        out_of_stock_pct: 0,
      };
    }

    const pcts = computeProductWeightedAvailabilityPcts(items);

    return {
      ...row,
      item_count: productCount,
      available_pct: pcts.available_pct,
      out_of_stock_pct: pcts.out_of_stock_pct,
    };
  });
}

export function enrichGroupedRowsWithProductCount(rows) {
  return (rows || []).map((row) => ({
    ...row,
    item_count: countUniqueProducts(row.items),
  }));
}

function accumulateLabelGroup(map, groupKey, row) {
  const key = labelOf(row[groupKey]);
  let cur = map.get(key);
  if (!cur) {
    cur = {
      group_name: key,
      group_value: key,
      total_stock: 0,
      total_value: 0,
      item_count: 0,
      items: [],
    };
    map.set(key, cur);
  }
  cur.total_stock = round2(cur.total_stock + toNum(row.stock_qty));
  cur.total_value = round2(cur.total_value + toNum(row.stock_value));
  cur.item_count += 1;
  cur.items.push(row);
}

function accumulateEntityGroup(map, idKey, labelKey, row) {
  const id = row[idKey];
  const key = id == null ? "unknown" : String(id);
  let cur = map.get(key);
  if (!cur) {
    cur = {
      group_name: id == null ? "Unknown" : labelOf(row[labelKey]),
      group_value: key,
      [idKey]: id,
      total_stock: 0,
      total_value: 0,
      item_count: 0,
      items: [],
    };
    map.set(key, cur);
  }
  cur.total_stock = round2(cur.total_stock + toNum(row.stock_qty));
  cur.total_value = round2(cur.total_value + toNum(row.stock_value));
  cur.item_count += 1;
  cur.items.push(row);
}

const EMPTY_DASHBOARD = {
  filteredRows: [],
  branchOptions: [],
  buyerOptions: [],
  supplierOptions: [],
  distributorOptions: [],
  departmentOptions: [],
  categoryOptions: [],
  subcategoryOptions: [],
  purchaseTypeOptions: [],
  chainLevelOptions: [],
  statusOptions: [],
  stockAvailabilityOptions: [],
  itemStatusPieData: [],
  stockAvailabilityPieData: [],
  stockAvailabilityBarData: [],
  purchaseTypePieData: [],
  chainBillPieData: [],
  totalStockQty: 0,
  totalStockValue: 0,
  supplierTableRows: [],
  distributorTableRows: [],
  departmentTableRows: [],
  categoryTableRows: [],
  subcategoryTableRows: [],
  buyerTableRows: [],
  branchTableRows: [],
  purchaseTypeTableRows: [],
  chainLevelTableRows: [],
  statusTableRows: [],
  stockAvailabilityTableRows: [],
};

export function computeStockHoldingDashboardState(rows, filters = {}) {
  const list = rows || [];
  if (!list.length) return EMPTY_DASHBOARD;

  const allSets = createFilterSets(filters);
  const branchOptionSets = createFilterSets(filters, ["branchFilter"]);
  const buyerOptionSets = createFilterSets(filters, ["buyerFilter"]);
  const supplierOptionSets = createFilterSets(filters, ["supplierFilter"]);
  const distributorOptionSets = createFilterSets(filters, [
    "distributorFilter",
  ]);
  const departmentOptionSets = createFilterSets(filters, ["departmentFilter"]);
  const categoryOptionSets = createFilterSets(filters, ["categoryFilter"]);
  const subcategoryOptionSets = createFilterSets(filters, [
    "subcategoryFilter",
  ]);
  const purchaseTypeOptionSets = createFilterSets(filters, [
    "purchaseTypeFilter",
  ]);
  const chainLevelOptionSets = createFilterSets(filters, ["chainLevelFilter"]);
  const statusOptionSets = createFilterSets(filters, ["statusFilter"]);
  const stockAvailabilityOptionSets = createFilterSets(filters, [
    "stockAvailabilityFilter",
  ]);

  const filteredRows = [];
  const branchOptions = new Map();
  const buyerOptions = new Map();
  const supplierOptions = new Map();
  const distributorOptions = new Map();
  const departmentOptions = new Map();
  const categoryOptions = new Map();
  const subcategoryOptions = new Map();
  const purchaseTypeOptions = new Map();
  const chainLevelOptions = new Map();
  const statusOptions = new Map();
  const stockAvailabilityOptions = new Map();

  const statusCounts = { active: 0, inactive: 0 };
  const availabilityCounts = {
    available: 0,
    out_of_stock: 0,
  };
  const purchaseTypeCounts = new Map();
  const chainBillCounts = new Map();

  const supplierGrouped = new Map();
  const distributorGrouped = new Map();
  const departmentGrouped = new Map();
  const categoryGrouped = new Map();
  const subcategoryGrouped = new Map();
  const buyerGrouped = new Map();
  const branchGrouped = new Map();
  const purchaseTypeGrouped = new Map();
  const chainLevelGrouped = new Map();
  const statusGrouped = new Map();
  const stockAvailabilityGrouped = new Map();

  let totalStockQty = 0;
  let totalStockValue = 0;

  for (let i = 0; i < list.length; i++) {
    const row = list[i];

    if (rowMatchesFilters(row, branchOptionSets)) {
      addEntityOption(branchOptions, row, row.branch_id, row.branch_label);
    }
    if (rowMatchesFilters(row, buyerOptionSets)) {
      addEntityOption(buyerOptions, row, row.buyer_id, row.buyer_label);
    }
    if (rowMatchesFilters(row, supplierOptionSets)) {
      addEntityOption(
        supplierOptions,
        row,
        row.supplier_id,
        row.supplier_label
      );
    }
    if (rowMatchesFilters(row, distributorOptionSets)) {
      addEntityOption(
        distributorOptions,
        row,
        row.distributor_id,
        row.distributor_label
      );
    }
    if (rowMatchesFilters(row, departmentOptionSets)) {
      addEntityOption(
        departmentOptions,
        row,
        row.department_id,
        row.department_label
      );
    }
    if (rowMatchesFilters(row, categoryOptionSets)) {
      addEntityOption(
        categoryOptions,
        row,
        row.category_id,
        row.category_label
      );
    }
    if (rowMatchesFilters(row, subcategoryOptionSets)) {
      addEntityOption(
        subcategoryOptions,
        row,
        row.subcategory_id,
        row.subcategory_label
      );
    }
    if (rowMatchesFilters(row, purchaseTypeOptionSets)) {
      addStringOption(
        purchaseTypeOptions,
        row._purchaseTypeKey,
        row.purchase_type_label
      );
    }
    if (rowMatchesFilters(row, chainLevelOptionSets)) {
      addStringOption(
        chainLevelOptions,
        row._chainLevelKey,
        row.chain_bill_count_level_label
      );
    }
    if (rowMatchesFilters(row, statusOptionSets)) {
      addStringOption(statusOptions, row._statusKey, row.status_label);
    }
    if (rowMatchesFilters(row, stockAvailabilityOptionSets)) {
      addStockAvailabilityOption(
        stockAvailabilityOptions,
        getStockAvailabilityKey(row)
      );
    }

    if (!rowMatchesFilters(row, allSets)) continue;

    filteredRows.push(row);
    totalStockQty += toNum(row.stock_qty);
    totalStockValue += toNum(row.stock_value);

    const status = row.status_key;
    if (statusCounts[status] != null) statusCounts[status] += 1;

    const availabilityKey = getStockAvailabilityKey(row);
    if (availabilityKey && availabilityCounts[availabilityKey] != null) {
      availabilityCounts[availabilityKey] += 1;
    }

    purchaseTypeCounts.set(
      row.purchase_type_label,
      (purchaseTypeCounts.get(row.purchase_type_label) || 0) + 1
    );
    chainBillCounts.set(
      row.chain_bill_count_level_label,
      (chainBillCounts.get(row.chain_bill_count_level_label) || 0) + 1
    );

    accumulateEntityGroup(
      supplierGrouped,
      "supplier_id",
      "supplier_label",
      row
    );
    accumulateEntityGroup(
      distributorGrouped,
      "distributor_id",
      "distributor_label",
      row
    );
    accumulateEntityGroup(
      departmentGrouped,
      "department_id",
      "department_label",
      row
    );
    accumulateEntityGroup(
      categoryGrouped,
      "category_id",
      "category_label",
      row
    );
    accumulateEntityGroup(
      subcategoryGrouped,
      "subcategory_id",
      "subcategory_label",
      row
    );
    accumulateEntityGroup(buyerGrouped, "buyer_id", "buyer_label", row);
    accumulateEntityGroup(branchGrouped, "branch_id", "branch_label", row);
    accumulateLabelGroup(purchaseTypeGrouped, "purchase_type_label", row);
    accumulateLabelGroup(
      chainLevelGrouped,
      "chain_bill_count_level_label",
      row
    );
    accumulateLabelGroup(statusGrouped, "status_label", row);
    accumulateAvailabilityGroup(stockAvailabilityGrouped, availabilityKey, row);
  }

  const filteredCount = filteredRows.length;
  const availabilityPcts = computeProductWeightedAvailabilityPcts(filteredRows);
  const availabilityPctByKey = {
    [STOCK_AVAILABILITY_KEYS.AVAILABLE]: availabilityPcts.available_pct,
    [STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK]: availabilityPcts.out_of_stock_pct,
  };

  const statusOrder = [
    STOCK_HOLDING_STATUS_KEYS.ACTIVE,
    STOCK_HOLDING_STATUS_KEYS.INACTIVE,
  ];

  const itemStatusPieData = statusOrder
    .filter((key) => statusCounts[key] > 0)
    .map((key) => ({
      name: getStatusLabel(key),
      value: statusCounts[key],
      fill: STATUS_CHART_COLORS[key],
      filterValue: key,
    }));

  const stockAvailabilityPieData = STOCK_AVAILABILITY_PIE_ORDER.filter(
    ({ key }) => availabilityCounts[key] > 0
  ).map(({ key, name }) => ({
    name,
    value: availabilityCounts[key],
    fill: STOCK_AVAILABILITY_CHART_COLORS[key],
    filterValue: key,
    pct: availabilityPctByKey[key] ?? 0,
  }));

  const stockAvailabilityBarData = stockAvailabilityPieData;

  const purchaseTypePieData = Array.from(purchaseTypeCounts.entries())
    .map(([name, value], index) => {
      const colorKey = String(name).trim().toLowerCase();
      return {
        name,
        value,
        fill:
          PURCHASE_TYPE_CHART_COLORS[colorKey] ??
          BRANCH_PIE_COLORS[index % BRANCH_PIE_COLORS.length],
        filterValue: colorKey,
      };
    })
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const chainBillPieData = Array.from(chainBillCounts.entries())
    .map(([name, value], index) => {
      const colorKey = String(name).trim().toLowerCase();
      return {
        name,
        value,
        fill:
          CHAIN_BILL_CHART_COLORS[colorKey] ??
          BRANCH_PIE_COLORS[index % BRANCH_PIE_COLORS.length],
        filterValue: colorKey,
      };
    })
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    filteredRows,
    branchOptions: sortOptions(branchOptions),
    buyerOptions: sortOptions(buyerOptions),
    supplierOptions: sortOptions(supplierOptions),
    distributorOptions: sortOptions(distributorOptions),
    departmentOptions: sortOptions(departmentOptions),
    categoryOptions: sortOptions(categoryOptions),
    subcategoryOptions: sortOptions(subcategoryOptions),
    purchaseTypeOptions: sortOptions(purchaseTypeOptions),
    chainLevelOptions: sortOptions(chainLevelOptions),
    statusOptions: sortOptions(statusOptions),
    stockAvailabilityOptions: sortOptions(stockAvailabilityOptions),
    itemStatusPieData,
    stockAvailabilityPieData,
    stockAvailabilityBarData,
    purchaseTypePieData,
    chainBillPieData,
    totalStockQty: round2(totalStockQty),
    totalStockValue: round2(totalStockValue),
    supplierTableRows: sortGroupedRows(supplierGrouped),
    distributorTableRows: sortGroupedRows(distributorGrouped),
    departmentTableRows: sortGroupedRows(departmentGrouped),
    categoryTableRows: sortGroupedRows(categoryGrouped),
    subcategoryTableRows: sortGroupedRows(subcategoryGrouped),
    buyerTableRows: sortGroupedRows(buyerGrouped),
    branchTableRows: sortGroupedRows(branchGrouped),
    purchaseTypeTableRows: sortGroupedRows(purchaseTypeGrouped),
    chainLevelTableRows: sortGroupedRows(chainLevelGrouped),
    statusTableRows: sortGroupedRows(statusGrouped),
    stockAvailabilityTableRows: withPctSplit(
      sortStockAvailabilityRows(stockAvailabilityGrouped),
      filteredCount
    ),
  };
}

export const matchesMultiFilter = (selected, rowKey) =>
  !selected?.length || selected.includes(rowKey);

// export const hasStockOnOrder = (value) => {
//   const onOrder = Number(value);
//   return !(
//     value == null ||
//     value === "" ||
//     Number.isNaN(onOrder) ||
//     onOrder === 0
//   );
// };

export function filterStockHoldingRows(rows, filters = {}, options = {}) {
  const sets = createFilterSets(filters, options.omit);
  const list = rows || [];
  if (!list.length) return [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    if (rowMatchesFilters(list[i], sets)) out.push(list[i]);
  }
  return out;
}

export const arraysShallowEqual = (a, b) => {
  if (a === b) return true;
  const left = a || [];
  const right = b || [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
};

export const pruneMultiFilter = (selected, options) => {
  if (!options?.length) return selected || [];
  const next = (selected || []).filter((value) =>
    options.some((o) => o.value === value)
  );
  return arraysShallowEqual(selected, next) ? selected || [] : next;
};

export const pruneStatusFilter = (selected, options) => {
  const pruned = pruneMultiFilter(selected, options);
  if (pruned.length > 0) return pruned;
  const hasActive = (options || []).some(
    (o) => o.value === STOCK_HOLDING_STATUS_KEYS.ACTIVE
  );
  return hasActive ? [STOCK_HOLDING_STATUS_KEYS.ACTIVE] : pruned;
};

export const toggleMultiFilterValue = (selected, value) => {
  if (value == null || value === "") return selected || [];
  const current = selected || [];
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
};

export const filterOptionsKey = (...optionLists) =>
  optionLists
    .map((opts) =>
      (opts || [])
        .map((o) => o.value)
        .sort()
        .join(",")
    )
    .join("|");

export function buildEntityOptions(
  rows,
  idKey,
  labelKey,
  unknownLabel = "Unknown",
  { excludeUnknown = false } = {}
) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const id = row[idKey];
    if (excludeUnknown && id == null) return;
    const value = id == null ? "unknown" : String(id);
    if (!map.has(value)) {
      map.set(value, {
        value,
        label: id == null ? unknownLabel : labelOf(row[labelKey]),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

export function buildStringOptions(rows, key) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const label = labelOf(row[key]);
    const value = String(label).toLowerCase();
    if (!map.has(value)) {
      map.set(value, { value, label });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

export function sumStockQty(rows) {
  return round2(
    (rows || []).reduce((sum, row) => sum + toNum(row.stock_qty), 0)
  );
}

export function sumStockValue(rows) {
  return round2(
    (rows || []).reduce((sum, row) => sum + toNum(row.stock_value), 0)
  );
}

export function buildStatusPieData(rows) {
  const statusOrder = [
    STOCK_HOLDING_STATUS_KEYS.ACTIVE,
    STOCK_HOLDING_STATUS_KEYS.INACTIVE,
  ];
  const statusCounts = {
    active: 0,
    inactive: 0,
  };

  (rows || []).forEach((row) => {
    const status = normalizeStatusKey(row.status_key ?? row.status);
    if (statusCounts[status] != null) {
      statusCounts[status] += 1;
    }
  });

  return statusOrder
    .filter((key) => statusCounts[key] > 0)
    .map((key) => ({
      name: getStatusLabel(key),
      value: statusCounts[key],
      fill: STATUS_CHART_COLORS[key],
    }));
}

const CHAIN_BILL_CHART_COLORS = {
  a: "#38A169",
  b: "#3182CE",
  c: "#ED8936",
  x: "#E53E3E",
};

function buildLabelCountPieData(rows, labelKey, colorMap) {
  const counts = new Map();
  (rows || []).forEach((row) => {
    const label = labelOf(row[labelKey]);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, value], index) => {
      const colorKey = String(name).trim().toLowerCase();
      return {
        name,
        value,
        fill:
          colorMap?.[colorKey] ??
          BRANCH_PIE_COLORS[index % BRANCH_PIE_COLORS.length],
      };
    })
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function buildPurchaseTypePieData(rows) {
  return buildLabelCountPieData(
    rows,
    "purchase_type_label",
    PURCHASE_TYPE_CHART_COLORS
  );
}

export function buildChainBillCountPieData(rows) {
  return buildLabelCountPieData(
    rows,
    "chain_bill_count_level_label",
    CHAIN_BILL_CHART_COLORS
  );
}

export function buildGroupedTableRows(rows, groupKey, labelKey = groupKey) {
  const grouped = new Map();
  (rows || []).forEach((row) => {
    const key = labelOf(row[groupKey]);
    const cur = grouped.get(key) || {
      group_name: key,
      group_value: key,
      total_stock: 0,
      total_value: 0,
      item_count: 0,
      items: [],
    };
    cur.total_stock = round2(cur.total_stock + toNum(row.stock_qty));
    cur.total_value = round2(cur.total_value + toNum(row.stock_value));
    cur.item_count += 1;
    cur.items.push(row);
    grouped.set(key, cur);
  });
  return Array.from(grouped.values()).sort(
    (a, b) => b.total_value - a.total_value
  );
}

export function buildEntityGroupedTableRows(rows, idKey, labelKey) {
  const grouped = new Map();
  (rows || []).forEach((row) => {
    const id = row[idKey];
    const key = id == null ? "unknown" : String(id);
    const cur = grouped.get(key) || {
      group_name: id == null ? "Unknown" : labelOf(row[labelKey]),
      group_value: key,
      [idKey]: id,
      total_stock: 0,
      total_value: 0,
      item_count: 0,
      items: [],
    };
    cur.total_stock = round2(cur.total_stock + toNum(row.stock_qty));
    cur.total_value = round2(cur.total_value + toNum(row.stock_value));
    cur.item_count += 1;
    cur.items.push(row);
    grouped.set(key, cur);
  });
  return Array.from(grouped.values()).sort(
    (a, b) => b.total_value - a.total_value
  );
}

export const parseDaysValue = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;

  const withoutSuffix = trimmed.endsWith("d")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  const parsed = Number(withoutSuffix);
  return Number.isNaN(parsed) ? null : Math.trunc(parsed);
};

export const formatDaysDisplay = (value) => {
  const parsed = parseDaysValue(value);
  return parsed == null ? null : `${parsed}d`;
};

export const daysDisplayComparator = (valueA, valueB) => {
  const a = parseDaysValue(valueA);
  const b = parseDaysValue(valueB);
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a - b;
};

/** Per day stock = current_stock / stock_duration */
export const calcPerDayStock = (stockDuration, stockQty) => {
  const duration = parseDaysValue(stockDuration);
  const qty = toNum(stockQty);
  if (duration == null || duration <= 0 || qty <= 0) return null;
  return round2(qty / duration);
};

export function getStockAvailabilityKey(item) {
  const stockQty = toNum(item?.stock_qty ?? item?.current_stock);
  const stockValue = toNum(item?.stock_value ?? item?.current_stock_value);
  const hasStock = stockQty > 0 || stockValue > 0;

  return hasStock
    ? STOCK_AVAILABILITY_KEYS.AVAILABLE
    : STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK;
}

export const getStockAvailabilityBadge = (item) => {
  const key = getStockAvailabilityKey(item);
  if (!key) return null;

  const badgeMap = {
    [STOCK_AVAILABILITY_KEYS.AVAILABLE]: {
      label: "Available",
      colorScheme: "green",
    },
    [STOCK_AVAILABILITY_KEYS.OUT_OF_STOCK]: {
      label: "Out of Stock",
      colorScheme: "red",
    },
  };

  return badgeMap[key] ?? null;
};
