export const PIE_COLORS = [
  "#805AD5",
  "#B794F4",
  "#3182CE",
  "#38A169",
  "#ECC94B",
  "#ED8936",
  "#DD6B20",
  "#4A5568",
];

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const toNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

/** AgGrid valueGetter: returns null when the field value is 0 (or empty). */
export function numericValueOrNull(field) {
  return (params) => {
    const value = params.data?.[field];
    if (value == null || value === "") return null;
    const n = Number(value);
    if (Number.isNaN(n) || n === 0) return null;
    return value;
  };
}

export const labelOf = (v) =>
  v == null || String(v).trim() === "" ? "Unknown" : String(v).trim();

export const sumQty = (row) =>
  round2(
    toNum(row["30_days_stock"]) +
      toNum(row["90_days_stock"]) +
      toNum(row["120_days_stock"]) +
      toNum(row.than_120_days_stock)
  );

export const sumValue = (row) =>
  round2(
    toNum(row["30_days_stock_value"]) +
      toNum(row["90_days_stock_value"]) +
      toNum(row["120_days_stock_value"]) +
      toNum(row.than_120_days_stock_value)
  );

/**
 * Map GET /dead-stock-items row to dashboard row shape.
 */
export function mapDeadStockItemToRow(item) {
  const thirty = item?.thirty_days ?? {};
  const ninety = item?.ninety_days ?? {};
  const oneTwenty = item?.one_twenty_days ?? {};
  const moreThan120 = item?.more_thanone_twenty_days ?? {};

  return {
    product_id: Number(item?.product_id),
    outlet_id: item?.outlet_id,
    branch_name: labelOf(item?.outlet_name),
    product_name: item?.de_name || item?.de_display_name || "—",
    buyer: labelOf(item?.buyer_name),
    supplier: labelOf(item?.de_distributor),
    department_id: item?.department_id ?? null,
    department_name: item?.department_name ?? null,
    "30_days_stock": toNum(thirty.stock),
    "30_days_stock_value": toNum(thirty.stock_value),
    "90_days_stock": toNum(ninety.stock),
    "90_days_stock_value": toNum(ninety.stock_value),
    "120_days_stock": toNum(oneTwenty.stock),
    "120_days_stock_value": toNum(oneTwenty.stock_value),
    than_120_days_stock: toNum(moreThan120.stock),
    than_120_days_stock_value: toNum(moreThan120.stock_value),
  };
}

export const pickProductMeta = (row, mappedProduct) => {
  const src = mappedProduct || {};
  return {
    buyer: labelOf(row.buyer || src.buyer_name),
    supplier: labelOf(row.supplier),
    department: labelOf(row.department_name || src.department_name),
    category: labelOf(src.category_name),
    subcategory: labelOf(src.subcategory_name),
    product_image: src.image_url || null,
    product_name:
      row.product_name ||
      src.de_name ||
      src.de_display_name ||
      "—",
  };
};

export const buildDonutData = (rows, groupKey, valueKey) => {
  const grouped = new Map();
  rows.forEach((row) => {
    const group = labelOf(row[groupKey]);
    const cur = grouped.get(group) || 0;
    grouped.set(group, round2(cur + toNum(row[valueKey])));
  });
  return Array.from(grouped.entries())
    .map(([name, value]) => ({
      name,
      value: round2(value),
      filterValue: name,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
};

export const buildGroupedTableRows = (rows, groupKey) => {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = labelOf(row[groupKey]);
    const cur = grouped.get(key) || {
      group_name: key,
      group_value: key,
      total_stock: 0,
      total_value: 0,
      "30_days_stock_value": 0,
      "90_days_stock_value": 0,
      "120_days_stock_value": 0,
      than_120_days_stock_value: 0,
      products: [],
    };
    cur.total_stock = round2(cur.total_stock + toNum(row.total_stock));
    cur.total_value = round2(cur.total_value + toNum(row.total_value));
    cur["30_days_stock_value"] = round2(
      cur["30_days_stock_value"] + toNum(row["30_days_stock_value"])
    );
    cur["90_days_stock_value"] = round2(
      cur["90_days_stock_value"] + toNum(row["90_days_stock_value"])
    );
    cur["120_days_stock_value"] = round2(
      cur["120_days_stock_value"] + toNum(row["120_days_stock_value"])
    );
    cur.than_120_days_stock_value = round2(
      cur.than_120_days_stock_value + toNum(row.than_120_days_stock_value)
    );
    cur.products.push(row);
    grouped.set(key, cur);
  });
  return Array.from(grouped.values()).sort(
    (a, b) => b.total_value - a.total_value
  );
};

export const buildSupplierGroupedTableRows = (rows) =>
  buildGroupedTableRows(rows, "supplier");

/** Stock qty field per summary card bucket key. */
export const BUCKET_EXPORT_STOCK_QTY_FIELD = {
  30: "30_days_stock",
  90: "90_days_stock",
  120: "120_days_stock",
  gt120: "than_120_days_stock",
};

export const BUCKET_EXPORT_LABEL = {
  30: "30D",
  90: "90D",
  120: "120D",
  gt120: "gt120",
};

/**
 * Pivot modal rows to CSV rows: ID, Product + one column per branch (stock qty for bucket).
 */
export function buildBucketBranchExportRows(rows, bucketKey) {
  const stockField = BUCKET_EXPORT_STOCK_QTY_FIELD[bucketKey];
  if (!stockField || !Array.isArray(rows) || rows.length === 0) {
    return { branchColumns: [], exportRows: [] };
  }

  const branchSet = new Set();
  rows.forEach((row) => {
    branchSet.add(labelOf(row.branch_name));
  });
  const branchColumns = Array.from(branchSet).sort();

  const byProduct = new Map();
  rows.forEach((row) => {
    const productId = row.product_id;
    if (productId == null || Number.isNaN(Number(productId))) return;

    const branch = labelOf(row.branch_name);
    const amount = toNum(row[stockField]);
    if (amount === 0) return;

    if (!byProduct.has(productId)) {
      byProduct.set(productId, {
        ID: productId,
        Product:
          row.product_name ||
          row.de_name ||
          row.de_display_name ||
          String(productId),
      });
    }

    const record = byProduct.get(productId);
    record[branch] = round2(toNum(record[branch]) + amount);
  });

  const exportRows = Array.from(byProduct.values()).map((record) => {
    const row = { ID: record.ID, Product: record.Product };
    branchColumns.forEach((branch) => {
      const value = record[branch];
      row[branch] = value == null || value === 0 ? "" : value;
    });
    return row;
  });

  exportRows.sort((a, b) => Number(a.ID) - Number(b.ID));

  return { branchColumns, exportRows };
}
