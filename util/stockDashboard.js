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
    product_name: item?.gf_item_name || item?.de_name || "—",
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
    buyer: labelOf(src.buyer_name || row.buyer),
    supplier: labelOf(src.de_distributor || row.supplier),
    department: labelOf(row.department_name || src.department_name),
    category: labelOf(src.category_name),
    subcategory: labelOf(src.subcategory_name),
    product_image: src.image_url || null,
    product_name:
      row.product_name ||
      src.gf_item_name ||
      src.de_display_name ||
      src.de_name ||
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
