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
  grnDiscountPct
) {
  if (!batch) return true;
  if (discountPctWithinTolerance(grnDiscountPct, batch.discount_pct)) {
    return false;
  }
  return (
    !pricesEqual(batch.old_mrp, grnMrp) ||
    !pricesEqual(batch.old_selling_price, grnSp)
  );
}

export function isGrnRowPriceMismatch(grnMrp, grnSp, grnDiscountPct, batches) {
  if (!Array.isArray(batches) || batches.length === 0) return true;
  if (
    batches.some((batch) =>
      discountPctWithinTolerance(grnDiscountPct, batch.discount_pct)
    )
  ) {
    return false;
  }
  return !batches.some((batch) => isPriceCheckerBatchMatch(batch, grnMrp, grnSp));
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
