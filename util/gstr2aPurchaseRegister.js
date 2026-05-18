import moment from "moment";
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

/** 2A total tax − PR total tax; null when either side is missing. */
export function computeTaxDiff(tax2A, taxPr) {
  if (tax2A == null || taxPr == null) return null;
  return parseDecimal(tax2A) - parseDecimal(taxPr);
}

/** True when diff is outside the inclusive range [-1, 1]. */
export function isTaxDiffOutOfRange(diff) {
  if (diff == null || !Number.isFinite(diff)) return false;
  return diff < -1 || diff > 1;
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
function periodDateRange(period) {
  const m = moment(period, "YYYY-MM", true);
  if (!m.isValid()) return null;

  const startOfDay = m.clone().startOf("month").toDate();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = m.clone().endOf("month").toDate();
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/** GSTR-2A PR page: filter purchases by dist bill date (`mmh_dist_bill_dt`). */
export function purchasePeriodFilters(period) {
  const range = periodDateRange(period);
  if (!range) return null;

  return {
    dist_bill_from_date: range.startOfDay.toISOString(),
    dist_bill_to_date: range.endOfDay.toISOString(),
  };
}

/** GSTR-2A PR page: matches for invoices in the selected GSTR return period. */
export function purchaseMatchPeriodFilters(period) {
  const m = moment(period, "YYYY-MM", true);
  if (!m.isValid()) return null;

  return {
    year: m.year(),
    month: m.month() + 1,
  };
}

export function normalizeB2bInvoiceId(id) {
  if (id == null || id === "") return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export const PR_SOURCE_SYSTEM = "System";
export const PR_SOURCE_TALLY = "Tally";

export function getPrSourceBadge(prSource) {
  if (prSource === PR_SOURCE_TALLY) {
    return { label: PR_SOURCE_TALLY, colorScheme: "blue" };
  }
  if (prSource === PR_SOURCE_SYSTEM) {
    return { label: PR_SOURCE_SYSTEM, colorScheme: "purple" };
  }
  return null;
}

/** Stable merge / grid row key: source + id (ids may overlap across System vs Tally). */
export function purchaseRegisterMergeKey(prSource, purchaseId) {
  if (purchaseId == null || purchaseId === "") return null;
  return `${prSource}:${purchaseId}`;
}

export function getPurchaseRegisterRowKey(row) {
  if (!row) return "";
  const source =
    row.prSource ??
    (row.gst_tally_purchase_id != null ? PR_SOURCE_TALLY : PR_SOURCE_SYSTEM);
  const id =
    source === PR_SOURCE_TALLY
      ? row.gst_tally_purchase_id ?? row.purchase_id
      : row.purchase_id;
  return purchaseRegisterMergeKey(source, id) ?? "";
}

/**
 * Merge System purchases with Tally GST rows (union by prSource + id).
 */
export function mergePurchaseRegisterSources(purchase = [], purchaseGst = []) {
  const byKey = new Map();

  for (const p of purchase) {
    const key = purchaseRegisterMergeKey(PR_SOURCE_SYSTEM, p?.purchase_id);
    if (key) {
      byKey.set(key, { ...p, prSource: PR_SOURCE_SYSTEM });
    }
  }

  for (const g of purchaseGst) {
    const key = purchaseRegisterMergeKey(
      PR_SOURCE_TALLY,
      g?.gst_tally_purchase_id
    );
    if (!key || byKey.has(key)) continue;
    byKey.set(key, {
      ...g,
      purchase_id: g.gst_tally_purchase_id,
      prSource: PR_SOURCE_TALLY,
    });
  }

  return Array.from(byKey.values());
}

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
export function invoiceVendorKey(inv) {
  const c = (inv.ctin || "").trim();
  if (c) return c;
  const vid = inv.gst_vendor_id;
  return vid != null ? `__vid_${vid}` : "__unknown";
}

/** Per-supplier 2A document counts and how many have a purchase-gst match. */
export function buildVendorMatchStats(invoices, matches) {
  const matchByInvoice = buildMatchByB2bInvoiceId(matches);
  const stats = new Map();

  for (const inv of invoices || []) {
    const key = invoiceVendorKey(inv);
    if (!stats.has(key)) {
      stats.set(key, { total: 0, matched: 0 });
    }
    if (inv.gst_b2b_invoice_id == null) continue;

    const s = stats.get(key);
    s.total += 1;
    if (matchByInvoice.has(inv.gst_b2b_invoice_id)) {
      s.matched += 1;
    }
  }

  return stats;
}

export function enrichVendorRowsWithMatchPct(vendorRows, invoices, matches) {
  const stats = buildVendorMatchStats(invoices, matches);

  return (vendorRows || []).map((row) => {
    const s = stats.get(row._rowId) ?? stats.get(vendorRowPrKey(row));
    const total = s?.total ?? 0;
    const matched = s?.matched ?? 0;

    return {
      ...row,
      matchedCount: total > 0 ? matched : null,
      matchedTotal: total > 0 ? total : null,
      matchedPct: total > 0 ? Math.round((matched / total) * 100) : null,
    };
  });
}

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

export function stringsMatchInvoice(a, b) {
  const na = String(a ?? "")
    .trim()
    .toUpperCase();
  const nb = String(b ?? "")
    .trim()
    .toUpperCase();
  if (!na || !nb || na === "—" || nb === "—") return false;
  return na === nb;
}

export function parseDocDate(dateStr) {
  if (!dateStr || dateStr === "—") return null;
  const m = moment(
    dateStr,
    ["DD-MM-YYYY", "D-M-YYYY", "YYYY-MM-DD", moment.ISO_8601],
    true
  );
  return m.isValid() ? m : null;
}

export function amountsMatchRounded(a, b) {
  return Math.round(parseDecimal(a)) === Math.round(parseDecimal(b));
}

export function datesMatchPurchase(docDateStr, purchaseDate) {
  const docMoment = parseDocDate(docDateStr);
  const purchaseMoment = moment(purchaseDate);
  if (!docMoment || !purchaseMoment.isValid()) return false;
  return docMoment.isSame(purchaseMoment, "day");
}

export function isMatchablePurchase(item) {
  if (item?.gst_tally_purchase_id != null) return true;
  return Boolean(item?.tally_response?.voucher_no);
}

export function purchaseLockKey(purchase) {
  const ids = getPurchaseMatchIds(purchase);
  if (ids.gst_tally_purchase_id != null) {
    return `t:${ids.gst_tally_purchase_id}`;
  }
  if (ids.purchase_id != null) return `p:${ids.purchase_id}`;
  return null;
}

/**
 * Auto-match rules:
 * 1. Invoice no. match → confirm
 * 2. Else any 2 of: date, total tax (rounded), total value (rounded)
 */
export function evaluateAutoMatch(documentRow, purchase) {
  const invoiceMatch = stringsMatchInvoice(
    purchase.mmh_dist_bill_no,
    documentRow.docNo2A
  );
  const dateMatch = datesMatchPurchase(
    documentRow.docDate2A,
    purchase.mmh_dist_bill_dt
  );
  const taxMatch = amountsMatchRounded(
    getPurchaseTotalTax(purchase),
    documentRow.totalTax2A
  );
  const valueMatch = amountsMatchRounded(
    getPurchaseDisplayTotalAmount(purchase),
    documentRow.totalValue2A
  );

  if (invoiceMatch) {
    return { confirmed: true, invoiceMatch: true, secondaryCount: 3 };
  }

  const secondaryCount = [dateMatch, taxMatch, valueMatch].filter(Boolean).length;
  return {
    confirmed: secondaryCount >= 2,
    invoiceMatch: false,
    secondaryCount,
  };
}

function autoMatchDateDistanceDays(docDateStr, purchaseDate) {
  const docMoment = parseDocDate(docDateStr);
  const purchaseMoment = moment(purchaseDate);
  if (!docMoment || !purchaseMoment.isValid()) return Number.MAX_SAFE_INTEGER;
  return Math.abs(docMoment.diff(purchaseMoment, "days"));
}

export function findAutoMatchPurchase(
  documentRow,
  purchases,
  lockedSet,
  usedSet = new Set()
) {
  const gstin = normalizeGstin(documentRow.ctin);
  let best = null;
  let bestRank = -1;
  let bestDateDist = Number.MAX_SAFE_INTEGER;

  for (const p of purchases || []) {
    if (normalizeGstin(p.supplier_gstn) !== gstin) continue;
    if (!isMatchablePurchase(p)) continue;

    const lockKey = purchaseLockKey(p);
    if (lockKey && (lockedSet?.has(lockKey) || usedSet.has(lockKey))) continue;

    const result = evaluateAutoMatch(documentRow, p);
    if (!result.confirmed) continue;

    const rank = result.invoiceMatch
      ? 1000 + result.secondaryCount
      : result.secondaryCount;
    const dateDist = autoMatchDateDistanceDays(
      documentRow.docDate2A,
      p.mmh_dist_bill_dt
    );

    if (rank > bestRank || (rank === bestRank && dateDist < bestDateDist)) {
      best = p;
      bestRank = rank;
      bestDateDist = dateDist;
    }
  }

  return best;
}

export function getAutoMatchCompareFlags(documentRow, purchase) {
  const pr = purchaseToDocumentPrFields(purchase);
  return {
    invoice: stringsMatchInvoice(
      purchase.mmh_dist_bill_no,
      documentRow.docNo2A
    ),
    date: datesMatchPurchase(documentRow.docDate2A, purchase.mmh_dist_bill_dt),
    taxable: amountsMatchRounded(pr.taxablePr, documentRow.taxable2A),
    igst: amountsMatchRounded(pr.igstPr, documentRow.igst2A),
    cgst: amountsMatchRounded(pr.cgstPr, documentRow.cgst2A),
    sgst: amountsMatchRounded(pr.sgstPr, documentRow.sgst2A),
    totalTax: amountsMatchRounded(pr.totalTaxPr, documentRow.totalTax2A),
    totalValue: amountsMatchRounded(pr.totalValuePr, documentRow.totalValue2A),
  };
}

/**
 * Document view status badge (matched rows only).
 * Match = tax diff in [-1, 1]; Mismatch = otherwise.
 */
export function getDocumentMatchStatusBadge(row) {
  if (!row?.isMatched) return null;

  const taxDiff = computeTaxDiff(row.totalTax2A, row.totalTaxPr);
  const withinRange =
    taxDiff != null && Number.isFinite(taxDiff) && !isTaxDiffOutOfRange(taxDiff);

  if (withinRange) {
    return { label: "Match", colorScheme: "green" };
  }

  return { label: "Mismatch", colorScheme: "red" };
}

export function buildAutoMatchPreviewRows(pairs) {
  return (pairs || []).map(({ document, purchase }) => {
    const pr = purchaseToDocumentPrFields(purchase);
    return {
      _rowId: String(document.gst_b2b_invoice_id),
      gst_b2b_invoice_id: document.gst_b2b_invoice_id,
      supplierName: document.supplierName,
      ctin: document.ctin,
      docNo2A: document.docNo2A,
      docNoPr: pr.docNoPr,
      docDate2A: document.docDate2A,
      docDatePr: pr.docDatePr,
      taxable2A: document.taxable2A,
      taxablePr: pr.taxablePr,
      igst2A: document.igst2A,
      igstPr: pr.igstPr,
      cgst2A: document.cgst2A,
      cgstPr: pr.cgstPr,
      sgst2A: document.sgst2A,
      sgstPr: pr.sgstPr,
      totalTax2A: document.totalTax2A,
      totalTaxPr: pr.totalTaxPr,
      totalValue2A: document.totalValue2A,
      totalValuePr: pr.totalValuePr,
      prSource: purchase.prSource,
      _compareFlags: getAutoMatchCompareFlags(document, purchase),
      _document: document,
      _purchase: purchase,
    };
  });
}

/** Unmatched documents paired with purchases for auto-match save. */
export function buildAutoMatchPairs(documentRows, purchases, matches) {
  const pairs = [];
  const usedPurchases = new Set();

  for (const doc of documentRows || []) {
    if (doc.isMatched || doc.gst_b2b_invoice_id == null) continue;

    const lockedForDoc = buildPurchasesMatchedElsewhere(
      matches,
      doc.gst_b2b_invoice_id
    );
    const purchase = findAutoMatchPurchase(
      doc,
      purchases,
      lockedForDoc,
      usedPurchases
    );
    if (!purchase) continue;

    const key = purchaseLockKey(purchase);
    if (key) usedPurchases.add(key);
    pairs.push({ document: doc, purchase });
  }

  return pairs;
}

export function getPurchaseDisplayTotalAmount(item) {
  if (isZeroTotalAmount(item)) return getPurchaseTotalTax(item);
  return parseDecimal(item?.total_amount);
}

function lineTaxSumFromB2bItem(it) {
  return (
    parseDecimal(it?.iamt) +
    parseDecimal(it?.camt) +
    parseDecimal(it?.samt) +
    parseDecimal(it?.csamt) +
    parseDecimal(it?.cesamt)
  );
}

/** Period totals from stored GSTR-2A B2B invoices. */
export function aggregateGstr2aPeriodSummary(invoices) {
  let docCount = 0;
  let taxable = 0;
  let tax = 0;
  let total = 0;

  for (const inv of invoices || []) {
    docCount += 1;
    const items = Array.isArray(inv.items) ? inv.items : [];
    let taxableInv = 0;
    let taxInv = 0;
    for (const it of items) {
      taxableInv += parseDecimal(it.txval);
      taxInv += lineTaxSumFromB2bItem(it);
    }
    const declaredVal = parseDecimal(inv.val);
    taxable += taxableInv;
    tax += taxInv;
    total += declaredVal > 0 ? declaredVal : taxableInv + taxInv;
  }

  return { docCount, taxable, tax, total };
}

/** Period totals from merged purchase register rows. */
export function aggregatePurchasePeriodSummary(purchases) {
  let docCount = 0;
  let taxable = 0;
  let tax = 0;
  let total = 0;

  for (const p of purchases || []) {
    docCount += 1;
    taxable += getPurchaseTaxable(p);
    tax += getPurchaseTotalTax(p);
    total += getPurchaseDisplayTotalAmount(p);
  }

  return { docCount, taxable, tax, total };
}

/** POST body FKs for the selected purchase row (System vs Tally). */
export function getPurchaseMatchIds(purchase) {
  if (!purchase) {
    return { purchase_id: null, gst_tally_purchase_id: null };
  }
  if (purchase.prSource === PR_SOURCE_TALLY || purchase.gst_tally_purchase_id != null) {
    return {
      purchase_id: null,
      gst_tally_purchase_id: purchase.gst_tally_purchase_id ?? null,
    };
  }
  return {
    purchase_id: purchase.purchase_id ?? null,
    gst_tally_purchase_id: null,
  };
}

/** Purchase / tally ids already matched to a different B2B invoice. */
export function buildPurchasesMatchedElsewhere(matches, currentB2bInvoiceId) {
  const locked = new Set();
  for (const m of matches || []) {
    if (m.gst_b2b_invoice_id == null) continue;
    if (
      currentB2bInvoiceId != null &&
      normalizeB2bInvoiceId(m.gst_b2b_invoice_id) ===
        normalizeB2bInvoiceId(currentB2bInvoiceId)
    ) {
      continue;
    }
    if (m.purchase_id != null) locked.add(`p:${m.purchase_id}`);
    if (m.gst_tally_purchase_id != null) {
      locked.add(`t:${m.gst_tally_purchase_id}`);
    }
  }
  return locked;
}

export function isPurchaseLockedByOtherMatch(purchase, lockedSet) {
  if (!purchase || !lockedSet?.size) return false;
  if (purchase.prSource === PR_SOURCE_SYSTEM && purchase.purchase_id != null) {
    return lockedSet.has(`p:${purchase.purchase_id}`);
  }
  if (purchase.gst_tally_purchase_id != null) {
    return lockedSet.has(`t:${purchase.gst_tally_purchase_id}`);
  }
  return false;
}

export function buildMatchByB2bInvoiceId(matches) {
  const byInvoiceId = new Map();
  for (const m of matches || []) {
    const id = normalizeB2bInvoiceId(m.gst_b2b_invoice_id);
    if (id != null) {
      byInvoiceId.set(id, m);
    }
  }
  return byInvoiceId;
}

export function findPurchaseByMatch(match, purchases) {
  if (!match) return null;

  if (match.purchase_id != null) {
    const purchaseId = Number(match.purchase_id);
    const byPurchase = (purchases || []).find((p) => {
      if (p.prSource === PR_SOURCE_TALLY) return false;
      return Number(p.purchase_id) === purchaseId;
    });
    if (byPurchase) return byPurchase;
  }

  if (match.gst_tally_purchase_id != null) {
    const tallyId = Number(match.gst_tally_purchase_id);
    const byTally = (purchases || []).find(
      (p) => Number(p.gst_tally_purchase_id) === tallyId
    );
    if (byTally) return byTally;
  }

  return null;
}

export function findMatchForDocument(documentRow, purchases, matches) {
  const invoiceId = normalizeB2bInvoiceId(documentRow?.gst_b2b_invoice_id);
  if (invoiceId == null) return null;

  const match = (matches || []).find(
    (m) => normalizeB2bInvoiceId(m.gst_b2b_invoice_id) === invoiceId
  );
  if (!match) return null;

  const purchase = findPurchaseByMatch(match, purchases);
  return { match, purchase };
}

export function purchaseToDocumentPrFields(purchase) {
  if (!purchase) {
    return {
      docNoPr: null,
      docDatePr: null,
      taxablePr: null,
      igstPr: null,
      cgstPr: null,
      sgstPr: null,
      totalTaxPr: null,
      totalValuePr: null,
    };
  }

  const taxablePr = getPurchaseTaxable(purchase);
  const totalTaxPr = getPurchaseTotalTax(purchase);
  const billDt = purchase.mmh_dist_bill_dt;
  const docDatePr = billDt
    ? moment(billDt).format("DD-MM-YYYY")
    : null;

  let igstPr = null;
  let cgstPr = null;
  let sgstPr = null;
  if (shouldShowIGST(purchase)) {
    igstPr = parseDecimal(purchase.tot_igst_amt);
  } else {
    cgstPr = parseDecimal(purchase.tot_cgst_amt);
    sgstPr = parseDecimal(purchase.tot_sgst_amt);
  }

  return {
    docNoPr: purchase.mmh_dist_bill_no || null,
    docDatePr,
    taxablePr,
    igstPr,
    cgstPr,
    sgstPr,
    totalTaxPr,
    totalValuePr: getPurchaseDisplayTotalAmount(purchase),
  };
}

export function enrichDocumentRowsWithMatches(documentRows, purchases, matches) {
  const matchByInvoiceId = buildMatchByB2bInvoiceId(matches);
  const emptyPr = purchaseToDocumentPrFields(null);

  return (documentRows || []).map((row) => {
    const invoiceId = row.gst_b2b_invoice_id;
    if (invoiceId == null) {
      return { ...row, ...emptyPr, isMatched: false, gst_purchase_match_id: null };
    }

    const match = matchByInvoiceId.get(normalizeB2bInvoiceId(invoiceId));
    if (!match) {
      return { ...row, ...emptyPr, isMatched: false, gst_purchase_match_id: null };
    }

    const purchase = findPurchaseByMatch(match, purchases);
    return {
      ...row,
      ...(purchase ? purchaseToDocumentPrFields(purchase) : emptyPr),
      gst_purchase_match_id: match.gst_purchase_match_id,
      isMatched: true,
    };
  });
}
