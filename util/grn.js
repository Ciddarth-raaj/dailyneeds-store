export function formatDiscountPct(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(Math.round(n * 100) / 100).toFixed(2)}%`;
}

export function parseGrnPrice(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const DISCOUNT_PCT_TOLERANCE = 0.4;
export const DISCOUNT_AMOUNT_TOLERANCE = 0.01;

export function parseDiscountPct(value) {
  return parseGrnPrice(value);
}

export function discountPctWithinTolerance(
  left,
  right,
  tolerance = DISCOUNT_PCT_TOLERANCE
) {
  const a = parseDiscountPct(left);
  const b = parseDiscountPct(right);
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tolerance;
}

export function discountAmountWithinTolerance(
  left,
  right,
  tolerance = DISCOUNT_AMOUNT_TOLERANCE
) {
  const a = parseGrnPrice(left);
  const b = parseGrnPrice(right);
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tolerance;
}

export function pricesEqual(a, b) {
  const left = parseGrnPrice(a);
  const right = parseGrnPrice(b);
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return left === right;
}

export function isPriceCheckerBatchMatch(batch, grnMrp, grnSp) {
  if (!batch) return false;
  return (
    pricesEqual(batch.old_mrp, grnMrp) &&
    pricesEqual(batch.old_selling_price, grnSp)
  );
}

export function isPriceCheckerBatchMismatch(
  batch,
  grnMrp,
  grnSp,
  grnDiscountPct,
  grnDiscountAmount
) {
  if (!batch) return true;
  if (
    discountPctWithinTolerance(grnDiscountPct, batch.discount_pct) ||
    discountAmountWithinTolerance(grnDiscountAmount, batch.discount_amount)
  ) {
    return false;
  }
  return (
    !pricesEqual(batch.old_mrp, grnMrp) ||
    !pricesEqual(batch.old_selling_price, grnSp)
  );
}

/**
 * True when two or more of the product's own historical batches disagree
 * with each other -- their Selling Price differs, and neither their
 * discount % nor their discount amount is within tolerance either. A
 * matching Selling Price is treated as agreement on its own, since MRP and
 * discount % are derived and can vary while SP -- what was actually
 * charged -- stays the same. Batches that disagree like this can't be
 * treated as a reliable reference, no matter which one the GRN happens to
 * land close to.
 */
export function batchesDisagree(batches) {
  if (!Array.isArray(batches) || batches.length < 2) return false;
  for (let i = 0; i < batches.length; i++) {
    for (let j = i + 1; j < batches.length; j++) {
      const a = batches[i];
      const b = batches[j];
      if (pricesEqual(a?.old_selling_price, b?.old_selling_price)) continue;
      if (
        !discountPctWithinTolerance(a?.discount_pct, b?.discount_pct) &&
        !discountAmountWithinTolerance(a?.discount_amount, b?.discount_amount)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function isGrnRowPriceMismatch(
  grnMrp,
  grnSp,
  grnDiscountPct,
  grnDiscountAmount,
  batches
) {
  if (!Array.isArray(batches) || batches.length === 0) return false;
  if (batchesDisagree(batches)) return true;
  if (
    batches.some(
      (batch) =>
        discountPctWithinTolerance(grnDiscountPct, batch.discount_pct) ||
        discountAmountWithinTolerance(grnDiscountAmount, batch.discount_amount)
    )
  ) {
    return false;
  }
  return !batches.some((batch) => isPriceCheckerBatchMatch(batch, grnMrp, grnSp));
}

export function getGrnLinePriceMismatch(row, itemsByProductId, pcLoading = false) {
  if (pcLoading || !row || row.is_ignored) return false;
  return isGrnRowPriceMismatch(
    row.mrp,
    row.mmd_sale_rate,
    row.discount_pct,
    row.discount_amount,
    itemsByProductId.get(row.product_id) ?? []
  );
}

/** Margin between MRP and (Pur. Rate + Tax), as a % of MRP. */
export function calcBaseMarginMD(purRate, purTaxPct, mrp) {
  const rate = parseGrnPrice(purRate);
  const taxPct = parseGrnPrice(purTaxPct);
  const mrpVal = parseGrnPrice(mrp);
  if (rate == null || taxPct == null || mrpVal == null || mrpVal === 0) {
    return null;
  }
  const grossRate = rate * (1 + taxPct / 100);
  return 100 - (grossRate / mrpVal) * 100;
}

/** Margin between MRP and Net Cost, as a % of MRP. */
export function calcNetMarginMD(netCost, mrp) {
  const cost = parseGrnPrice(netCost);
  const mrpVal = parseGrnPrice(mrp);
  if (cost == null || mrpVal == null || mrpVal === 0) return null;
  return 100 - (cost / mrpVal) * 100;
}

/**
 * Effective discount %, combining the gap between Net Cost and
 * (Pur. Rate + Tax) with the recorded discount amount relative to the
 * gross line value -- quantity basis includes free units.
 */
export function calcDiscountInclFree(
  netCost,
  purRate,
  purTaxPct,
  discountAmt,
  recdQty,
  freeQty
) {
  const cost = parseGrnPrice(netCost);
  const rate = parseGrnPrice(purRate);
  const taxPct = parseGrnPrice(purTaxPct);
  const discAmt = parseGrnPrice(discountAmt);
  const qty = (parseGrnPrice(recdQty) ?? 0) + (parseGrnPrice(freeQty) ?? 0);
  if (
    cost == null ||
    rate == null ||
    taxPct == null ||
    discAmt == null ||
    rate === 0 ||
    qty === 0
  ) {
    return null;
  }
  const grossRate = rate * (1 + taxPct / 100);
  if (grossRate === 0) return null;
  const netVsGrossPct = 100 - (cost / grossRate) * 100;
  const discOfGrossPct = (discAmt / (rate * qty)) * 100;
  return netVsGrossPct - discOfGrossPct;
}

/** Markup of Selling Price over Net Cost, as a %. */
export function calcMarkupOnSelling(sellingRate, netCost) {
  const sp = parseGrnPrice(sellingRate);
  const cost = parseGrnPrice(netCost);
  if (sp == null || cost == null || cost === 0) return null;
  return (sp / cost) * 100 - 100;
}

export function grnDetailHasPriceMismatch(
  items,
  itemsByProductId,
  pcLoading = false
) {
  if (pcLoading || !Array.isArray(items) || items.length === 0) return false;
  return items.some((item) =>
    getGrnLinePriceMismatch(item, itemsByProductId, false)
  );
}

export function sortRowsMismatchFirst(rows, isMismatchFn) {
  if (!Array.isArray(rows) || rows.length <= 1) return rows ?? [];

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aMismatch = Boolean(isMismatchFn(a.row));
      const bMismatch = Boolean(isMismatchFn(b.row));
      if (aMismatch !== bMismatch) return aMismatch ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

export function getMismatchRowStyle(isMismatch, mismatchBg) {
  if (!isMismatch || !mismatchBg) return undefined;
  return { backgroundColor: mismatchBg };
}
