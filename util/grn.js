const OFFER_V3_TYPE_LABELS = {
  percentage: "%",
  flat: "Flat ₹",
  fixed_price: "Fixed ₹",
};

function formatOfferDetailLine(detail) {
  if (!detail) return null;
  if (detail.source === "hq") {
    return detail.offer_name ? `HQ Offer: ${detail.offer_name}` : "HQ Offer";
  }
  if (detail.source === "v3") {
    const scopeLabel = detail.scope === "batch" ? "Batch" : "Item";
    const typeLabel = OFFER_V3_TYPE_LABELS[detail.offer_type] ?? detail.offer_type;
    const value = detail.value;
    if (detail.offer_type === "percentage") {
      return `${scopeLabel} Offer: ${value}% off`;
    }
    if (detail.offer_type === "flat") {
      return `${scopeLabel} Offer: Flat ₹${value} off`;
    }
    if (detail.offer_type === "fixed_price") {
      return `${scopeLabel} Offer: Fixed ₹${value}`;
    }
    return `${scopeLabel} Offer: ${typeLabel}${value ?? ""}`;
  }
  return null;
}

/** Human-readable, newline-joined summary of a product's active offers, for a tooltip. */
export function formatOfferDetails(offerDetails) {
  if (!Array.isArray(offerDetails) || offerDetails.length === 0) return "";
  return offerDetails
    .map(formatOfferDetailLine)
    .filter(Boolean)
    .join("\n");
}

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

// "Same" means same to within rounding, not merely close. Prices carry two
// decimals, so a genuine policy match lands within a few hundredths of a
// point, while a real price difference shows up at a quarter point or more:
// a batch selling at 79.00 against a GRN line at 95.00 sat 1.00 point apart
// on markup and 0.24 apart on discount %, and read as a match under the
// wider tolerances these replace.
export const DISCOUNT_PCT_TOLERANCE = 0.1;
export const DISCOUNT_AMOUNT_TOLERANCE = 0.01;
export const MARKUP_PCT_TOLERANCE = 0.1;

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

export function markupPctWithinTolerance(
  left,
  right,
  tolerance = MARKUP_PCT_TOLERANCE
) {
  const a = parseGrnPrice(left);
  const b = parseGrnPrice(right);
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

export function isPriceCheckerBatchMismatch(
  batch,
  grnMrp,
  grnSp,
  grnDiscountPct,
  grnDiscountAmount,
  grnPurchasePrice
) {
  if (!batch) return true;

  // A batch priced by the same cost-plus markup as the GRN line agrees with
  // it even when MRP/discount% differ -- different suppliers quote
  // different MRPs, but the same markup-over-cost pricing policy.
  if (
    markupPctWithinTolerance(
      calcMarkupOnSelling(batch.old_selling_price, batch.purchase_price),
      calcMarkupOnSelling(grnSp, grnPurchasePrice)
    )
  ) {
    return false;
  }

  if (
    discountPctWithinTolerance(grnDiscountPct, batch.discount_pct) ||
    discountAmountWithinTolerance(grnDiscountAmount, batch.discount_amount)
  ) {
    return false;
  }
  // A matching Selling Price is agreement on its own -- MRP is derived and
  // can vary between suppliers while SP, what was actually charged, stays
  // the same.
  return !pricesEqual(batch.old_selling_price, grnSp);
}

// A GRN line is a conflict when ANY of its current batches disagrees with it
// -- the four agreement criteria (markup, discount %, discount amount, SP)
// have to hold across every batch for the line to read as clean. Uses
// isPriceCheckerBatchMismatch per batch, so a batch the Price Checker modal
// shows as Conflict always puts its GRN line on the Issue GRN list too.
export function isGrnRowPriceMismatch(
  grnMrp,
  grnSp,
  grnDiscountPct,
  grnDiscountAmount,
  batches,
  grnPurchasePrice
) {
  if (!Array.isArray(batches) || batches.length === 0) return false;
  return batches.some((batch) =>
    isPriceCheckerBatchMismatch(
      batch,
      grnMrp,
      grnSp,
      grnDiscountPct,
      grnDiscountAmount,
      grnPurchasePrice
    )
  );
}

export function getGrnLinePriceMismatch(row, itemsByProductId, pcLoading = false) {
  if (pcLoading || !row || row.is_ignored) return false;
  return isGrnRowPriceMismatch(
    row.mrp,
    row.mmd_sale_rate,
    row.discount_pct,
    row.discount_amount,
    itemsByProductId.get(row.product_id) ?? [],
    row.mmd_pur_price
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
