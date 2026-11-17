/**
 * Warehouse Flow on the Business Dashboard - what is in each step, for the
 * chosen store, from `GET /warehouse-flow/flow`.
 *
 *   1. Gate pass -> 2. Inspection -> 3. GRN -> 4. Allocation -> 5. Ready to dispatch
 *
 * Every row says when it entered its step (`since`); its age is worked out
 * here against now, so a list read a minute ago still ages.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

/** Hours since an ISO time, to one decimal; null when there is no time. */
function hoursSince(isoTime, nowMs = Date.now()) {
  const t = Date.parse(isoTime);
  return Number.isFinite(t) ? Math.round((Math.max(0, nowMs - t) / 3600000) * 10) / 10 : null;
}

/** A step's (or a list's) rows for the chosen store, longest waiting first, each with `hours`. */
function stepRows(section, store = "", nowMs = Date.now()) {
  return ((section && section.rows) || [])
    .filter((r) => !store || r.store === store)
    .map((r) => ({ ...r, hours: hoursSince(r.since, nowMs) }))
    .sort((a, b) => (b.hours || 0) - (a.hours || 0));
}

/**
 * A tile's numbers: how many, the longest wait, how many over a day, GRNs
 * started, and the invoices on them (all, and on the GRN-started ones).
 */
function stepSummary(rows) {
  const list = rows || [];
  return {
    count: list.length,
    oldest_hours: list.length ? Math.max(...list.map((r) => r.hours || 0)) : null,
    over_day: list.filter((r) => (r.hours || 0) >= 24).length,
    grn_started: list.filter((r) => r.grn_started).length,
    // Distinct gate passes: a GRN row is an invoice, and several share a pass.
    gate_passes: new Set(list.map((r) => r.gate_pass || `${r.kind}:${r.ref}`)).size,
    invoices: list.reduce((t, r) => t + (r.invoices || 0), 0),
    invoices_started: list.reduce((t, r) => t + (r.invoices_grn_started || 0), 0),
  };
}

/**
 * The GRN step, by invoice: a gate pass is under "not started" while any of
 * its invoices has no GRN started, and under "started" once any has - so a
 * pass part way through is in both.
 */
const hasInvoiceNotStarted = (r) => (r.invoices ? (r.invoices || 0) - (r.invoices_grn_started || 0) > 0 : !r.grn_started);
const hasInvoiceStarted = (r) => (r.invoices ? (r.invoices_grn_started || 0) > 0 : Boolean(r.grn_started));

/** What a row's status reads as, in the step it is in. */
function rowStatus(stepKey, row) {
  if (stepKey === "gate_pass") return "No inspection yet";
  if (stepKey === "grn") {
    const n = row.invoices || 0;
    const started = row.invoices_grn_started || 0;
    if (n > 1 && started > 0 && started < n) return `GRN started ${started}/${n}`;
    return row.grn_started ? "GRN started" : "GRN not started";
  }
  if (stepKey === "allocation") return row.allocated ? "Allocated" : "Not allocated";
  if (stepKey === "written_off") return "Written off";
  if (stepKey === "no_invoice") return "Invoice not uploaded";
  return stateText(row.state);
}

/** "3 invoices · ₹1.24L"; null when the consignment has no invoice yet. */
function invoiceLine(row, compactINR) {
  const n = row && row.invoices;
  if (!n) return null;
  const amount = row.invoice_amount !== null && row.invoice_amount !== undefined && compactINR ? ` · ${compactINR(row.invoice_amount)}` : "";
  return `${n} invoice${n === 1 ? "" : "s"}${amount}`;
}

// RetailPilot's invoice document states, as its own invoice screen names them.
const DOC_STATE_TEXT = {
  no_template: "Yet to start",
  header_captured: "Header captured",
  inspection_link_pending: "Inspection link pending",
  manual_entry_started: "Manual entry started",
  pricing_review_pending: "Pricing review pending",
  cost_qc_failed: "Cost variance detected",
  digitized: "GRN done",
  cancelled: "Cancelled",
  duplicate_invoice: "Duplicate",
};

/** An invoice document's state, readable: "cost_qc_failed" -> "Cost variance detected". */
function docStateText(state) {
  const s = String(state || "").toLowerCase();
  return DOC_STATE_TEXT[s] || stateText(s);
}

/** "45m", "5h 20m", "2d 3h". */
function ageText(hours) {
  if (hours === null || hours === undefined) return "—";
  const mins = Math.round(hours * 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** "IN_PROGRESS" -> "In progress". */
function stateText(state) {
  const s = String(state || "").replace(/_/g, " ").trim().toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "Started";
}

module.exports = {
  hoursSince,
  stepRows,
  stepSummary,
  rowStatus,
  invoiceLine,
  hasInvoiceNotStarted,
  hasInvoiceStarted,
  docStateText,
  ageText,
  stateText,
};
