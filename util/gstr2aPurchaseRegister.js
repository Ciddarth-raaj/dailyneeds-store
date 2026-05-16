import { shouldShowIGST } from "./purchase";

export function parseDecimal(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function normalizeGstin(g) {
  return (g || "").trim().toUpperCase();
}

export function isZeroTotalAmount(item) {
  return parseDecimal(item?.total_amount) === 0;
}

export function getPurchaseTotalTax(item) {
  if (!item) return 0;
  if (shouldShowIGST(item)) {
    return parseDecimal(item.tot_igst_amt);
  }
  return parseDecimal(item.tot_sgst_amt) + parseDecimal(item.tot_cgst_amt);
}

/** When total amount is 0, taxable is 0; otherwise total amount − tax */
export function getPurchaseTaxable(item) {
  if (isZeroTotalAmount(item)) return 0;
  return parseDecimal(item?.total_amount) - getPurchaseTotalTax(item);
}

export function purchaseVendorKey(purchase) {
  const gstin = normalizeGstin(purchase?.supplier_gstn);
  if (gstin) return gstin;
  const name = String(purchase?.supplier_name ?? "").trim();
  return name ? `__name_${name}` : "__unknown";
}

export function vendorRowPrKey(row) {
  const gstin = normalizeGstin(row?.ctin);
  if (gstin) return gstin;
  return row?._rowId ?? "__unknown";
}

/**
 * Aggregate purchase register rows by supplier (GSTIN when present).
 * docCount = number of purchase records for that supplier.
 */
export function aggregatePurchasesByVendor(purchases) {
  const by = new Map();
  for (const p of purchases || []) {
    const key = purchaseVendorKey(p);
    if (!by.has(key)) {
      const gstin = normalizeGstin(p.supplier_gstn);
      by.set(key, {
        ctin: gstin || "—",
        vendorName: p.supplier_name || "—",
        docCount: 0,
        taxable: 0,
        totalTax: 0,
      });
    }
    const row = by.get(key);
    if (p.supplier_name) row.vendorName = p.supplier_name;
    if (normalizeGstin(p.supplier_gstn)) {
      row.ctin = normalizeGstin(p.supplier_gstn);
    }
    row.docCount += 1;
    row.taxable += getPurchaseTaxable(p);
    row.totalTax += getPurchaseTotalTax(p);
  }
  return by;
}

/**
 * Merge GSTR-2A vendor aggregates with purchase register aggregates.
 * Suppliers only in PR are included with 2A columns as null (display "—").
 */
export function mergeVendorRowsWithPr(vendors2A, vendorPrByGstin) {
  const merged = new Map();
  const prRemaining = new Map(vendorPrByGstin);

  for (const row of vendors2A) {
    const key = vendorRowPrKey(row);
    const pr = prRemaining.get(key);
    if (pr) prRemaining.delete(key);

    merged.set(row._rowId, {
      ...row,
      docCountPr: pr?.docCount ?? null,
      taxablePr: pr?.taxable ?? null,
      totalTaxPr: pr?.totalTax ?? null,
    });
  }

  for (const [key, pr] of prRemaining) {
    merged.set(key, {
      _rowId: key,
      ctin: pr.ctin,
      vendorName: pr.vendorName,
      docCount2A: null,
      docCountPr: pr.docCount,
      taxable2A: null,
      taxablePr: pr.taxable,
      totalTax2A: null,
      totalTaxPr: pr.totalTax,
    });
  }

  return Array.from(merged.values()).sort((a, b) =>
    String(a.vendorName || "").localeCompare(
      String(b.vendorName || ""),
      undefined,
      { sensitivity: "base" }
    )
  );
}
